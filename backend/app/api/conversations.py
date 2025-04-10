from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import base64

from app.models import User, Conversation, Participant
from app.schemas import (
    ConversationCreateRequest,
    ConversationResponse,
    ConversationListResponse,
    ConversationListInfo,
    MessageResponse,
    ParticipantAddRequest,
    SessionKeyUpdateRequest
)
from app.database import get_db
from app.security import get_current_user
from app.api.websocket import manager
import json

from typing import List, Optional

from app.models import Message

router = APIRouter()

@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Vérifier que l'utilisateur courant est inclus dans les participants
    if current_user.username not in conversation_data.participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être inclus dans la conversation"
        )

    # Récupérer tous les utilisateurs participants
    participants = []
    for username in conversation_data.participants:
        result = await db.execute(
            select(User).where(User.username == username)
        )
        user = result.scalars().first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Utilisateur {username} non trouvé"
            )
        participants.append(user)

    # Créer la conversation
    new_conversation = Conversation()
    db.add(new_conversation)
    await db.flush()

    # Ajouter les participants
    for user in participants:
        encrypted_key = base64.b64decode(conversation_data.encryptedKeys[user.username])
        participant = Participant(
            conversation_id=new_conversation.id,
            user_id=user.id,
            encrypted_session_key=encrypted_key
        )
        db.add(participant)

    await db.commit()
    await db.refresh(new_conversation)

    # Formater la réponse
    return {
        "conversationId": new_conversation.id,
        "participants": conversation_data.participants,
        "createdAt": datetime.now()
    }

@router.get("/", response_model=ConversationListResponse)
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Récupérer les conversations de l'utilisateur
    result = await db.execute(
        select(Conversation)
        .join(Participant)
        .join(User)
        .where(User.username == current_user.username)
    )
    conversations = result.scalars().all()

    # Formater la réponse
    conversation_infos = []
    for conv in conversations:
        # Récupérer les participants
        participants_result = await db.execute(
            select(User.username)
            .join(Participant)
            .where(Participant.conversation_id == conv.id)
        )
        participants = [p[0] for p in participants_result.all()]

        conversation_infos.append(ConversationListInfo(
            conversationId=conv.id,
            participants=participants,
            lastMessageTimestamp=None  # À implémenter plus tard
        ))

@router.get("/{conv_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conv_id: int,
    limit: int = 50,
    before: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Vérifier que l'utilisateur est participant
    participant_stmt = select(Participant).where(
        Participant.conversation_id == conv_id,
        Participant.user_id == current_user.id
    )
    participant_result = await db.execute(participant_stmt)
    participant = participant_result.scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="Accès interdit")

    # Construire la requête des messages
    msg_stmt = select(Message).where(Message.conversation_id == conv_id)
    if before is not None:
        msg_stmt = msg_stmt.where(Message.id < before)
    msg_stmt = msg_stmt.order_by(Message.timestamp.desc()).limit(limit)

    result = await db.execute(msg_stmt)
    messages = result.scalars().all()

    response = []
    for msg in messages:
        response.append(
            MessageResponse(
                messageId=msg.id,
                senderId=msg.sender.username if msg.sender else "",
                timestamp=msg.timestamp,
                nonce=msg.nonce if isinstance(msg.nonce, str) else base64.b64encode(msg.nonce).decode(),
                ciphertext=msg.ciphertext if isinstance(msg.ciphertext, str) else base64.b64encode(msg.ciphertext).decode(),
                authTag=msg.auth_tag if isinstance(msg.auth_tag, str) else base64.b64encode(msg.auth_tag).decode(),
                associatedData=msg.associated_data
            )
        )
@router.post("/{conv_id}/participants")
async def add_participant(
    conv_id: int,
    participant_data: ParticipantAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier que l'utilisateur courant est participant
    participant_stmt = select(Participant).where(
        Participant.conversation_id == conv_id,
        Participant.user_id == current_user.id
    )
    result = await db.execute(participant_stmt)
    existing_participant = result.scalar_one_or_none()
    if not existing_participant:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de cette conversation.")

    # Récupérer l'utilisateur à ajouter
    user_stmt = select(User).where(User.id == participant_data.userId)
    result = await db.execute(user_stmt)
    user_to_add = result.scalar_one_or_none()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="Utilisateur à ajouter non trouvé.")

    # Vérifier qu'il n'est pas déjà participant
    check_stmt = select(Participant).where(
        Participant.conversation_id == conv_id,
        Participant.user_id == participant_data.userId
    )
    result = await db.execute(check_stmt)
    already_participant = result.scalar_one_or_none()
    if already_participant:
        raise HTTPException(status_code=409, detail="Cet utilisateur est déjà participant.")

    # Créer le participant
    encrypted_key_bytes = base64.b64decode(participant_data.encryptedSessionKey)
    new_participant = Participant(
        conversation_id=conv_id,
        user_id=participant_data.userId,
        encrypted_session_key=encrypted_key_bytes
    )
    db.add(new_participant)
    await db.commit()
    await db.refresh(new_participant)

    # Récupérer tous les usernames participants (incluant le nouveau)
    stmt = select(User.username).join(Participant).where(Participant.conversation_id == conv_id)
    result = await db.execute(stmt)
    participant_usernames = [row[0] for row in result.all()]

    # Encoder la clé publique du nouvel utilisateur
    encoded_pk = base64.b64encode(user_to_add.public_key).decode("utf-8")

    # Notification WebSocket
    payload = {
        "type": "participantAdded",
        "data": {
            "conversationId": conv_id,
            "userId": user_to_add.username,
            "addedBy": current_user.username,
            "publicKey": encoded_pk
        }
    }
    await manager.send_to_participants(payload, participant_usernames)

@router.put("/{conv_id}/session_key")
async def update_session_key(
    conv_id: int,
    request: SessionKeyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_username = current_user.username
    if current_username not in request.participants:
        raise HTTPException(status_code=403, detail="Not authorized to update session key")

    conv_stmt = select(Conversation).where(Conversation.id == conv_id)
    conv_result = await db.execute(conv_stmt)
    conversation = conv_result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    part_stmt = select(Participant).where(Participant.conversation_id == conv_id)
    part_result = await db.execute(part_stmt)
    participants_in_db = part_result.scalars().all()

    to_remove = [p for p in participants_in_db if p.user.username not in request.participants]
    removed_usernames = [p.user.username for p in to_remove]

    to_update = [p for p in participants_in_db if p.user.username in request.participants]

    for participant in to_update:
        username = participant.user.username
        new_key_b64 = request.newEncryptedKeys.get(username)
        if not new_key_b64:
            continue
        try:
            new_key_bytes = base64.b64decode(new_key_b64)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid base64 for user {username}")
        participant.encrypted_session_key = new_key_bytes

    for participant in to_remove:
        await db.delete(participant)

    await db.commit()

    remaining_usernames = [p.user.username for p in to_update]

    for participant in to_update:
        username = participant.user.username
        encoded_key = base64.b64encode(participant.encrypted_session_key).decode("utf-8")
        payload = {
            "type": "keyRotation",
            "data": {
                "conversationId": conv_id,
                "removedUserId": removed_usernames[0] if removed_usernames else None,
                "remainingParticipants": remaining_usernames,
                "newEncryptedSessionKey": encoded_key
            }
        }
        await manager.send_personal_message(json.dumps(payload), username)

    for removed_username in removed_usernames:
        payload = {
            "type": "removedFromConversation",
            "data": {
                "conversationId": conv_id
            }
        }
        await manager.send_personal_message(json.dumps(payload), removed_username)

    return {"message": "Session key updated and participants managed"}
    return {"message": "Participant added"}