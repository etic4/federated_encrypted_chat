from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from starlette.websockets import WebSocketState
import asyncio
from typing import Union

from app.security import SECRET_KEY, ALGORITHM
from app.schemas import KeyRotationPayload, NewMessagePayload, ParticipantAddedPayload, RemoveFromConversationPayload

router = APIRouter()

WS_1008_POLICY_VIOLATION = 1008


class ConnectionManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self.active_connections = {}  # type: dict[str, WebSocket]
        self.lock = asyncio.Lock()
        self._initialized = True

    async def connect(self, username: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self.lock:
            self.active_connections[username] = websocket

    async def disconnect(self, username: str) -> None:
        async with self.lock:
            if username in self.active_connections:
                del self.active_connections[username]

    async def send_personal_message(
        self,
        message: KeyRotationPayload | RemoveFromConversationPayload,
        username: str
    ) -> None:
        async with self.lock:
            websocket = self.active_connections.get(username)
            if websocket and websocket.application_state == WebSocketState.CONNECTED:
                message_str = message.model_dump_json()
                await websocket.send_text(message_str)

    async def broadcast(self, message: str) -> None:
        async with self.lock:
            for ws in self.active_connections.values():
                if ws.application_state == WebSocketState.CONNECTED:
                    await ws.send_text(message)

    async def send_to_participants(
        self,
        payload: NewMessagePayload | ParticipantAddedPayload,
        participant_usernames: list[str]
    ) -> None:
        message_str = payload.model_dump_json()
        async with self.lock:
            for username in participant_usernames:
                ws = self.active_connections.get(username)
                if ws and ws.application_state == WebSocketState.CONNECTED:
                    await ws.send_text(message_str)


manager = ConnectionManager()


def validate_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    username = None
    if token:
        username = validate_token(token)
    if not username:
        await websocket.close(code=WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(username, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # Ici, on peut traiter les messages reçus
            # Pour l'instant, on renvoie juste un echo
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(username)
