from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.security import get_current_user
from app.models import User, Participant, Message
from app.schemas import MessageCreate
import base64
from sqlalchemy.orm import selectinload
from backend.app.api.websocket import manager

router = APIRouter()

@router.post("/", status_code=201)
async def create_message(
    message_in: MessageCreate,
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Récupérer l'utilisateur courant
    result = await db.execute(select(User).where(User.username == current_username))
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

    # Créer le message
    try:
        nonce_bytes = base64.b64decode(message_in.nonce)
        ciphertext_bytes = base64.b64decode(message_in.ciphertext)
        auth_tag_bytes = base64.b64decode(message_in.authTag)
    except Exception:
        raise HTTPException(status_code=400, detail="Erreur de décodage base64")

    new_message = Message(
        conversation_id=message_in.conversationId,
        sender_id=user.id,
        nonce=nonce_bytes,
        ciphertext=ciphertext_bytes,
        auth_tag=auth_tag_bytes,
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

    # Construire le payload
    payload = {
        "type": "newMessage",
        "messageId": new_message.id,
        "conversationId": new_message.conversation_id,
        "senderId": new_message.sender_id,
        "timestamp": new_message.timestamp.isoformat(),
        "nonce": base64.b64encode(new_message.nonce).decode(),
        "ciphertext": base64.b64encode(new_message.ciphertext).decode(),
        "authTag": base64.b64encode(new_message.auth_tag).decode(),
        "associatedData": new_message.associated_data,
    }

    # Diffuser via WebSocket
    await manager.send_to_participants(payload, participant_usernames)

    # Préparer la diffusion WebSocket (appel effectif dans une tâche ultérieure)
    # Exemple :
    # await websocket_manager.send_to_participants(payload, participant_usernames)

    return {
        "messageId": new_message.id,
        "timestamp": new_message.timestamp.isoformat()
    }