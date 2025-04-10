from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
from typing import AsyncGenerator


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./secure_chat.db")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        yield session