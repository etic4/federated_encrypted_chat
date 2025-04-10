from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User
from app.schemas import UserPublicKeyResponse
from app.database import get_db
from app.security import get_current_user

router = APIRouter()

@router.get("/{username}/public_key", response_model=UserPublicKeyResponse)
async def get_public_key(
    username: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Vérifier que l'utilisateur demandé existe
    result = await db.execute(
        select(User).where(User.username == username)
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"Utilisateur {username} non trouvé"
        )
    
    # Vérifier que l'utilisateur a une clé publique
    if not user.public_key:
        raise HTTPException(
            status_code=404,
            detail=f"Clé publique non trouvée pour l'utilisateur {username}"
        )
    
    # Encoder la clé publique en base64
    import base64
    public_key_base64 = base64.b64encode(user.public_key).decode('utf-8')
    
    return {
        "username": user.username,
        "public_key": public_key_base64
    }