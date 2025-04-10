# Plan d'Implémentation - Bloc 04 : Backend - API Authentification

**Objectif :** Implémenter les endpoints de l'API REST côté backend nécessaires pour la gestion des utilisateurs : inscription, challenge d'authentification, vérification du challenge et changement de mot de passe (mise à jour de la clé privée chiffrée).

**Référence Spécifications :** Section [2.1 Gestion des Utilisateurs](specifications_techniques.md#21-gestion-des-utilisateurs), Section [5.1.2 Endpoints /auth](specifications_techniques.md#512-endpoints-auth), Section [4.2 Composant Backend](specifications_techniques.md#42-composant-backend).

---

- [x] **Tâche 4.1 : Implémenter l'endpoint `/auth/register`.**
    - **Instruction :** Créez un routeur FastAPI pour l'authentification (ex: `backend/app/api/auth.py`). Implémentez la logique pour l'endpoint `POST /auth/register`.
    - [x] **Sous-tâche 4.1.1 :** Définir le routeur et l'endpoint.
        - Créez `backend/app/api/auth.py`.
        - Importez `APIRouter` de FastAPI, les schémas Pydantic (`UserCreate`) de `app.schemas`, les modèles SQLAlchemy (`User`) de `app.models`, et la dépendance `get_db` de `app.database`.
        - Définissez l'endpoint `POST /register` avec le statut de réponse `201 Created`.
    - [x] **Sous-tâche 4.1.2 :** Implémenter la logique métier.
        - Dans l'endpoint, récupérez la session de base de données via `Depends(get_db)`.
        - Vérifiez si un utilisateur avec le même `username` existe déjà. Si oui, levez une `HTTPException` (409 Conflict).
        - Créez une nouvelle instance du modèle `User` avec les données reçues (assurez-vous que les données binaires/encodées sont stockées correctement, potentiellement après décodage Base64/Hex si nécessaire selon le type de colonne choisi - `Text` vs `LargeBinary`).
        - Ajoutez le nouvel utilisateur à la session et commitez.
        - Retournez une réponse de succès (ex: `{"message": "User created successfully"}`).
    - [x] **Sous-tâche 4.1.3 :** Intégrer le routeur dans l'application principale.
        - Dans `backend/main.py`, importez le routeur `auth` et incluez-le dans l'application FastAPI avec un préfixe `/auth`.
    - **Vérification :** Une requête POST vers `/auth/register` avec des données valides crée un nouvel utilisateur dans la base de données. Une requête avec un username existant retourne une erreur 409.

- [x] **Tâche 4.2 : Implémenter l'endpoint `/auth/challenge`.**
    - **Instruction :** Dans le routeur `auth.py`, implémentez la logique pour l'endpoint `POST /auth/challenge`.
    - [x] **Sous-tâche 4.2.1 :** Définir l'endpoint.
        - Définissez l'endpoint `POST /challenge` qui prend un `ChallengeRequest` en body et retourne un `ChallengeResponse`.
    - [x] **Sous-tâche 4.2.2 :** Implémenter la logique métier.
        - Récupérez l'utilisateur basé sur le `username` fourni. Si non trouvé, levez une `HTTPException` (404 Not Found).
        - Générez un challenge aléatoire sécurisé (ex: `secrets.token_bytes(32)`).
        - **Important :** Stockez temporairement le challenge généré associé à l'utilisateur (ex: dans un cache rapide comme Redis, ou dans une table DB temporaire avec expiration) pour pouvoir le vérifier lors de l'appel à `/auth/verify`. *Alternative simple pour commencer : ne pas stocker le challenge côté serveur et faire confiance au client pour renvoyer le même challenge lors du verify (moins sécurisé contre certaines attaques, mais plus simple).* Pour ce plan, nous choisissons l'alternative simple pour l'instant.
        - Retournez le challenge (encodé Base64/Hex), ainsi que les informations utilisateur nécessaires au client pour déchiffrer sa clé privée (`publicKey`, `encryptedPrivateKey`, `kdfSalt`, `kdfParams`).
    - **Vérification :** Une requête POST vers `/auth/challenge` avec un username valide retourne les informations attendues, y compris un challenge aléatoire. Une requête avec un username invalide retourne 404.

- [x] **Tâche 4.3 : Implémenter l'endpoint `/auth/verify` (avec génération de token).**
    - **Instruction :** Dans le routeur `auth.py`, implémentez la logique pour l'endpoint `POST /auth/verify`. Mettez en place la génération et la validation de tokens JWT (ou autre méthode de session).
    - [x] **Sous-tâche 4.3.1 :** Configurer la gestion des tokens (JWT).
        - **Instruction :** Créez un module utilitaire (ex: `backend/app/security.py`) pour gérer la création et la validation des tokens JWT. Définissez une clé secrète (`SECRET_KEY`), l'algorithme (`ALGORITHM`, ex: HS256), et le temps d'expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`). Utilisez la bibliothèque `python-jose`.
        - **Exemple `security.py` :**
          ```python
          from datetime import datetime, timedelta, timezone
          from typing import Optional
          from jose import JWTError, jwt
          from pydantic import BaseModel
          import os

          SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_change_this") # Charger depuis variable d'env
          ALGORITHM = "HS256"
          ACCESS_TOKEN_EXPIRE_MINUTES = 30

          class TokenData(BaseModel):
              username: Optional[str] = None

          def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
              to_encode = data.copy()
              if expires_delta:
                  expire = datetime.now(timezone.utc) + expires_delta
              else:
                  expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
              to_encode.update({"exp": expire})
              encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
              return encoded_jwt

          # Ajouter une fonction pour décoder/valider le token si nécessaire pour la protection des endpoints
          ```
    - [x] **Sous-tâche 4.3.2 :** Définir l'endpoint `/verify`.
        - Définissez l'endpoint `POST /verify` qui prend un `VerifyRequest` en body et retourne un `Token`.
    - [x] **Sous-tâche 4.3.3 :** Implémenter la logique métier.
        - Récupérez l'utilisateur basé sur le `username`. Si non trouvé, levez `HTTPException` (404).
        - Récupérez la clé publique de l'utilisateur depuis la base de données.
        - Décodez le challenge et la signature reçus (Base64/Hex).
        - **Vérifiez la signature :** Utilisez une bibliothèque crypto (comme `pynacl` si vous utilisez Ed25519, ou `cryptography`) pour vérifier que la `signature` du `challenge` est valide avec la `publicKey` de l'utilisateur.
        - Si la signature est invalide, levez `HTTPException` (401 Unauthorized).
        - Si la signature est valide :
            - Créez un token d'accès JWT en utilisant `create_access_token` (payload contenant au moins `{"sub": username}`).
            - Retournez le token dans une réponse `Token`.
    - **Vérification :** Une requête POST vers `/auth/verify` avec un challenge et une signature valides retourne un token JWT. Une signature invalide retourne 401.

- [x] **Tâche 4.4 : Implémenter l'endpoint `/auth/change-password`.**
    - **Instruction :** Dans le routeur `auth.py`, implémentez la logique pour l'endpoint `PUT /auth/change-password`. Cet endpoint doit être protégé et nécessiter un token valide.
    - [x] **Sous-tâche 4.4.1 :** Mettre en place la dépendance d'authentification.
        - **Instruction :** Créez une dépendance FastAPI (ex: dans `security.py`) qui valide le token JWT présent dans l'en-tête `Authorization` et retourne l'utilisateur courant (ou son username). Utilisez cette dépendance pour protéger l'endpoint.
        - **Exemple (simplifié, à adapter) :**
          ```python
          from fastapi import Depends, HTTPException, status
          from fastapi.security import OAuth2PasswordBearer

          oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/verify") # tokenUrl indicatif

          async def get_current_user(token: str = Depends(oauth2_scheme)):
              credentials_exception = HTTPException(
                  status_code=status.HTTP_401_UNAUTHORIZED,
                  detail="Could not validate credentials",
                  headers={"WWW-Authenticate": "Bearer"},
              )
              try:
                  payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                  username: str = payload.get("sub")
                  if username is None:
                      raise credentials_exception
                  token_data = TokenData(username=username)
              except JWTError:
                  raise credentials_exception
              # Ici, on pourrait récupérer l'objet User complet depuis la DB si nécessaire
              # user = await get_user_from_db(username=token_data.username, db=db) # Nécessite d'injecter db
              # if user is None:
              #     raise credentials_exception
              # return user
              return token_data.username # Retourne juste le username pour l'instant
          ```
    - [x] **Sous-tâche 4.4.2 :** Définir l'endpoint `/change-password`.
        - Définissez l'endpoint `PUT /change-password` qui prend un `ChangePasswordRequest` en body.
        - Ajoutez la dépendance `current_user: str = Depends(get_current_user)` à la signature de la fonction de l'endpoint.
    - [x] **Sous-tâche 4.4.3 :** Implémenter la logique métier.
        - Récupérez l'utilisateur correspondant au `current_user` (username extrait du token).
        - Mettez à jour le champ `encrypted_private_key` de l'utilisateur avec la nouvelle valeur fournie dans la requête (après décodage Base64/Hex si nécessaire).
        - Commitez les changements dans la base de données.
        - Retournez une réponse de succès.
    - **Vérification :** Une requête PUT vers `/auth/change-password` avec un token valide et les données requises met à jour la clé privée chiffrée dans la base de données. Une requête sans token ou avec un token invalide retourne 401.

---
**Fin du Bloc 04.** Les endpoints backend pour l'inscription, l'authentification par challenge/réponse (avec émission de token) et la mise à jour de la clé privée chiffrée sont implémentés.