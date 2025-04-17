from fastapi import APIRouter, Depends, HTTPException, status # Ajouter status ici
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import base64 # Ajouter l'import
import binascii # Ajouter l'import
from app.database import get_session
from app.security import get_current_user
from app.models import User, Participant, Message
from app.schemas import MessageCreate, MessageCreateResponse, NewMessagePayload
from sqlalchemy.orm import selectinload
from app.api.websocket import manager

router = APIRouter()


@router.post("", status_code=201)
async def create_message(
    message_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
) -> MessageCreateResponse:
    # Récupérer l'utilisateur courant
    result = await db.execute(select(User).where(User.username == current_user.username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")

    # Vérifier que l'utilisateur est participant à la conversation
    participant_result = await db.execute(
        select(Participant).where(
            Participant.conversation_id == message_in.conversationId,
            Participant.user_id == user.id
        )
    )
    participant = participant_result.scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas participant à cette conversation")

    # Décoder nonce et ciphertext depuis Base64 avant de stocker
    try:
        nonce_bytes = base64.b64decode(message_in.nonce)
        ciphertext_bytes = base64.b64decode(message_in.ciphertext)
    except (TypeError, binascii.Error) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Base64 data for nonce/ciphertext: {e}") # Ajouter status.

    new_message = Message(
        conversation_id=message_in.conversationId,
        sender_id=user.id,
        nonce=nonce_bytes, # Stocker les bytes
        ciphertext=ciphertext_bytes, # Stocker les bytes
        associated_data=message_in.associatedData
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    # Récupérer les usernames des participants
    result = await db.execute(
        select(Participant).where(Participant.conversation_id == message_in.conversationId).options(selectinload(Participant.user))
    )
    participants = result.scalars().all()
    participant_usernames = [p.user.username for p in participants]

    # Construire le payload WebSocket en encodant les bytes en Base64
    payload = NewMessagePayload(
        type="newMessage", # Ajouter le type pour le frontend
        conversationId=new_message.conversation_id,
        messageId=new_message.id,
        senderId=current_user.username,
        timestamp=new_message.timestamp,
        nonce=base64.b64encode(new_message.nonce).decode('utf-8'), # Encoder en Base64
        ciphertext=base64.b64encode(new_message.ciphertext).decode('utf-8'), # Encoder en Base64
        associatedData=new_message.associated_data
    )

    # Diffuser via WebSocket
    await manager.send_to_participants(payload, participant_usernames)

    return MessageCreateResponse(
        messageId=new_message.id,
        timestamp=new_message.timestamp
    )
