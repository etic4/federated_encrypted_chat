from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User
from app.schemas import UserPublicKeyResponse
from app.database import get_session
from app.security import get_current_user

router = APIRouter()


# get all users names
@router.get("", response_model=list[str])
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
) -> list[str]:
    # Récupérer tous les utilisateurs
    result = await db.execute(select(User.username))
    users_names = result.scalars().all()
    
    if not users_names:
        raise HTTPException(
            status_code=404,
            detail="Aucun utilisateur trouvé"
        )
    
    return list(users_names)


@router.get("/{username}/public_key", response_model=UserPublicKeyResponse)
async def get_public_key(
    username: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
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
    
    return {
        "username": user.username,
        "public_key": user.public_key
    }
