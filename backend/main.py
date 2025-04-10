from fastapi import FastAPI

app = FastAPI(title="Secure Chat Backend")


@app.get("/")
async def read_root():
    return {"message": "Welcome to Secure Chat Backend"}
from app.api import auth as auth_router
from app.api import users as users_router
from app.api import conversations as conversations_router
from app.api import messages as messages_router
from app.api import websocket as websocket_router

app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(users_router.router, prefix="/users", tags=["users"])
app.include_router(conversations_router.router, prefix="/conversations", tags=["conversations"])
app.include_router(messages_router.router, prefix="/messages", tags=["messages"])
app.include_router(websocket_router.router, tags=["websocket"])