# Importation des modules nécessaires pour définir les routes, gérer les dépendances et interagir avec la base de données
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import base64

# Importation des modèles et schémas utilisés dans les routes
from app.models import User, Conversation, Participant
from app.schemas import (
    ConversationCreateRequest,
    ConversationResponse,
    KeyRotationPayload,
    NewKeyPayload,
    MessageResponse,
    ParticipantAddRequest,
    ParticipantPayload,
    ParticipantAddedPayload,
    RemoveFromConversationPayload,
    SessionKeyUpdateRequest
)
from app.database import get_db
from app.security import get_current_user
from app.api.websocket import manager

from typing import List, Optional

from app.models import Message

# Création d'un routeur FastAPI pour regrouper les routes liées aux conversations
router = APIRouter()


# Route pour créer une nouvelle conversation
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ConversationResponse:
    # Vérifier que l'utilisateur courant est inclus dans les participants
    if current_user.username not in conversation_data.participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être inclus dans la conversation"
        )

    # Récupérer tous les utilisateurs participants à partir de leurs noms d'utilisateur
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

    # Créer une nouvelle instance de conversation
    new_conversation = Conversation()
    db.add(new_conversation)  # Ajouter la conversation à la session de base de données
    await db.flush()  # Flusher pour obtenir l'ID généré automatiquement

    # Ajouter les participants à la conversation avec leurs clés chiffrées
    for user in participants:
        encrypted_key = base64.b64decode(conversation_data.encryptedKeys[user.username])  # Décoder la clé chiffrée
        participant = Participant(
            conversation_id=new_conversation.id,  # Associer l'ID de la conversation
            user_id=user.id,  # Associer l'ID de l'utilisateur
            encrypted_session_key=encrypted_key  # Stocker la clé de session chiffrée
        )
        db.add(participant)  # Ajouter le participant à la session de base de données

    # Sauvegarder les modifications dans la base de données
    await db.commit()
    await db.refresh(new_conversation)  # Rafraîchir l'objet conversation pour inclure les données mises à jour

    # Retourner les détails de la conversation créée
    return ConversationResponse(
        conversationId=new_conversation.id,  # ID de la conversation
        participants=conversation_data.participants,  # Liste des participants
        createdAt=datetime.now()  # Date et heure de création
    )


# Route pour lister les conversations auxquelles l'utilisateur courant participe
@router.get("/")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> list[ConversationResponse]:
    # Récupérer les conversations auxquelles l'utilisateur courant participe
    result = await db.execute(
        select(Conversation)
        .join(Participant)
        .join(User)
        .where(User.username == current_user.username)
    )
    conversations = result.scalars().all()  # Obtenir toutes les conversations correspondantes

    # Formater les conversations pour inclure les participants
    conversation_list = []
    for conv in conversations:
        # Récupérer les noms d'utilisateur des participants
        participants_result = await db.execute(
            select(User.username)
            .join(Participant)
            .where(Participant.conversation_id == conv.id)
        )
        participants = [p[0] for p in participants_result.all()]  # Extraire les noms d'utilisateur

        # Ajouter la conversation formatée à la liste
        conversation_list.append(ConversationResponse(
            conversationId=conv.id,  # ID de la conversation
            participants=participants,  # Liste des participants
            createdAt=datetime.now()  # Date et heure de création
        ))

    return conversation_list  # Retourner la liste des conversations


# Route pour récupérer les messages d'une conversation spécifique
@router.get("/{conv_id}/messages")
async def get_conversation_messages(
    conv_id: int,
    limit: int = 50,  # Limite du nombre de messages à récupérer
    before: Optional[int] = None,  # ID du message avant lequel récupérer les messages
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[MessageResponse]:
    # Vérifier que l'utilisateur courant est un participant de la conversation
    participant_stmt = select(Participant).where(
        Participant.conversation_id == conv_id,
        Participant.user_id == current_user.id
    )
    participant_result = await db.execute(participant_stmt)
    participant = participant_result.scalar_one_or_none()
    if participant is None:
        raise HTTPException(status_code=403, detail="Accès interdit")

    # Construire la requête pour récupérer les messages de la conversation
    msg_stmt = select(Message).where(Message.conversation_id == conv_id)
    if before is not None:
        msg_stmt = msg_stmt.where(Message.id < before)  # Filtrer les messages avant un certain ID
    msg_stmt = msg_stmt.order_by(Message.timestamp.desc()).limit(limit)  # Trier par date décroissante et limiter

    result = await db.execute(msg_stmt)
    messages = result.scalars().all()  # Obtenir tous les messages correspondants

    # Formater les messages pour inclure les données nécessaires
    messages_list = []
    for msg in messages:
        messages_list.append(
            MessageResponse(
                conversationId=msg.conversation_id,  # ID de la conversation
                messageId=msg.id,  # ID du message
                senderId=msg.sender.username,  # Nom d'utilisateur de l'expéditeur
                timestamp=msg.timestamp,  # Horodatage du message
                nonce=base64.b64encode(msg.nonce).decode(),  # Nonce encodé en base64
                ciphertext=base64.b64encode(msg.ciphertext).decode(),  # Texte chiffré encodé en base64
                associatedData=msg.associated_data  # Données associées
            )
        )
    return messages_list  # Retourner la liste des messages


# Route pour ajouter un participant à une conversation
@router.post("/{conv_id}/participants")
async def add_participant(
    conv_id: int,
    participant_data: ParticipantAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    # Vérifier que l'utilisateur courant est un participant de la conversation
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

    # Vérifier que l'utilisateur n'est pas déjà participant
    check_stmt = select(Participant).where(
        Participant.conversation_id == conv_id,
        Participant.user_id == participant_data.userId
    )
    result = await db.execute(check_stmt)
    already_participant = result.scalar_one_or_none()
    if already_participant:
        raise HTTPException(status_code=409, detail="Cet utilisateur est déjà participant.")

    # Ajouter le nouvel utilisateur comme participant
    encrypted_key_bytes = base64.b64decode(participant_data.encryptedSessionKey)
    new_participant = Participant(
        conversation_id=conv_id,
        user_id=participant_data.userId,
        encrypted_session_key=encrypted_key_bytes
    )
    db.add(new_participant)
    await db.commit()
    await db.refresh(new_participant)

    # Récupérer les noms d'utilisateur de tous les participants
    stmt = select(User.username).join(Participant).where(Participant.conversation_id == conv_id)
    result = await db.execute(stmt)
    participant_usernames = [row[0] for row in result.all()]

    # Encoder la clé publique du nouvel utilisateur
    encoded_pk = base64.b64encode(user_to_add.public_key).decode("utf-8")

    # Construire le payload pour la notification WebSocket
    payload = ParticipantAddedPayload(
        type="participantAdded",
        data=ParticipantPayload(
            conversationId=conv_id,
            username=user_to_add.username,
            addedBy=current_user.username,
            publicKey=encoded_pk
        )
    )

    # Envoyer la notification via WebSocket
    await manager.send_to_participants(payload, participant_usernames)


# Route pour mettre à jour la clé de session d'une conversation
@router.put("/{conv_id}/session_key")
async def update_session_key(
    conv_id: int,
    request: SessionKeyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Vérifier que l'utilisateur courant est autorisé à mettre à jour la clé de session
    current_username = current_user.username
    if current_username not in request.participants:
        raise HTTPException(status_code=403, detail="Not authorized to update session key")

    # Récupérer la conversation
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conv_id)
    )
    conversation = conv_result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Récupérer les participants actuels de la conversation
    part_result = await db.execute(
        select(Participant).where(Participant.conversation_id == conv_id)
    )
    participants_in_db = part_result.scalars().all()

    # Identifier les participants à supprimer et ceux à mettre à jour
    to_remove = [p for p in participants_in_db if p.user.username not in request.participants]
    removed_ids = [p.user.id for p in to_remove]
    removed_usernames = [p.user.username for p in to_remove]

    to_update = [p for p in participants_in_db if p.user.username in request.participants]

    # Mettre à jour les clés de session des participants restants
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

    # Supprimer les participants qui ne sont plus dans la liste
    for participant in to_remove:
        conversation.participants.remove(participant)

    await db.commit()

    # Récupérer les noms d'utilisateur des participants restants
    remaining_usernames = [p.user.username for p in to_update]

    # Envoyer des notifications aux participants restants
    for participant in to_update:
        username = participant.user.username
        encoded_key = base64.b64encode(participant.encrypted_session_key).decode("utf-8")
        payload = KeyRotationPayload(
            type="keyRotation",
            data=NewKeyPayload(
                conversationId=conv_id,
                removedUserIds=removed_ids,
                remainingParticipants=remaining_usernames,
                newEncryptedSessionKey=encoded_key
            )
        )

        await manager.send_personal_message(payload, username)

    # Informer les utilisateurs supprimés qu'ils ont été retirés de la conversation
    for removed_username in removed_usernames:
        payload = RemoveFromConversationPayload(
            type="removedFromConversation",
            data={
                "conversationId": conv_id
            }
        )
        await manager.send_personal_message(payload, removed_username)

    return {"message": "Session key updated and participants managed"}