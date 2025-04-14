import re
from pydantic import BaseModel, Field
from datetime import datetime


def to_camel(string: str) -> str:
    return re.sub(r'_([a-z])', lambda m: m.group(1).upper(), string)


class BaseWithConfig(BaseModel):
    model_config = {
        "from_attributes": True,
        "alias_generator": to_camel,
        "populate_by_name": True,
    }


class KdfParams(BaseWithConfig):
    algorithm: str
    iterations: int
    memory: int
    parallelism: int


class UserCreate(BaseWithConfig):
    username: str = Field(..., min_length=3, max_length=50)
    publicKey: str  # Base64
    encryptedPrivateKey: str  # Base64
    kdfSalt: str  # Base64
    kdfParams: KdfParams


class Token(BaseWithConfig):
    accessToken: str
    tokenType: str


class ChallengeRequest(BaseWithConfig):
    username: str


class ChallengeResponse(BaseWithConfig):
    challenge: str  # Base64
    publicKey: str
    encryptedPrivateKey: str
    kdfSalt: str
    kdfParams: KdfParams


class VerifyRequest(BaseWithConfig):
    username: str
    challenge: str  # Base64
    signature: str  # Base64


class ChangePasswordRequest(BaseWithConfig):
    newEncryptedPrivateKey: str  # Base64


class UserPublicKeyResponse(BaseWithConfig):
    username: str
    publicKey: str  # Base64


class MessageCreate(BaseWithConfig):
    conversationId: int
    nonce: str  # Base64
    ciphertext: str  # Base64
    associatedData: dict | None = None


class MessageCreateResponse(BaseWithConfig):
    messageId: int
    timestamp: datetime


class MessageResponse(BaseWithConfig):
    conversationId: int
    messageId: int
    senderId: str  # Username
    timestamp: datetime
    nonce: str  # Base64
    ciphertext: str  # Base64
    associatedData: dict | None = None


# websocket message
class NewMessagePayload(MessageResponse):
    type: str = "newMessage"


class ConversationCreateRequest(BaseWithConfig):
    participants: list[str]  # Usernames
    encryptedKeys: dict[str, str]  # username: encryptedKey (Base64)


class ConversationResponse(BaseWithConfig):
    conversationId: int
    participants: list[str]
    createdAt: datetime


class ParticipantAddRequest(BaseWithConfig):
    userId: int  # ID utilisateur
    encryptedSessionKey: str  # Base64 (clé chiffrée)


class SessionKeyUpdateRequest(BaseWithConfig):
    participants: list[str]  # Usernames restants
    newEncryptedKeys: dict[str, str]  # username: newEncryptedKey


class ParticipantPayload(BaseWithConfig):
    conversationId: int
    username: str
    addedBy: str  # Username
    publicKey: str  # Base64


class ParticipantAddedPayload(BaseWithConfig):
    type: str = "participantAdded"
    data: ParticipantPayload


class NewKeyPayload(BaseWithConfig):
    conversationId: int
    removedUserIds: list[int]  # ID utilisateur
    remainingParticipants: list[str]  # Usernames restants
    newEncryptedSessionKey: str  # Base64 (clé chiffrée)


class KeyRotationPayload(BaseWithConfig):
    type: str = "keyRotation"
    data: NewKeyPayload


class RemoveFromConversationPayload(BaseWithConfig):
    type: str = "removeFromConversation"
    data: dict[str, int]
