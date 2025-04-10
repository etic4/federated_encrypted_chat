# Plan d'Implémentation - Bloc 08 : Backend - API Messages et WebSockets

**Objectif :** Implémenter les endpoints API backend pour l'envoi et la récupération des messages chiffrés, et mettre en place le serveur WebSocket pour la diffusion en temps réel des messages.

**Référence Spécifications :** Section [2.3 Messagerie](specifications_techniques.md#23-messagerie), Section [5.1.5 Endpoints /messages](specifications_techniques.md#515-endpoints-messages), Section [5.1.4 Endpoints /conversations](specifications_techniques.md#514-endpoints-conversations) (GET messages), Section [5.2 Protocole WebSocket](specifications_techniques.md#52-protocole-websocket).

---

- [x] **Tâche 8.1 : Implémenter l'endpoint `POST /messages`.**
    - **Instruction :** Dans un nouveau routeur `backend/app/api/messages.py` (ou dans `conversations.py` si préféré), implémentez l'endpoint pour recevoir et stocker les messages chiffrés envoyés par les clients.
    - [x] **Sous-tâche 8.1.1 :** Créer/Modifier le routeur et définir l'endpoint.
        - Créez `backend/app/api/messages.py` ou ajoutez au routeur `conversations`.
        - Importez les dépendances (`APIRouter`, `Depends`, `HTTPException`, modèles `Message`, `User`, `Participant`, schémas `MessageCreate`, `get_db`, `get_current_user`).
        - Définissez l'endpoint `POST /` (préfixé par `/messages` si routeur séparé) qui prend un `MessageCreate` et retourne un statut 201 avec `{ messageId: int, timestamp: string }`.
        - Protégez avec `Depends(get_current_user)`. Récupérez `current_username`.
    - [x] **Sous-tâche 8.1.2 :** Implémenter la logique métier.
        - Récupérez la session DB et l'objet `User` de l'expéditeur (`current_username`).
        - Vérifiez que l'expéditeur est bien participant de la `conversationId` fournie dans le body. Récupérez l'objet `Participant` correspondant ou levez `HTTPException` (403 Forbidden).
        - Créez une nouvelle instance du modèle `Message` avec les données reçues (`conversation_id`, `sender_id`, `nonce`, `ciphertext`, `auth_tag`, `associated_data` - décodez si nécessaire).
        - Ajoutez le message à la session et commitez (`await session.add(new_message); await session.commit(); await session.refresh(new_message)`).
        - **Action Post-Commit :** Déclenchez la diffusion du message via WebSocket (voir Tâche 8.4). Passez les données nécessaires au gestionnaire WebSocket.
        - Retournez l'ID et le timestamp du message créé.
    - [x] **Sous-tâche 8.1.3 :** Intégrer le routeur (si nouveau) dans `main.py`.
    - **Vérification :** Une requête POST authentifiée vers `/messages` par un participant valide stocke le message chiffré dans la DB et retourne les informations attendues. Une requête par un non-participant est rejetée (403).

- [x] **Tâche 8.2 : Implémenter l'endpoint `GET /conversations/{conv_id}/messages` (avec pagination).**
    - **Instruction :** Dans le routeur `conversations.py`, implémentez l'endpoint pour récupérer l'historique des messages chiffrés d'une conversation, avec pagination.
    - [x] **Sous-tâche 8.2.1 :** Définir l'endpoint.
        - Définissez l'endpoint `GET /{conv_id}/messages` qui retourne une liste de `MessageResponse`.
        - Ajoutez les paramètres de query `limit: int = 50`, `before: Optional[int] = None` (pour la pagination basée sur l'ID du message ou timestamp).
        - Protégez avec `Depends(get_current_user)`. Récupérez `current_username`.
    - [x] **Sous-tâche 8.2.2 :** Implémenter la logique métier.
        - Récupérez la session DB et l'utilisateur courant.
        - Vérifiez que l'utilisateur courant est participant de `conv_id`. Si non, `HTTPException` (403).
        - Construisez la requête SQLAlchemy pour récupérer les messages de la conversation (`select(Message).where(Message.conversation_id == conv_id)`).
        - Appliquez le filtre de pagination (`.where(Message.id < before)` si `before` est fourni).
        - Triez par timestamp ou ID descendant (`.order_by(Message.timestamp.desc())`).
        - Appliquez la limite (`.limit(limit)`).
        - Exécutez la requête (`await session.execute(...)`).
        - Formatez les résultats en une liste de `MessageResponse` (récupérez le `sender.username`, encodez les données binaires si nécessaire).
        - Retournez la liste.
    - **Vérification :** Une requête GET authentifiée vers `/conversations/{conv_id}/messages` par un participant retourne la liste paginée des messages chiffrés. La pagination fonctionne correctement. Un non-participant reçoit une erreur 403.

- [x] **Tâche 8.3 : Mettre en place le serveur WebSocket (`/ws`) avec authentification.**
    - **Instruction :** Configurez un endpoint WebSocket dans FastAPI pour gérer les connexions temps réel des clients.
    - [x] **Sous-tâche 8.3.1 :** Définir l'endpoint WebSocket.
        - Dans `main.py` ou un routeur dédié (ex: `backend/app/api/websocket.py`), définissez un endpoint `@app.websocket("/ws")` ou `@router.websocket("/ws")`.
        - La fonction associée prendra `websocket: WebSocket` comme argument.
    - [x] **Sous-tâche 8.3.2 :** Implémenter l'authentification WebSocket.
        - **Méthode :** Authentification via token dans l'URL query param (`ws://...?token=...`).
        - **Instruction :** Dans la fonction de l'endpoint WebSocket, extrayez le token des query params. Validez le token en utilisant la logique de `security.py` (similaire à `get_current_user`).
        - Si le token est invalide, fermez la connexion WebSocket avec un code d'erreur approprié (`await websocket.close(code=status.WS_1008_POLICY_VIOLATION)`).
        - Si le token est valide, récupérez le `username` associé.
    - [x] **Sous-tâche 8.3.3 :** Gérer le cycle de vie de la connexion.
        - Acceptez la connexion : `await websocket.accept()`.
        - Mettez en place une structure pour gérer les connexions actives (ex: un dictionnaire mappant `username` à l'objet `WebSocket` ou une liste d'objets `WebSocket`). Un gestionnaire de connexion dédié peut être utile.
        - **Exemple (Gestionnaire simple) :**
          ```python
          # Dans websocket.py ou un module dédié
          from typing import Dict, List
          from fastapi import WebSocket

          class ConnectionManager:
              def __init__(self):
                  self.active_connections: Dict[str, WebSocket] = {} # username: websocket

              async def connect(self, websocket: WebSocket, username: str):
                  await websocket.accept()
                  self.active_connections[username] = websocket

              def disconnect(self, username: str):
                  if username in self.active_connections:
                      del self.active_connections[username]

              async def send_personal_message(self, message: str, username: str):
                  if username in self.active_connections:
                      await self.active_connections[username].send_text(message)

              async def broadcast(self, message: str): # Moins utile ici
                  for connection in self.active_connections.values():
                      await connection.send_text(message)

              async def send_to_participants(self, message: str, participants: List[str]):
                  # Convertir le message en JSON string si nécessaire
                  import json
                  message_str = json.dumps(message) if isinstance(message, dict) else message
                  for username in participants:
                      if username in self.active_connections:
                          await self.active_connections[username].send_text(message_str)

          manager = ConnectionManager()
          ```
        - Ajoutez l'utilisateur et son websocket au gestionnaire lors de la connexion réussie.
        - Mettez en place une boucle `try...finally` pour écouter les messages entrants (même si on n'en attend pas du client pour l'instant) et gérer la déconnexion (retirer du gestionnaire dans le `finally`).
        - **Exemple (Endpoint WS) :**
          ```python
          # Dans websocket.py ou main.py
          from fastapi import WebSocket, WebSocketDisconnect, Depends, status
          # ... import manager, security functions ...

          @router.websocket("/ws") # Ou @app.websocket("/ws")
          async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
              if not token:
                  await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                  return
              try:
                  username = await security.validate_token_ws(token) # Fonction à créer dans security.py
                  if not username:
                      await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                      return
              except Exception: # Capturer JWTError, etc.
                  await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                  return

              await manager.connect(websocket, username)
              try:
                  while True:
                      # On n'attend rien du client pour l'instant, mais on garde la connexion ouverte
                      await websocket.receive_text() # Ou receive_bytes, receive_json
                      # Logique de traitement des messages client si nécessaire
              except WebSocketDisconnect:
                  manager.disconnect(username)
              finally:
                  # Assurer la déconnexion propre si pas déjà fait
                  if username in manager.active_connections:
                       manager.disconnect(username)

          ```
    - **Vérification :** Un client peut établir une connexion WebSocket avec un token valide. Une connexion avec un token invalide est refusée. Le serveur maintient la liste des connexions actives.

- [x] **Tâche 8.4 : Implémenter la diffusion des messages via WebSocket.**
    - **Instruction :** Modifiez la logique de l'endpoint `POST /messages` (Tâche 8.1) pour utiliser le `ConnectionManager` afin de diffuser le nouveau message aux participants connectés de la conversation.
    - [x] **Sous-tâche 8.4.1 :** Injecter/Accéder au `ConnectionManager`.
        - Assurez-vous que le `ConnectionManager` (instance unique) est accessible depuis la logique de l'endpoint `POST /messages`. (Variable globale simple, ou injection de dépendance plus propre si nécessaire).
    - [x] **Sous-tâche 8.4.2 :** Récupérer les participants et diffuser.
        - Après avoir commité le nouveau message dans la DB (dans `POST /messages`):
            1. Récupérez la liste des `username` de tous les participants de la `conversationId` (y compris l'expéditeur).
            2. Préparez le payload du message WebSocket comme défini dans les specs (Section 5.2.2, type `newMessage`, avec toutes les données nécessaires : `messageId`, `conversationId`, `senderId`, `timestamp`, `nonce`, `ciphertext`, `authTag`, `associatedData`).
            3. Appelez `await manager.send_to_participants(payload, participant_usernames)`.
    - **Vérification :** Lorsqu'un message est envoyé via `POST /messages`, tous les participants actuellement connectés via WebSocket reçoivent le message chiffré en temps réel.

---
**Fin du Bloc 08.** Les endpoints backend pour l'envoi et la récupération des messages sont fonctionnels. Le serveur WebSocket est en place, authentifie les connexions et diffuse les nouveaux messages aux participants concernés.