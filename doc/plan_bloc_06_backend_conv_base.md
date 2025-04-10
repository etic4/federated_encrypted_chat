# Plan d'Implémentation - Bloc 06 : Backend - API Utilisateurs et Conversations (Base)

**Objectif :** Implémenter les endpoints API backend de base pour récupérer les informations publiques des utilisateurs et pour créer et lister les conversations.

**Référence Spécifications :** Section [5.1.3 Endpoints /users](specifications_techniques.md#513-endpoints-users), Section [5.1.4 Endpoints /conversations](specifications_techniques.md#514-endpoints-conversations) (partiellement), Section [2.2 Gestion des Conversations](specifications_techniques.md#22-gestion-des-conversations) (partiellement).

---

- [x] **Tâche 6.1 : Implémenter l'endpoint `GET /users/{username}/public_key`.**
    - **Instruction :** Créez un nouveau routeur FastAPI (ex: `backend/app/api/users.py`) et implémentez cet endpoint protégé.
    - [x] **Sous-tâche 6.1.1 :** Créer le routeur `users.py`.
        - Créez le fichier `backend/app/api/users.py`.
        - Importez `APIRouter`, `Depends`, `HTTPException`, les modèles (`User`), les schémas (`UserPublicKeyResponse`), la dépendance `get_db`, et la dépendance d'authentification `get_current_user` (de `app.security`).
    - [x] **Sous-tâche 6.1.2 :** Définir l'endpoint.
        - Définissez l'endpoint `GET /{username}/public_key` qui retourne un `UserPublicKeyResponse`.
        - Protégez l'endpoint en ajoutant `Depends(get_current_user)` (même si on ne l'utilise pas directement ici, cela assure que seul un utilisateur connecté peut demander une clé publique).
    - [x] **Sous-tâche 6.1.3 :** Implémenter la logique métier.
        - Récupérez l'utilisateur demandé (`username` du path) depuis la base de données.
        - Si l'utilisateur n'est pas trouvé, levez `HTTPException` (404 Not Found).
        - Retournez la clé publique de l'utilisateur (assurez-vous de l'encoder correctement en Base64/Hex si elle est stockée en `LargeBinary`).
    - [x] **Sous-tâche 6.1.4 :** Intégrer le routeur dans `main.py`.
        - Importez le routeur `users` et incluez-le avec le préfixe `/users`.
    - **Vérification :** Une requête GET authentifiée vers `/users/{existing_username}/public_key` retourne la clé publique. Une requête pour un utilisateur inexistant retourne 404. Une requête non authentifiée retourne 401.

- [x] **Tâche 6.2 : Implémenter l'endpoint `POST /conversations`.**
    - **Instruction :** Créez un nouveau routeur FastAPI (ex: `backend/app/api/conversations.py`) et implémentez l'endpoint de création de conversation.
    - [x] **Sous-tâche 6.2.1 :** Créer le routeur `conversations.py`.
        - Créez le fichier `backend/app/api/conversations.py`.
        - Importez les dépendances nécessaires (`APIRouter`, `Depends`, `HTTPException`, modèles, schémas `ConversationCreateRequest`, `ConversationResponse`, `get_db`, `get_current_user`).
    - [x] **Sous-tâche 6.2.2 :** Définir l'endpoint.
        - Définissez l'endpoint `POST /` (dans ce routeur) qui prend un `ConversationCreateRequest` et retourne un `ConversationResponse` avec le statut 201.
        - Protégez l'endpoint avec `Depends(get_current_user)`. Récupérez le `current_username`.
    - [x] **Sous-tâche 6.2.3 :** Implémenter la logique métier.
        - Récupérez la session DB.
        - Validez que l'utilisateur courant (`current_username`) est bien inclus dans la liste `participants` de la requête. Si non, `HTTPException` (400 Bad Request).
        - Pour chaque `username` dans `participants` :
            - Récupérez l'objet `User` correspondant depuis la DB. Si un utilisateur n'existe pas, levez `HTTPException` (404 Not Found).
            - Stockez les objets `User` récupérés.
        - Créez une nouvelle instance de `Conversation`. Ajoutez-la à la session.
        - *Flush* la session pour obtenir l'`id` de la nouvelle conversation (`await session.flush()`).
        - Pour chaque participant (objet `User` récupéré) :
            - Récupérez la `encryptedSessionKey` correspondante depuis le dictionnaire `encryptedKeys` de la requête.
            - Créez une instance de `Participant` en liant `conversation_id`, `user_id`, et la `encryptedSessionKey` (décodée si nécessaire).
            - Ajoutez le participant à la session.
        - Commitez la transaction (`await session.commit()`).
        - Rafraîchissez l'objet `Conversation` pour charger les relations si nécessaire (`await session.refresh(new_conversation, relationship_names=["participants"])`).
        - Formatez et retournez la réponse `ConversationResponse`.
    - [x] **Sous-tâche 6.2.4 :** Intégrer le routeur dans `main.py`.
        - Importez le routeur `conversations` et incluez-le avec le préfixe `/conversations`.
    - **Vérification :** Une requête POST authentifiée vers `/conversations` avec des participants valides et les clés chiffrées crée une conversation et les entrées participants associées. Les erreurs (participant non trouvé, utilisateur courant non inclus) sont gérées.

- [x] **Tâche 6.3 : Implémenter l'endpoint `GET /conversations`.**
    - **Instruction :** Dans le routeur `conversations.py`, implémentez l'endpoint pour lister les conversations de l'utilisateur courant.
    - [x] **Sous-tâche 6.3.1 :** Définir l'endpoint.
        - Définissez l'endpoint `GET /` qui retourne un `ConversationListResponse`.
        - Protégez l'endpoint avec `Depends(get_current_user)`. Récupérez le `current_username`.
    - [x] **Sous-tâche 6.3.2 :** Implémenter la logique métier.
        - Récupérez l'objet `User` de l'utilisateur courant.
        - Écrivez une requête SQLAlchemy pour récupérer les conversations où l'utilisateur courant est participant.
        - Utilisez `select(Conversation).join(Participant).join(User).where(User.username == current_username)`.
        - Pour chaque conversation trouvée, récupérez la liste des `username` des participants (nécessite potentiellement un chargement eager ou une sous-requête). Récupérez également le timestamp du dernier message si nécessaire (peut être complexe/coûteux, à évaluer).
        - Formatez les résultats dans une liste d'objets `ConversationListInfo`.
        - Retournez la réponse `ConversationListResponse`.
    - **Vérification :** Une requête GET authentifiée vers `/conversations` retourne la liste des conversations auxquelles l'utilisateur participe, avec les informations attendues.

---
**Fin du Bloc 06.** Les endpoints backend de base pour récupérer les clés publiques, créer des conversations et lister les conversations de l'utilisateur sont implémentés et protégés.