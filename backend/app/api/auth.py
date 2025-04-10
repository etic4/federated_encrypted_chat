from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import secrets
import base64

from app.schemas import UserCreate, ChallengeRequest, ChallengeResponse, VerifyRequest, Token, ChangePasswordRequest
from app.models import User
from app.database import get_db
from app.security import create_access_token, get_current_user
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user_in.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already registered"
        )

    db_user = User(**user_in.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User created successfully"}


@router.post("/challenge", response_model=ChallengeResponse)
def create_challenge(challenge_request: ChallengeRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == challenge_request.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    challenge = secrets.token_bytes(32)
    challenge_b64 = base64.b64encode(challenge).decode("utf-8")

    public_key = user.public_key.decode("utf-8")
    encrypted_private_key = user.encrypted_private_key.decode("utf-8")
    kdf_salt = user.kdf_salt.decode("utf-8")
    kdf_params = user.kdf_params

    return ChallengeResponse(
        challenge=challenge_b64,
        publicKey=public_key,
        encryptedPrivateKey=encrypted_private_key,
        kdfSalt=kdf_salt,
        kdfParams=kdf_params,
    )


@router.post("/verify", response_model=Token)
def verify_signature(
    verify_request: VerifyRequest, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == verify_request.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    public_key_b64 = user.public_key
    verify_key = VerifyKey(base64.b64decode(public_key_b64.decode('utf-8')))

    challenge_b64 = verify_request.challenge
    challenge_bytes = base64.b64decode(challenge_b64)
    signature_b64 = verify_request.signature
    signature_bytes = base64.b64decode(signature_b64)

    try:
        verify_key.verify(challenge_bytes, signature_bytes)
    except BadSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return Token(accessToken=access_token, tokenType="bearer")


@router.put("/change-password")
async def change_password(
    password_request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_username: str = Depends(get_current_user),
):
    user = db.query(User).filter(User.username == current_username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    user.encrypted_private_key = password_request.newEncryptedPrivateKey.encode('utf-8')
    db.commit()
    return {"message": "Password updated successfully"}