from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
from typing import AsyncGenerator
# Assurez-vous que tous les modèles sont importés ici pour que Base.metadata les connaisse
from app import models  # noqa: F401 # Modifié pour importer le module (nécessaire pour la découverte des modèles par SQLAlchemy)
from app.models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./secure_chat.db")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)


async def create_tables():
    print("--- Début de create_tables ---")
    try:
        async with engine.begin() as conn:
            print("--- Connexion moteur établie, tentative de création des tables... ---")
            await conn.run_sync(Base.metadata.create_all)
            print("--- conn.run_sync(Base.metadata.create_all) exécuté ---")
        print("--- Fin de create_tables (succès) ---")
    except Exception as e:
        print(f"--- Erreur dans create_tables : {e} ---")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        yield session

# La fonction init_db() est supprimée car elle cause une erreur RuntimeError avec Uvicorn.
# Nous revenons à l'utilisation de l'événement startup de FastAPI.