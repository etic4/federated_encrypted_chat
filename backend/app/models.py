from typing import Optional
from datetime import datetime
from sqlalchemy import (
    Integer,
    String,
    ForeignKey,
    JSON,
    DateTime,
    UniqueConstraint,
    Index,
    LargeBinary  # Importer LargeBinary
)

from sqlalchemy.orm import Mapped, DeclarativeBase, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    public_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)  # Changer String -> LargeBinary, str -> bytes
    login_public_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False) # Changer String -> LargeBinary, str -> bytes
    encrypted_private_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False) # Changer String -> LargeBinary, str -> bytes
    encrypted_login_private_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False) # Changer String -> LargeBinary, str -> bytes
    kdf_salt: Mapped[bytes] = mapped_column(LargeBinary, nullable=False) # Changer String -> LargeBinary, str -> bytes
    kdf_params: Mapped[dict] = mapped_column(JSON, nullable=False) # Garder JSON tel quel

    participations = relationship("Participant", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", back_populates="sender", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    participants = relationship("Participant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        UniqueConstraint('conversation_id', 'user_id', name='uix_conversation_user'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Note: encrypted_session_key devrait probablement aussi être LargeBinary si c'est des données binaires
    encrypted_session_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False) # Changer String -> LargeBinary, str -> bytes
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="participations")
    conversation = relationship("Conversation", back_populates="participants")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index('ix_conversation_timestamp', 'conversation_id', 'timestamp'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Note: nonce et ciphertext devraient aussi être LargeBinary
    nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False) # Changer String -> LargeBinary, str -> bytes
    ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False) # Changer String -> LargeBinary, str -> bytes
    associated_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # Garder JSON tel quel

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")

