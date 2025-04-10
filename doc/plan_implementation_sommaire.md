# Plan d'Implémentation Détaillé - Messagerie Chiffrée E2EE

Ce document présente la vue d'ensemble du plan d'implémentation pour le projet de messagerie chiffrée, basé sur les [Spécifications Techniques Détaillées](./specifications_techniques.md). Chaque bloc logique est détaillé dans un fichier séparé lié ci-dessous.

## Blocs Logiques et Tâches Principales

- [x] **Bloc 01 : [Initialisation du Projet et Configuration](./plan_bloc_01_init.md)**
  - [x] Tâche 1.1 : Initialiser la structure des projets Backend et Frontend.
  - [x] Tâche 1.2 : Installer les dépendances principales.
  - [x] Tâche 1.3 : Configurer les outils de développement (linters, formatters).

- [x] **Bloc 02 : [Backend - Modèles de Données et Base](./plan_bloc_02_backend_models.md)**
  - [x] Tâche 2.1 : Définir les modèles de données Pydantic pour l'API.
  - [x] Tâche 2.2 : Définir les modèles SQLAlchemy pour la base de données.
  - [x] Tâche 2.3 : Configurer la connexion à la base de données SQLite et initialiser la structure.

- [x] **Bloc 03 : [Frontend - Initialisation et Utilitaires Crypto](./plan_bloc_03_frontend_init_crypto.md)**
  - [x] Tâche 3.1 : Initialiser le projet Nuxt.js avec TypeScript, TailwindCSS.
  - [x] Tâche 3.2 : Intégrer Shadcn-Vue pour les composants UI.
  - [x] Tâche 3.3 : Implémenter le composable `useCrypto` avec `libsodium-wrappers`.

- [x] **Bloc 04 : [Backend - API Authentification](./plan_bloc_04_backend_auth.md)**
  - [x] Tâche 4.1 : Implémenter l'endpoint `/auth/register`.
  - [x] Tâche 4.2 : Implémenter l'endpoint `/auth/challenge`.
  - [x] Tâche 4.3 : Implémenter l'endpoint `/auth/verify` (avec génération de token).
  - [x] Tâche 4.4 : Implémenter l'endpoint `/auth/change-password`.

- [ ] **Bloc 05 : [Frontend - Authentification Utilisateur](./plan_bloc_05_frontend_auth.md)**
  - [ ] Tâche 5.1 : Créer les pages et composants UI pour l'inscription et la connexion.
  - [ ] Tâche 5.2 : Implémenter la logique d'inscription dans `useAuth` (appel crypto et API).
  - [ ] Tâche 5.3 : Implémenter la logique de connexion dans `useAuth` (KDF, déchiffrement clé, signature challenge, appel API, stockage token/clé privée).
  - [ ] Tâche 5.4 : Implémenter la logique de changement de mot de passe.
  - [ ] Tâche 5.5 : Mettre en place la gestion de l'état d'authentification (Pinia store `auth.ts`).

- [ ] **Bloc 06 : [Backend - API Utilisateurs et Conversations (Base)](./plan_bloc_06_backend_conv_base.md)**
  - [ ] Tâche 6.1 : Implémenter l'endpoint `GET /users/{username}/public_key`.
  - [ ] Tâche 6.2 : Implémenter l'endpoint `POST /conversations`.
  - [ ] Tâche 6.3 : Implémenter l'endpoint `GET /conversations`.

- [ ] **Bloc 07 : [Frontend - Gestion des Conversations (Base)](./plan_bloc_07_frontend_conv_base.md)**
  - [ ] Tâche 7.1 : Créer les composants UI pour lister les conversations et en créer une nouvelle.
  - [ ] Tâche 7.2 : Implémenter la logique de récupération et d'affichage des conversations (`useConversations`, `useApi`).
  - [ ] Tâche 7.3 : Implémenter la logique de création de conversation (sélection participants, récupération PKs, génération SK_Session, chiffrement SK_Session, appel API).
  - [ ] Tâche 7.4 : Mettre en place la gestion de l'état des conversations (Pinia store `conversations.ts`).

- [ ] **Bloc 08 : [Backend - API Messages et WebSockets](./plan_bloc_08_backend_msg_ws.md)**
  - [ ] Tâche 8.1 : Implémenter l'endpoint `POST /messages`.
  - [ ] Tâche 8.2 : Implémenter l'endpoint `GET /conversations/{conv_id}/messages` (avec pagination).
  - [ ] Tâche 8.3 : Mettre en place le serveur WebSocket (`/ws`) avec authentification.
  - [ ] Tâche 8.4 : Implémenter la diffusion des messages via WebSocket.

- [ ] **Bloc 09 : [Frontend - Messagerie et WebSockets](./plan_bloc_09_frontend_msg_ws.md)**
  - [ ] Tâche 9.1 : Créer les composants UI pour afficher les messages et l'input d'envoi.
  - [ ] Tâche 9.2 : Implémenter la logique d'envoi de message (`useMessages`, `useCrypto`, `useApi`).
  - [ ] Tâche 9.3 : Implémenter la connexion WebSocket (`useWebSocket`) et la réception/dispatch des messages.
  - [ ] Tâche 9.4 : Implémenter le déchiffrement et l'affichage des messages reçus (temps réel et historique).
  - [ ] Tâche 9.5 : Mettre en place la gestion de l'état des messages (Pinia store `messages.ts`).

- [ ] **Bloc 10 : [Backend - API Gestion des Participants](./plan_bloc_10_backend_participants.md)**
  - [ ] Tâche 10.1 : Implémenter l'endpoint `POST /conversations/{conv_id}/participants`.
  - [ ] Tâche 10.2 : Implémenter l'endpoint `PUT /conversations/{conv_id}/session_key` pour la rotation de clé.
  - [ ] Tâche 10.3 : Implémenter la diffusion WebSocket pour les événements de participants (ajout, retrait/rotation).

- [ ] **Bloc 11 : [Frontend - Gestion des Participants et Rotation de Clé](./plan_bloc_11_frontend_participants.md)**
  - [ ] Tâche 11.1 : Créer les composants UI pour gérer les participants d'une conversation.
  - [ ] Tâche 11.2 : Implémenter la logique d'ajout de participant (récupération PK, chiffrement SK_Session, appel API).
  - [ ] Tâche 11.3 : Implémenter la logique de retrait de participant (génération nouvelle SK_Session, chiffrement pour restants, appel API).
  - [ ] Tâche 11.4 : Gérer les notifications WebSocket pour les changements de participants et la rotation de clé.

- [ ] **Bloc 12 : [Frontend - Vérification des Clés (Numéros de Sécurité)](./plan_bloc_12_frontend_safety_numbers.md)**
  - [ ] Tâche 12.1 : Implémenter le calcul des numéros de sécurité dans `useCrypto`.
  - [ ] Tâche 12.2 : Créer le composant UI (modal) pour afficher les numéros de sécurité et marquer comme vérifié.
  - [ ] Tâche 12.3 : Gérer l'état "vérifié" et les alertes de changement de clé publique (via WebSocket).

- [ ] **Bloc 13 : [Finalisation, Tests et Documentation](./plan_bloc_13_finalisation.md)**
  - [ ] Tâche 13.1 : Écrire les tests unitaires et d'intégration (Backend et Frontend).
  - [ ] Tâche 13.2 : Effectuer une revue de sécurité du code et des dépendances.
  - [ ] Tâche 13.3 : Peaufiner l'UI/UX et la gestion des erreurs.
  - [ ] Tâche 13.4 : Mettre à jour la documentation (README, commentaires).
