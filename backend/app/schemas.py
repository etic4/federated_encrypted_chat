from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    publicKey: str  # Base64/Hex encoded
    encryptedPrivateKey: str  # Base64/Hex encoded
    kdfSalt: str  # Base64/Hex encoded
    kdfParams: dict  # Ou un modèle plus spécifique

class Token(BaseModel):
    accessToken: str
    tokenType: str

class ChallengeRequest(BaseModel):
    username: str

class ChallengeResponse(BaseModel):
    challenge: str  # Base64/Hex encoded
    publicKey: str
    encryptedPrivateKey: str
    kdfSalt: str
    kdfParams: Any

class VerifyRequest(BaseModel):
    username: str
    challenge: str  # Base64/Hex encoded
    signature: str  # Base64/Hex encoded

class ChangePasswordRequest(BaseModel):
    newEncryptedPrivateKey: str  # Base64/Hex encoded

class UserPublicKeyResponse(BaseModel):
    username: str
    publicKey: str  # Base64/Hex encoded

class MessageBase(BaseModel):
    nonce: str  # Base64/Hex encoded
    ciphertext: str  # Base64/Hex encoded
    authTag: str  # Base64/Hex encoded
    associatedData: Optional[Dict] = None

class MessageCreate(MessageBase):
    conversationId: int

class MessageResponse(MessageBase):
    messageId: int
    senderId: str  # Username
    timestamp: datetime

class ConversationCreateRequest(BaseModel):
    participants: List[str]  # Usernames
    encryptedKeys: Dict[str, str]  # username: encryptedKey (Base64/Hex)

class ConversationResponse(BaseModel):
    conversationId: int
    participants: List[str]
    createdAt: datetime  # camelCase pour API

class ConversationListInfo(BaseModel):
    conversationId: int
    participants: List[str]
    lastMessageTimestamp: Optional[datetime] = None

class ConversationListResponse(BaseModel):
    conversations: List[ConversationListInfo]

class ParticipantAddRequest(BaseModel):
    userId: int  # ID utilisateur
    encryptedSessionKey: str  # Base64 (clé chiffrée)

    class Config:
        schema_extra = {
            "example": {
                "userId": 42,
                "encryptedSessionKey": "QmFzZTY0RW5jb2RlZENsZQ=="
            }
        }

class SessionKeyUpdateRequest(BaseModel):
    participants: List[str]  # Usernames restants
    newEncryptedKeys: Dict[str, str]  # username: newEncryptedKey

    class Config:
        schema_extra = {
            "example": {
                "participants": ["alice", "bob"],
                "newEncryptedKeys": {
                    "alice": "QWxpY2VLZXk=",
                    "bob": "Qm9iS2V5"
                }
            }
        }