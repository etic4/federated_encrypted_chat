import re
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
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


class MessageBase(BaseWithConfig):
    nonce: str  # Base64
    ciphertext: str  # Base64
    authTag: str  # Base64
    associatedData: Optional[Dict] = None


class MessageCreate(MessageBase):
    conversationId: int


class MessageCreateResponse(BaseWithConfig):
    messageId: int
    timestamp: datetime


class MessageResponse(MessageBase):
    messageId: int
    senderId: str  # Username
    timestamp: datetime


class ConversationCreateRequest(BaseWithConfig):
    participants: List[str]  # Usernames
    encryptedKeys: Dict[str, str]  # username: encryptedKey (Base64)


class ConversationResponse(BaseWithConfig):
    conversationId: int
    participants: List[str]
    createdAt: datetime


class ConversationListResponse(BaseWithConfig):
    conversations: List[ConversationResponse]


class ParticipantAddRequest(BaseWithConfig):
    userId: int  # ID utilisateur
    encryptedSessionKey: str  # Base64 (clé chiffrée)


class SessionKeyUpdateRequest(BaseModel):
    participants: List[str]  # Usernames restants
    newEncryptedKeys: Dict[str, str]  # username: newEncryptedKey
