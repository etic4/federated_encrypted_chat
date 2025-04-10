# Plan d'Implémentation - Bloc 01 : Initialisation du Projet et Configuration

**Objectif :** Mettre en place la structure de base des projets backend et frontend, installer les dépendances essentielles et configurer les outils de développement pour assurer une base de travail saine.

**Référence Spécifications :** Section [1.4 Stack Technologique](specifications_techniques.md#14-stack-technologique), Section [3.5 Maintenabilité](specifications_techniques.md#35-maintenabilité).

---

- [x] **Tâche 1.1 : Initialiser la structure des projets Backend et Frontend.**
    - [x] **Sous-tâche 1.1.1 :** Créer la structure de dossiers principale.
        - **Instruction :** Assurez-vous que les dossiers `backend` et `frontend` existent à la racine du projet (`/home/moi/dev/PROJETS/federated_encrypted_chat`). Le dossier `doc` existe déjà.
        - **Vérification :** La structure `/home/moi/dev/PROJETS/federated_encrypted_chat/{backend, frontend, doc}` est présente.
    - [x] **Sous-tâche 1.1.2 :** Initialiser le projet Backend (Python/FastAPI).
        - **Instruction :** Naviguez dans le dossier `backend`. Créez un environnement virtuel Python nommé `venv`. Activez-le. Créez un fichier `main.py` minimal et un dossier `app`.
        - **Exemple `backend/main.py` :**
          ```python
          from fastapi import FastAPI

          app = FastAPI(title="Secure Chat Backend")

          @app.get("/")
          async def read_root():
              return {"message": "Welcome to Secure Chat Backend"}

          # Importer les routeurs ici plus tard
          # from app.api import auth_router, users_router, ...
          # app.include_router(auth_router)
          # app.include_router(users_router)
          # ...
          ```
        - **Structure attendue :** `backend/venv/`, `backend/main.py`, `backend/app/`.
    - [x] **Sous-tâche 1.1.3 :** Initialiser le projet Frontend (Nuxt.js).
        - **Instruction :** Naviguez dans le dossier `frontend`. Utilisez l'outil de création Nuxt (`npx nuxi@latest init .`) pour initialiser un nouveau projet Nuxt 3 avec TypeScript. Acceptez les options par défaut ou configurez selon les besoins (assurez-vous que TypeScript est activé).
        - **Vérification :** La structure de projet Nuxt standard est créée dans `frontend/` (avec `nuxt.config.ts`, `package.json`, `pages/`, `components/`, `composables/`, etc.).

- [x] **Tâche 1.2 : Installer les dépendances principales.**
    - [x] **Sous-tâche 1.2.1 :** Installer les dépendances Backend.
        - **Instruction :** Dans le dossier `backend` (avec l'environnement `venv` activé), installez les dépendances Python principales via pip. Créez un fichier `requirements.txt`.
        - **Commande :**
          ```bash
          pip install fastapi uvicorn[standard] sqlalchemy "pydantic[email]" python-jose[cryptography] passlib[bcrypt] python-multipart websockets alembic asyncpg aiosqlite # Ajout aiosqlite explicitement pour SQLAlchemy async avec SQLite
          pip freeze > requirements.txt
          ```
        - **Note :** `aiosqlite` est ajouté car SQLAlchemy async le nécessite pour SQLite. `asyncpg` est inclus pour faciliter une éventuelle migration future vers PostgreSQL. `python-jose` et `passlib` seront utiles pour les tokens JWT/OAuth2 si besoin.
        - **Vérification :** Les packages sont installés et listés dans `backend/requirements.txt`.
    - [x] **Sous-tâche 1.2.2 :** Installer les dépendances Frontend.
        - **Instruction :** Dans le dossier `frontend`, installez les dépendances npm/yarn/pnpm principales.
        - **Commande (avec npm) :**
          ```bash
          npm install
          npm install pinia @pinia/nuxt # Pour la gestion d'état
          npm install -D @nuxtjs/tailwindcss # Pour Tailwind CSS (si pas déjà fait par nuxi init)
          npm install libsodium-wrappers # Bibliothèque crypto
          # Installer Shadcn-Vue CLI et initialiser (voir Tâche 3.2)
          # npx shadcn-vue@latest init
          ```
        - **Vérification :** Les dépendances sont installées dans `frontend/node_modules` et listées dans `frontend/package.json`.

- [x] **Tâche 1.3 : Configurer les outils de développement (linters, formatters).**
    - [x] **Sous-tâche 1.3.1 :** Configurer les outils Backend (Python).
        - **Instruction :** Installez et configurez `black` pour le formatage et `ruff` pour le linting dans l'environnement `venv`. Ajoutez les configurations (ex: `pyproject.toml`).
        - **Commande :** `pip install black ruff`
        - **Exemple `backend/pyproject.toml` :**
          ```toml
          [tool.black]
          line-length = 88
          target-version = ['py310'] # Ajuster si nécessaire

          [tool.ruff]
          line-length = 88
          select = ["E", "W", "F", "I", "UP", "PL", "PT"] # Exemple de règles
          ignore = []
          # Configuration spécifique pour FastAPI/Pydantic si nécessaire
          # ... autres configurations ruff
          ```
        - **Vérification :** Le fichier `backend/pyproject.toml` est créé et configuré. Les outils fonctionnent (`black .`, `ruff .`).
    - [x] **Sous-tâche 1.3.2 :** Configurer les outils Frontend (TypeScript/Vue).
        - **Instruction :** Assurez-vous que ESLint et Prettier sont configurés (souvent fait par `nuxi init`). Installez les plugins nécessaires (ex: `@nuxtjs/eslint-config-typescript`, `prettier-plugin-tailwindcss`). Configurez les fichiers (`.eslintrc.js`, `.prettierrc.js`).
        - **Exemple Commande :** `npm install -D eslint @nuxtjs/eslint-config-typescript prettier prettier-plugin-tailwindcss eslint-plugin-vue`
        - **Vérification :** Les fichiers de configuration sont présents et fonctionnels. Les commandes `npm run lint` et `npm run format` (ou équivalents définis dans `package.json`) fonctionnent.

---
**Fin du Bloc 01.** La structure de base des projets est prête, les dépendances clés sont installées et les outils de développement sont configurés.