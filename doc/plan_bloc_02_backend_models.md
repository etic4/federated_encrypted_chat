# Plan d'Implémentation - Bloc 02 : Backend - Modèles de Données et Base

**Objectif :** Définir la structure des données pour l'API et la base de données côté backend, et mettre en place la connexion à la base de données SQLite.

**Référence Spécifications :** Section [4.2.3 Structure de la Base de Données](specifications_techniques.md#423-structure-de-la-base-de-données), Section [5.1 API REST Backend](specifications_techniques.md#51-api-rest-backend), Section [4.2.2 Technologies](specifications_techniques.md#422-technologies).

---

- [x] **Tâche 2.1 : Définir les modèles de données Pydantic pour l'API.**
    - **Instruction :** Créez un fichier `backend/app/schemas.py` (ou structure similaire) pour définir les modèles Pydantic utilisés pour la validation des requêtes et la sérialisation des réponses de l'API. Basez-vous sur les structures définies dans la section 5.1 des spécifications.
    - [x] **Sous-tâche 2.1.1 :** Schémas pour l'authentification (`/auth`).
        - Créez `UserCreate` (pour `/register`), `Token` (pour `/verify`), `ChallengeRequest`, `ChallengeResponse`, `VerifyRequest`, `ChangePasswordRequest`.
        - **Exemple `schemas.py` (partiel) :**
          ```python
          from pydantic import BaseModel, Field
          from typing import Dict, List, Optional

          class UserCreate(BaseModel):
              username: str = Field(..., min_length=3, max_length=50)
              publicKey: str # Base64/Hex encoded
              encryptedPrivateKey: str # Base64/Hex encoded
              kdfSalt: str # Base64/Hex encoded
              kdfParams: Dict # Ou un modèle plus spécifique

          class Token(BaseModel):
              accessToken: str
              tokenType: str

          class ChallengeRequest(BaseModel):
              username: str

          class ChallengeResponse(BaseModel):
              challenge: str # Base64/Hex encoded
              publicKey: str
              encryptedPrivateKey: str
              kdfSalt: str
              kdfParams: Dict

          class VerifyRequest(BaseModel):
              username: str
              challenge: str # Base64/Hex encoded
              signature: str # Base64/Hex encoded

          class ChangePasswordRequest(BaseModel):
              newEncryptedPrivateKey: str # Base64/Hex encoded
          ```
    - [x] **Sous-tâche 2.1.2 :** Schémas pour les utilisateurs (`/users`).
        - Créez `UserPublicKeyResponse`.
    - [x] **Sous-tâche 2.1.3 :** Schémas pour les conversations (`/conversations`).
        - Créez `ConversationCreateRequest`, `ConversationResponse`, `ParticipantAddRequest`, `SessionKeyUpdateRequest`, `ConversationListResponse`, `MessageResponse`.
        - **Exemple `schemas.py` (partiel) :**
          ```python
          # ... autres imports et modèles ...
          from datetime import datetime

          class MessageBase(BaseModel):
              nonce: str # Base64/Hex encoded
              ciphertext: str # Base64/Hex encoded
              authTag: str # Base64/Hex encoded
              associatedData: Optional[Dict] = None

          class MessageCreate(MessageBase):
              conversationId: int

          class MessageResponse(MessageBase):
              messageId: int
              senderId: str # Username
              timestamp: datetime

          class ConversationCreateRequest(BaseModel):
              participants: List[str] # Usernames
              encryptedKeys: Dict[str, str] # username: encryptedKey (Base64/Hex)

          class ConversationResponse(BaseModel):
              conversationId: int
              participants: List[str]
              createdAt: datetime # Renommé depuis created_at pour convention camelCase API

          class ConversationListInfo(BaseModel):
              conversationId: int
              participants: List[str]
              lastMessageTimestamp: Optional[datetime] = None

          class ConversationListResponse(BaseModel):
              conversations: List[ConversationListInfo]

          class ParticipantAddRequest(BaseModel):
              userId: str # Username
              encryptedSessionKey: str # Base64/Hex

          class SessionKeyUpdateRequest(BaseModel):
              participants: List[str] # Usernames restants
              newEncryptedKeys: Dict[str, str] # username: newEncryptedKey
          ```
    - [x] **Sous-tâche 2.1.4 :** Schémas pour les messages (`/messages`).
        - Utilisez `MessageCreate` et `MessageResponse` définis ci-dessus.
    - **Vérification :** Le fichier `backend/app/schemas.py` contient tous les modèles Pydantic nécessaires pour les endpoints API spécifiés.

- [x] **Tâche 2.2 : Définir les modèles SQLAlchemy pour la base de données.**
    - **Instruction :** Créez un fichier `backend/app/models.py` pour définir les modèles SQLAlchemy correspondant aux tables de la base de données spécifiées en section 4.2.3. Utilisez `SQLAlchemy` en mode asynchrone.
    - [x] **Sous-tâche 2.2.1 :** Définir la base déclarative et les types communs.
        - **Exemple `models.py` (début) :**
          ```python
          from sqlalchemy import (
              Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint, Index, LargeBinary
          )
          from sqlalchemy.orm import relationship, declarative_base
          from sqlalchemy.sql import func
          import datetime

          Base = declarative_base()

          # Utiliser Text ou LargeBinary pour les données encodées/binaires selon préférence/DB
          # LargeBinary est souvent plus approprié sémantiquement
          EncodedBlob = LargeBinary
          ```
    - [x] **Sous-tâche 2.2.2 :** Modèle `User`.
        - Implémentez la classe `User(Base)` avec les colonnes `id`, `username`, `public_key`, `encrypted_private_key`, `kdf_salt`, `kdf_params`. Ajoutez les relations (`participations`, `sent_messages`).
    - [x] **Sous-tâche 2.2.3 :** Modèle `Conversation`.
        - Implémentez la classe `Conversation(Base)` avec `id`, `created_at`. Ajoutez les relations (`participants`, `messages`).
    - [x] **Sous-tâche 2.2.4 :** Modèle `Participant`.
        - Implémentez la classe `Participant(Base)` avec `id`, `conversation_id`, `user_id`, `encrypted_session_key`, `joined_at`. Ajoutez les relations (`user`, `conversation`). Définissez `UniqueConstraint`.
    - [x] **Sous-tâche 2.2.5 :** Modèle `Message`.
        - Implémentez la classe `Message(Base)` avec `id`, `conversation_id`, `sender_id`, `timestamp`, `nonce`, `ciphertext`, `auth_tag`, `associated_data`. Ajoutez les relations (`conversation`, `sender`). Définissez l'index sur `conversation_id`, `timestamp`.
    - **Vérification :** Le fichier `backend/app/models.py` contient les définitions complètes des modèles SQLAlchemy correspondant à la structure de la base de données.

- [x] **Tâche 2.3 : Configurer la connexion à la base de données SQLite et initialiser la structure.**
    - **Instruction :** Configurez SQLAlchemy pour utiliser une base de données SQLite asynchrone. Mettez en place Alembic pour gérer les migrations de base de données.
    - [x] **Sous-tâche 2.3.1 :** Configurer la connexion DB.
        - Créez un fichier `backend/app/database.py` pour configurer l'engine SQLAlchemy async et la session factory.
        - **Exemple `database.py` :**
          ```python
          from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
          from sqlalchemy.orm import sessionmaker
          import os

          DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./secure_chat.db")

          engine = create_async_engine(DATABASE_URL, echo=True) # echo=True pour le dev
          AsyncSessionFactory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

          async def get_db() -> AsyncSession:
              async with AsyncSessionFactory() as session:
                  yield session
          ```
    - [x] **Sous-tâche 2.3.2 :** Initialiser Alembic.
        - **Instruction :** Dans le dossier `backend` (venv activé), initialisez Alembic. Configurez `alembic.ini` et `env.py` pour utiliser SQLAlchemy async et les modèles définis.
        - **Commandes :**
          ```bash
          pip install alembic
          alembic init alembic
          ```
        - **Configuration (`alembic/env.py`) :** Adaptez `target_metadata` pour pointer vers `Base.metadata` de `app.models`. Configurez `run_migrations_online` pour le mode asynchrone (voir documentation Alembic async).
        - **Configuration (`alembic.ini`) :** Assurez-vous que `sqlalchemy.url` pointe vers votre `DATABASE_URL`.
    - [x] **Sous-tâche 2.3.3 :** Créer la migration initiale.
        - **Instruction :** Générez la première migration Alembic qui créera toutes les tables définies dans `app/models.py`. Appliquez cette migration.
        - **Commandes :**
          ```bash
          alembic revision --autogenerate -m "Initial database structure"
          alembic upgrade head
          ```
    - **Vérification :** Le fichier `backend/secure_chat.db` est créé. La structure Alembic est en place dans `backend/alembic`. La première migration est générée et appliquée.

---
**Fin du Bloc 02.** Les modèles de données pour l'API et la base de données sont définis, la connexion à la base de données SQLite est configurée, et le système de migration Alembic est initialisé avec la structure de base.