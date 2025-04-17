from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import secrets
import base64
import binascii  # Importer binascii pour l'exception d'erreur Base64

from app.schemas import UserCreate, ChallengeRequest, ChallengeResponse, AuthResponseOK, VerifyRequest, Token, ChangePasswordRequest
from app.models import User
from app.database import get_session
from app.security import create_access_token, get_current_user
from app.schemas import KdfParams  # Ensure this import exists
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_session)
) -> AuthResponseOK:
    result = await db.execute(select(User).where(User.username == user_in.username))
    db_user = result.scalars().first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already registered"
        )

    # Décoder les données Base64 reçues en bytes avant de les stocker
    try:
        public_key_bytes = base64.b64decode(user_in.publicKey)
        login_public_key_bytes = base64.b64decode(user_in.loginPublicKey)
        encrypted_private_key_bytes = base64.b64decode(user_in.encryptedPrivateKey)
        encrypted_login_private_key_bytes = base64.b64decode(user_in.encryptedLoginPrivateKey)
        kdf_salt_bytes = base64.b64decode(user_in.kdfSalt)
    except (TypeError, binascii.Error) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Base64 data: {e}")

    db_user = User(
        username=user_in.username,
        public_key=public_key_bytes,
        login_public_key=login_public_key_bytes,
        encrypted_private_key=encrypted_private_key_bytes,
        encrypted_login_private_key=encrypted_login_private_key_bytes,
        kdf_salt=kdf_salt_bytes,
        kdf_params=user_in.kdfParams.model_dump(),  # Convert KdfParams to dict
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    access_token = create_access_token(data={"sub": user_in.username})

    return AuthResponseOK(
        id=db_user.id,
        username=db_user.username,
        accessToken=access_token,
        tokenType="bearer"
    )


@router.post("/challenge", response_model=ChallengeResponse)
async def create_challenge(challenge_request: ChallengeRequest, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(User).where(User.username == challenge_request.username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    challenge = secrets.token_bytes(32)
    challenge_b64 = base64.b64encode(challenge).decode("utf-8")

    kdf_params = KdfParams(**user.kdf_params)  # Convert dict to KdfParams object

    # Encoder les bytes lus de la DB en Base64 avant de les renvoyer
    encrypted_login_private_key_b64 = base64.b64encode(user.encrypted_login_private_key).decode('utf-8')
    encrypted_private_key_b64 = base64.b64encode(user.encrypted_private_key).decode('utf-8')
    kdf_salt_b64 = base64.b64encode(user.kdf_salt).decode('utf-8')

    return ChallengeResponse(
        challenge=challenge_b64,
        encryptedLoginPrivateKey=encrypted_login_private_key_b64,
        encryptedPrivateKey=encrypted_private_key_b64,
        kdfSalt=kdf_salt_b64,
        kdfParams=kdf_params,
    )


@router.post("/verify", response_model=Token)
async def verify_signature(
    verify_request: VerifyRequest, db: AsyncSession = Depends(get_session)
):
    result = await db.execute(select(User).where(User.username == verify_request.username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Utiliser directement les bytes de la clé publique depuis la DB
    # user.public_key est maintenant de type bytes
    verify_key = VerifyKey(user.login_public_key)

    # Décoder le challenge et la signature reçus en Base64
    try:
        challenge_bytes = base64.b64decode(verify_request.challenge)
        signature_bytes = base64.b64decode(verify_request.signature)
    except (TypeError, binascii.Error) as e: # Utiliser binascii.Error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Base64 data for challenge/signature: {e}")

    try:
        verify_key.verify(challenge_bytes, signature_bytes)
    except BadSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})

    return AuthResponseOK(
        id=user.id,
        username=user.username,
        accessToken=access_token,
        tokenType="bearer"
    )


@router.put("/change-password")
async def change_password(
    password_request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.username == current_user.username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    # Décoder la nouvelle clé privée chiffrée (Base64) en bytes avant de la stocker
    try:
        new_encrypted_private_key_bytes = base64.b64decode(password_request.newEncryptedPrivateKey)
    except (TypeError, binascii.Error) as e: # Utiliser binascii.Error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Base64 data for new private key: {e}")

    user.encrypted_private_key = new_encrypted_private_key_bytes
    await db.commit()
    return {"message": "Password updated successfully"}