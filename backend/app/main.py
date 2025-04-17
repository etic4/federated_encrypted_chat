from fastapi import FastAPI
# Importer la fonction d'initialisation synchrone et les routeurs
from app.api import auth as auth_router
from app.api import users as users_router
from app.api import conversations as conversations_router
from app.api import messages as messages_router
from app.api import websocket as websocket_router
from app.database import create_tables


# Créer un événement de démarrage pour initialiser la base de données
async def on_startup():
    print("--- Initialisation de la base de données ---")
    await create_tables()


# Créer l'instance FastAPI avec l'événement de démarrage
app = FastAPI(title="Secure Chat Backend", on_startup=[on_startup])


# Inclure les routeurs
app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(users_router.router, prefix="/users", tags=["users"])
app.include_router(conversations_router.router, prefix="/conversations", tags=["conversations"])
app.include_router(messages_router.router, prefix="/messages", tags=["messages"])
app.include_router(websocket_router.router, tags=["websocket"])


# Ajouter une route racine simple pour vérifier que l'app fonctionne
@app.get("/")
async def read_root():
    return {"message": "Welcome to Secure Chat Backend"}

# L'ancien événement startup n'est plus nécessaire car init_db() est appelé de manière synchrone au démarrage.
