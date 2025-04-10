from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from starlette.websockets import WebSocketState
import asyncio

from backend.app.security import SECRET_KEY, ALGORITHM

router = APIRouter()

WS_1008_POLICY_VIOLATION = 1008

class ConnectionManager:
    _instance = None
    active_connections: dict[str, WebSocket] = {}
    lock: asyncio.Lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConnectionManager, cls).__new__(cls)
        return cls._instance

    async def connect(self, username: str, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections[username] = websocket

    async def disconnect(self, username: str):
        async with self.lock:
            if username in self.active_connections:
                del self.active_connections[username]

    async def send_personal_message(self, message: str, username: str):
        async with self.lock:
            websocket = self.active_connections.get(username)
            if websocket and websocket.application_state == WebSocketState.CONNECTED:
                await websocket.send_text(message)

    async def broadcast(self, message: str):
        async with self.lock:
            for ws in self.active_connections.values():
                if ws.application_state == WebSocketState.CONNECTED:
                    await ws.send_text(message)
    async def send_to_participants(self, message: dict, participants: list[str]):
        import json
        message_str = json.dumps(message)
        async with self.lock:
            for username in participants:
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