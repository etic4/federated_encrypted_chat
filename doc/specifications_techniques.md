# Spécifications Techniques Détaillées - Messagerie Chiffrée de Bout en Bout

**Version :** 1.0
**Date :** 09 Avril 2025

**Table des Matières**

1.  [Introduction et Contexte du Projet](#1-introduction-et-contexte-du-projet)
    1.1. [Objectif](#11-objectif)
    1.2. [Portée](#12-portée)
    1.3. [Contraintes Clés](#13-contraintes-clés)
    1.4. [Stack Technologique](#14-stack-technologique)
2.  [Exigences Fonctionnelles et Cas d'Utilisation](#2-exigences-fonctionnelles-et-cas-dutilisation)
    2.1. [Gestion des Utilisateurs](#21-gestion-des-utilisateurs)
        2.1.1. [Inscription (Register)](#211-inscription-register)
        2.1.2. [Authentification (Login)](#212-authentification-login)
        2.1.3. [Changement de Mot de Passe](#213-changement-de-mot-de-passe)
    2.2. [Gestion des Conversations](#22-gestion-des-conversations)
        2.2.1. [Création d'une Conversation](#221-création-dune-conversation)
        2.2.2. [Liste des Conversations](#222-liste-des-conversations)
        2.2.3. [Ajout d'un Participant](#223-ajout-dun-participant)
        2.2.4. [Retrait d'un Participant](#224-retrait-dun-participant)
    2.3. [Messagerie](#23-messagerie)
        2.3.1. [Envoi de Message](#231-envoi-de-message)
        2.3.2. [Réception de Message](#232-réception-de-message)
        2.3.3. [Affichage des Messages](#233-affichage-des-messages)
    2.4. [Sécurité et Vérification](#24-sécurité-et-vérification)
        2.4.1. [Vérification des Clés Publiques (Numéros de Sécurité)](#241-vérification-des-clés-publiques-numéros-de-sécurité)
3.  [Exigences Non-Fonctionnelles](#3-exigences-non-fonctionnelles)
    3.1. [Sécurité](#31-sécurité)
    3.2. [Confidentialité](#32-confidentialité)
    3.3. [Performance](#33-performance)
    3.4. [Fiabilité](#34-fiabilité)
    3.5. [Maintenabilité](#35-maintenabilité)
    3.6. [Expérience Utilisateur (UX)](#36-expérience-utilisateur-ux)
4.  [Architecture Système](#4-architecture-système)
    4.1. [Vue d'Ensemble](#41-vue-densemble)
    4.2. [Composant Backend](#42-composant-backend)
        4.2.1. [Rôle et Responsabilités](#421-rôle-et-responsabilités)
        4.2.2. [Technologies](#422-technologies)
        4.2.3. [Structure de la Base de Données](#423-structure-de-la-base-de-données)
        4.2.4. [Composants Logiques](#424-composants-logiques)
    4.3. [Composant Frontend](#43-composant-frontend)
        4.3.1. [Rôle et Responsabilités](#431-rôle-et-responsabilités)
        4.3.2. [Technologies](#432-technologies)
        4.3.3. [Structure Modulaire (Composables/Store)](#433-structure-modulaire-composablesstore)
    4.4. [Diagramme d'Architecture](#44-diagramme-darchitecture)
5.  [Spécifications des Interfaces et APIs](#5-spécifications-des-interfaces-et-apis)
    5.1. [API REST Backend](#51-api-rest-backend)
        5.1.1. [Authentification API](#511-authentification-api)
        5.1.2. [Endpoints `/auth`](#512-endpoints-auth)
        5.1.3. [Endpoints `/users`](#513-endpoints-users)
        5.1.4. [Endpoints `/conversations`](#514-endpoints-conversations)
        5.1.5. [Endpoints `/messages`](#515-endpoints-messages)
    5.2. [Protocole WebSocket](#52-protocole-websocket)
        5.2.1. [Connexion et Authentification](#521-connexion-et-authentification)
        5.2.2. [Messages Serveur -> Client](#522-messages-serveur---client)
6.  [Considérations de Sécurité Détaillées](#6-considérations-de-sécurité-détaillées)
    6.1. [Cryptographie](#61-cryptographie)
        6.1.1. [Algorithmes et Paramètres](#611-algorithmes-et-paramètres)
        6.1.2. [Gestion des Clés d'Identité (Long Terme)](#612-gestion-des-clés-didentité-long-terme)
        6.1.3. [Gestion des Clés de Session (Court Terme)](#613-gestion-des-clés-de-session-court-terme)
        6.1.4. [Authentification Utilisateur](#614-authentification-utilisateur)
        6.1.5. [Chiffrement des Messages](#615-chiffrement-des-messages)
        6.1.6. [Vérification de l'Authenticité des Clés Publiques](#616-vérification-de-lauthenticité-des-clés-publiques)
        6.1.7. [Limitations Cryptographiques Connues](#617-limitations-cryptographiques-connues)
    6.2. [Sécurité Côté Client](#62-sécurité-côté-client)
    6.3. [Sécurité Côté Serveur](#63-sécurité-côté-serveur)
    6.4. [Sécurité du Transport](#64-sécurité-du-transport)
7.  [Plan de Déploiement et de Maintenance (Esquisse)](#7-plan-de-déploiement-et-de-maintenance-esquisse)
    7.1. [Déploiement Initial](#71-déploiement-initial)
    7.2. [Maintenance et Mises à Jour](#72-maintenance-et-mises-à-jour)
8.  [Glossaire des Termes Techniques](#8-glossaire-des-termes-techniques)

---

## 1. Introduction et Contexte du Projet

### 1.1. Objectif

Le projet vise à développer une application de messagerie instantanée sécurisée offrant un chiffrement de bout en bout (E2EE) pour toutes les communications entre utilisateurs. L'objectif principal est de garantir la confidentialité et l'intégrité des messages échangés, de sorte que seul l'expéditeur et les destinataires prévus puissent lire le contenu des messages. Le serveur central ne doit jamais avoir accès au contenu en clair des messages ou aux clés privées des utilisateurs.

### 1.2. Portée

L'application permettra aux utilisateurs de :
*   S'inscrire et se connecter de manière sécurisée.
*   Créer des conversations individuelles ou de groupe.
*   Envoyer et recevoir des messages texte chiffrés de bout en bout.
*   Gérer les participants d'une conversation (ajout/retrait).
*   Vérifier l'authenticité des clés publiques de leurs contacts via un mécanisme hors bande.

La version initiale se concentrera sur ces fonctionnalités de base. La fédération n'est pas incluse dans la portée de cette version.

### 1.3. Contraintes Clés

*   **Chiffrement de Bout-en-Bout Impératif :** Toutes les opérations de chiffrement/déchiffrement des messages et la gestion des clés privées doivent s'effectuer exclusivement côté client.
*   **Aucun Stockage Persistant Côté Client :** L'application ne doit pas utiliser `LocalStorage` ou `IndexedDB` pour stocker des informations sensibles de manière persistante. Le stockage en mémoire volatile est préféré pour les clés déchiffrées.
*   **Gestion des Clés Liée au Mot de Passe (via Chiffrement) :** La clé privée de l'utilisateur, bien que générée aléatoirement, doit être accessible uniquement après dérivation d'une clé de chiffrement à partir du mot de passe utilisateur via une KDF robuste. La clé privée *chiffrée* sera stockée sur le serveur.

### 1.4. Stack Technologique

*   **Backend :** Python 3.x, FastAPI, SQLAlchemy (ou autre ORM async compatible SQLite), SQLite, Uvicorn/Hypercorn.
*   **Frontend :** Nuxt.js 3 (basé sur Vue.js 3), TypeScript, Shadcn-Vue (pour les composants UI), TailwindCSS.
*   **Cryptographie (Frontend) :** `libsodium-wrappers` (compilée en WebAssembly).
*   **Communication Temps Réel :** WebSockets (gérés par FastAPI).

## 2. Exigences Fonctionnelles et Cas d'Utilisation

### 2.1. Gestion des Utilisateurs

#### 2.1.1. Inscription (Register)

*   **Description :** Permet à un nouvel utilisateur de créer un compte.
*   **Acteurs :** Nouvel Utilisateur.
*   **Préconditions :** L'utilisateur n'a pas de compte.
*   **Flux Nominal :**
    1.  L'utilisateur fournit un nom d'utilisateur (`username`) et un mot de passe (`password`).
    2.  Le **client** vérifie la disponibilité du `username` (optionnel, peut être géré par le serveur).
    3.  Le **client** génère une paire de clés cryptographiques asymétriques (Publique/Privée) aléatoirement (ex: Ed25519/Curve25519).
    4.  Le **client** génère un sel cryptographique (`kdf_salt`) unique pour cet utilisateur.
    5.  Le **client** dérive une clé de chiffrement (`keyK`) à partir du `password` et du `kdf_salt` en utilisant Argon2id avec des paramètres de coût prédéfinis (`kdf_params`).
    6.  Le **client** chiffre la clé privée générée à l'étape 3 avec `keyK` en utilisant AES-GCM (`encrypted_private_key`).
    7.  Le **client** envoie au serveur (`/auth/register`) : `{ username, publicKey, encryptedPrivateKey, kdfSalt, kdfParams }`.
    8.  Le **serveur** valide les données (unicité `username`), stocke les informations dans la base de données (`users` table).
    9.  Le **serveur** retourne un succès.
    10. Le **client** informe l'utilisateur du succès et le redirige vers la page de connexion.
*   **Flux Alternatifs :**
    *   Username déjà pris : Le serveur retourne une erreur, le client informe l'utilisateur.
    *   Erreur serveur : Le serveur retourne une erreur 5xx, le client informe l'utilisateur.
    *   Erreur de chiffrement client : Le client affiche une erreur locale.

#### 2.1.2. Authentification (Login)

*   **Description :** Permet à un utilisateur existant de se connecter. Utilise un mécanisme de challenge-réponse.
*   **Acteurs :** Utilisateur enregistré.
*   **Préconditions :** L'utilisateur a un compte.
*   **Flux Nominal :**
    1.  L'utilisateur fournit `username` et `password`.
    2.  Le **client** envoie une requête au serveur (`/auth/challenge`) avec `{ username }`.
    3.  Le **serveur** récupère les informations de l'utilisateur (`publicKey`, `encryptedPrivateKey`, `kdfSalt`, `kdfParams`).
    4.  Le **serveur** génère un challenge cryptographiquement aléatoire (chaîne de bytes).
    5.  Le **serveur** retourne au client : `{ challenge, publicKey, encryptedPrivateKey, kdfSalt, kdfParams }`.
    6.  Le **client** dérive `keyK` à partir du `password` fourni, `kdfSalt` et `kdfParams` reçus (Argon2id).
    7.  Le **client** tente de déchiffrer `encryptedPrivateKey` avec `keyK` (AES-GCM).
        *   **Si échec :** Le mot de passe est incorrect. Afficher une erreur à l'utilisateur et arrêter.
        *   **Si succès :** Le mot de passe est correct. La clé privée (`privateKey`) est obtenue.
    8.  Le **client** stocke `privateKey` en mémoire volatile (variable JS non exportée).
    9.  Le **client** signe le `challenge` reçu avec la `privateKey` déchiffrée (ex: Ed25519).
    10. Le **client** envoie au serveur (`/auth/verify`) : `{ username, challenge, signature }`.
    11. Le **serveur** récupère la `publicKey` de l'utilisateur.
    12. Le **serveur** vérifie la `signature` du `challenge` avec la `publicKey`.
        *   **Si invalide :** Retourner une erreur d'authentification.
        *   **Si valide :** Authentification réussie.
    13. Le **serveur** génère un token d'authentification (ex: JWT ou token de session opaque) et le retourne au client.
    14. Le **client** stocke le token en mémoire pour les requêtes API suivantes.
    15. Le **client** établit la connexion WebSocket authentifiée.
    16. Le **client** redirige l'utilisateur vers l'interface principale de chat.
*   **Flux Alternatifs :**
    *   Username inconnu : Le serveur retourne une erreur 404.
    *   Mot de passe incorrect (détecté à l'étape 7) : Le client affiche une erreur.
    *   Signature invalide (détecté à l'étape 12) : Le serveur retourne une erreur 401/403.
    *   Erreur serveur : Le serveur retourne une erreur 5xx.

#### 2.1.3. Changement de Mot de Passe

*   **Description :** Permet à un utilisateur connecté de changer son mot de passe.
*   **Acteurs :** Utilisateur connecté.
*   **Préconditions :** L'utilisateur est connecté et connaît son ancien mot de passe.
*   **Flux Nominal :**
    1.  L'utilisateur fournit son ancien mot de passe (`oldPassword`) et son nouveau mot de passe (`newPassword`).
    2.  Le **client** utilise `oldPassword`, `kdfSalt` et `kdfParams` (récupérés au login ou via une nouvelle requête) pour dériver `oldKeyK`.
    3.  Le **client** déchiffre `encryptedPrivateKey` (récupérée au login) avec `oldKeyK` pour obtenir `privateKey`.
        *   **Si échec :** Ancien mot de passe incorrect. Afficher une erreur.
    4.  Le **client** dérive `newKeyK` à partir de `newPassword`, `kdfSalt` et `kdfParams`.
    5.  Le **client** rechiffre `privateKey` avec `newKeyK` pour obtenir `newEncryptedPrivateKey`.
    6.  Le **client** envoie au serveur (endpoint à définir, ex: `/auth/change-password`) : `{ newEncryptedPrivateKey }`.
    7.  Le **serveur** met à jour `encrypted_private_key` pour l'utilisateur dans la base de données.
    8.  Le **serveur** retourne un succès.
    9.  Le **client** informe l'utilisateur du succès. La clé privée en mémoire reste valide.
*   **Flux Alternatifs :**
    *   Ancien mot de passe incorrect (étape 3) : Le client affiche une erreur.
    *   Erreur serveur : Le serveur retourne une erreur.

### 2.2. Gestion des Conversations

#### 2.2.1. Création d'une Conversation

*   **Description :** Permet à un utilisateur de démarrer une nouvelle conversation avec un ou plusieurs autres utilisateurs.
*   **Acteurs :** Utilisateur connecté.
*   **Préconditions :** L'utilisateur est connecté. Les identifiants des participants souhaités sont connus.
*   **Flux Nominal :**
    1.  L'utilisateur (Alice) sélectionne les participants (ex: Bob, Charlie).
    2.  Le **client** (Alice) génère une clé de session symétrique aléatoire (`SK_Session`, AES-256).
    3.  Le **client** (Alice) récupère les clés publiques des participants (Alice, Bob, Charlie) via l'API (`/users/{username}/public_key`).
    4.  Le **client** (Alice) chiffre `SK_Session` avec la clé publique de chaque participant :
        *   `EncSK_Alice = EncryptAsymmetric(PK_A, SK_Session)`
        *   `EncSK_Bob = EncryptAsymmetric(PK_B, SK_Session)`
        *   `EncSK_Charlie = EncryptAsymmetric(PK_C, SK_Session)`
    5.  Le **client** (Alice) envoie au serveur (`/conversations`) : `{ participants: ["Alice", "Bob", "Charlie"], encryptedKeys: {"Alice": EncSK_Alice, "Bob": EncSK_Bob, "Charlie": EncSK_Charlie} }`.
    6.  Le **serveur** crée une nouvelle entrée dans `conversations`.
    7.  Le **serveur** crée des entrées dans `participants` pour Alice, Bob et Charlie, en stockant leur `encrypted_session_key` respective.
    8.  Le **serveur** retourne l'ID de la nouvelle conversation (`conversation_id`) et les détails.
    9.  Le **serveur** notifie Bob et Charlie via WebSocket (s'ils sont connectés) de la nouvelle conversation.
    10. Le **client** (Alice) stocke `SK_Session` en mémoire, associée à `conversation_id`.
    11. Le **client** (Alice) affiche la nouvelle conversation dans l'interface.
*   **Flux Alternatifs :**
    *   Utilisateur participant inconnu : Le serveur retourne une erreur.
    *   Erreur serveur : Le serveur retourne une erreur.

#### 2.2.2. Liste des Conversations

*   **Description :** Affiche les conversations auxquelles l'utilisateur participe.
*   **Acteurs :** Utilisateur connecté.
*   **Préconditions :** L'utilisateur est connecté.
*   **Flux Nominal :**
    1.  Le **client** envoie une requête au serveur (`/conversations`).
    2.  Le **serveur** récupère toutes les `conversation_id` où l'utilisateur est listé dans la table `participants`.
    3.  Le **serveur** retourne une liste d'informations sur les conversations (ID, participants, dernier message (optionnel), etc.).
    4.  Le **client** affiche la liste.

#### 2.2.3. Ajout d'un Participant

*   **Description :** Permet à un membre existant d'ajouter un nouvel utilisateur à une conversation.
*   **Acteurs :** Membre existant de la conversation.
*   **Préconditions :** L'utilisateur est connecté et membre de la conversation. L'utilisateur à ajouter existe.
*   **Flux Nominal :**
    1.  L'utilisateur (Alice) choisit d'ajouter un nouvel utilisateur (David) à une conversation existante (`conv_id`).
    2.  Le **client** (Alice) récupère la clé de session actuelle (`SK_Session`) de la conversation depuis sa mémoire.
    3.  Le **client** (Alice) récupère la clé publique de David (`PK_D`) via l'API.
    4.  Le **client** (Alice) chiffre `SK_Session` avec `PK_D` : `EncSK_David = EncryptAsymmetric(PK_D, SK_Session)`.
    5.  Le **client** (Alice) envoie au serveur (`/conversations/{conv_id}/participants`) : `{ userId: "David", encryptedSessionKey: EncSK_David }`.
    6.  Le **serveur** ajoute David à la table `participants` pour `conv_id` avec sa `EncSK_David`.
    7.  Le **serveur** retourne un succès.
    8.  Le **serveur** notifie tous les participants (y compris David) via WebSocket de l'ajout.
*   **Flux Alternatifs :**
    *   Utilisateur non membre de la conversation : Erreur 403.
    *   Utilisateur à ajouter inconnu : Erreur 404.
    *   Erreur serveur : Erreur 5xx.

#### 2.2.4. Retrait d'un Participant

*   **Description :** Permet à un membre (ou admin) de retirer un utilisateur d'une conversation. **Nécessite un changement de clé de session.**
*   **Acteurs :** Membre existant (avec droits suffisants, non défini ici).
*   **Préconditions :** L'utilisateur est connecté et membre. L'utilisateur à retirer est membre.
*   **Flux Nominal (initié par Alice pour retirer Bob d'une conversation avec Charlie) :**
    1.  Alice initie le retrait de Bob de `conv_id`.
    2.  **Action Client (Alice) :**
        a.  Génère une **nouvelle** clé de session : `SK_Session_New`.
        b.  Récupère les clés publiques des membres *restants* (Alice `PK_A`, Charlie `PK_C`).
        c.  Chiffre `SK_Session_New` pour chaque membre restant :
            *   `EncSK_Alice_New = EncryptAsymmetric(PK_A, SK_Session_New)`
            *   `EncSK_Charlie_New = EncryptAsymmetric(PK_C, SK_Session_New)`
        d.  Envoie une requête au serveur (`/conversations/{conv_id}/session_key` ou endpoint dédié) : `{ participants: ["Alice", "Charlie"], newEncryptedKeys: {"Alice": EncSK_Alice_New, "Charlie": EncSK_Charlie_New} }`.
    3.  **Action Serveur :**
        a.  Vérifie les droits d'Alice.
        b.  Met à jour les entrées dans `participants` pour Alice et Charlie avec leurs `newEncryptedKeys`.
        c.  Supprime l'entrée de Bob dans `participants` pour `conv_id`.
        d.  Retourne un succès.
        e.  Notifie Alice et Charlie (via WebSocket) du changement de clé et du retrait de Bob. Bob est également notifié qu'il a été retiré.
    4.  **Action Client (Alice & Charlie) :**
        a.  À la réception de la notification, récupèrent leur nouvelle clé chiffrée si nécessaire (ou utilisent celle fournie dans la notif).
        b.  Déchiffrent `SK_Session_New` avec leur clé privée respective.
        c.  Remplacent l'ancienne `SK_Session` par `SK_Session_New` en mémoire pour cette conversation.
*   **Flux Alternatifs :**
    *   Droits insuffisants : Erreur 403.
    *   Erreur serveur : Erreur 5xx.

### 2.3. Messagerie

#### 2.3.1. Envoi de Message

*   **Description :** Envoie un message texte dans une conversation.
*   **Acteurs :** Membre de la conversation.
*   **Préconditions :** Utilisateur connecté, membre de la conversation, clé de session (`SK_Session`) chargée en mémoire.
*   **Flux Nominal :**
    1.  L'utilisateur (Alice) tape un message (`Plaintext`) dans l'interface de `conv_id`.
    2.  Le **client** (Alice) récupère `SK_Session` pour `conv_id`.
    3.  Le **client** (Alice) génère un nonce unique (`Nonce`) pour ce message (ex: 12 ou 16 bytes aléatoires).
    4.  Le **client** (Alice) définit les données associées (`AssociatedData`, ex: `{ convId: "...", senderId: "Alice", timestamp: ... }`).
    5.  Le **client** (Alice) chiffre le message avec AES-GCM : `Ciphertext, AuthTag = AES_GCM_Encrypt(SK_Session, Nonce, Plaintext, AssociatedData)`.
    6.  Le **client** (Alice) envoie au serveur (`/messages`) : `{ conversationId: conv_id, nonce, ciphertext, authTag, associatedData }`.
    7.  Le **serveur** valide l'appartenance de l'expéditeur à la conversation.
    8.  Le **serveur** stocke le message chiffré dans la table `messages`.
    9.  Le **serveur** retourne un succès (avec l'ID du message).
    10. Le **serveur** diffuse le message chiffré (payload de l'étape 6 + ID message + sender ID) via WebSocket à tous les participants *actuels* de la conversation.
    11. Le **client** (Alice) affiche le message comme envoyé dans l'interface.
*   **Flux Alternatifs :**
    *   Utilisateur non membre : Erreur 403.
    *   Erreur serveur : Erreur 5xx.

#### 2.3.2. Réception de Message

*   **Description :** Reçoit et déchiffre un message entrant.
*   **Acteurs :** Membre de la conversation.
*   **Préconditions :** Utilisateur connecté, connexion WebSocket établie, clé de session (`SK_Session`) chargée en mémoire pour la conversation concernée.
*   **Flux Nominal :**
    1.  Le **client** (Bob) reçoit un message via WebSocket : `{ type: "newMessage", data: { messageId, conversationId, senderId, nonce, ciphertext, authTag, associatedData, timestamp } }`.
    2.  Le **client** (Bob) récupère la `SK_Session` correspondante à `conversationId`.
    3.  Le **client** (Bob) tente de déchiffrer le message avec AES-GCM : `Plaintext = AES_GCM_Decrypt(SK_Session, nonce, ciphertext, authTag, associatedData)`.
        *   **Si échec (AuthTag invalide) :** Le message est corrompu ou falsifié. Le client doit l'ignorer ou l'afficher avec un avertissement clair. Ne pas traiter le contenu.
        *   **Si succès :** Le `Plaintext` est obtenu.
    4.  Le **client** (Bob) affiche le `Plaintext` dans l'interface de la conversation, associé à `senderId` et `timestamp`.
*   **Flux Alternatifs :**
    *   Clé de session inconnue (l'utilisateur vient de rejoindre ?) : Le client doit récupérer la clé chiffrée via API et la déchiffrer.
    *   Échec du déchiffrement : Afficher une erreur ou ignorer.

#### 2.3.3. Affichage des Messages

*   **Description :** Affiche l'historique des messages d'une conversation.
*   **Acteurs :** Membre de la conversation.
*   **Préconditions :** Utilisateur connecté, conversation sélectionnée, clé de session (`SK_Session`) chargée.
*   **Flux Nominal :**
    1.  L'utilisateur sélectionne une conversation.
    2.  Le **client** envoie une requête au serveur (`/conversations/{conv_id}/messages`, potentiellement avec pagination).
    3.  Le **serveur** retourne une liste de messages chiffrés (Nonce, Ciphertext, AuthTag, AssociatedData, SenderId, Timestamp).
    4.  Le **client** récupère `SK_Session`.
    5.  Pour chaque message reçu :
        a.  Tente de déchiffrer avec `SK_Session`.
        b.  Si succès, affiche le message en clair.
        c.  Si échec, affiche une erreur pour ce message.
    6.  Les nouveaux messages arrivant via WebSocket sont ajoutés à la vue.

### 2.4. Sécurité et Vérification

#### 2.4.1. Vérification des Clés Publiques (Numéros de Sécurité)

*   **Description :** Permet aux utilisateurs de vérifier hors bande l'authenticité de la clé publique de leur contact pour prévenir les attaques MitM.
*   **Acteurs :** Utilisateurs d'une conversation.
*   **Préconditions :** Utilisateurs connectés, dans une conversation commune.
*   **Flux Nominal (Alice vérifie avec Bob) :**
    1.  Alice et Bob ouvrent les détails de leur conversation dans l'application.
    2.  Le **client** (Alice) récupère sa clé publique (`PK_A`) et celle de Bob (`PK_B`).
    3.  Le **client** (Alice) calcule le numéro de sécurité :
        a.  Concatène les identifiants et clés dans un ordre défini : `ID_A || PK_A || ID_B || PK_B`.
        b.  Hashe la concaténation (SHA-512).
        c.  Prend une partie du hash (ex: 256 bits).
        d.  Formate ces bits en une chaîne de chiffres lisible (ex: 12 groupes de 5 chiffres).
    4.  Le **client** (Alice) affiche ce numéro de sécurité.
    5.  Le **client** (Bob) effectue les mêmes étapes 2-4 de son côté et affiche son numéro calculé.
    6.  Alice et Bob utilisent un canal **hors bande** (téléphone, en personne) pour comparer les numéros affichés.
    7.  **Si les numéros correspondent :**
        a.  Alice marque la conversation comme "vérifiée" dans son application.
        b.  Bob marque la conversation comme "vérifiée" dans son application.
        c.  Le **client** stocke cet état "vérifié" en mémoire, associé à la paire de clés publiques utilisée pour le calcul.
    8.  **Si les numéros diffèrent :** Une attaque MitM est possible. Les utilisateurs ne doivent pas faire confiance à la connexion et ne pas marquer comme vérifié.
*   **Gestion des Changements de Clé :**
    1.  Si le **serveur** signale (via API ou WebSocket) qu'une clé publique d'un participant a changé.
    2.  Le **client** doit invalider l'état "vérifié" de la conversation.
    3.  Le **client** doit afficher un avertissement clair à l'utilisateur.
    4.  Le **client** doit recalculer et afficher le nouveau numéro de sécurité, invitant à une nouvelle vérification.

## 3. Exigences Non-Fonctionnelles

### 3.1. Sécurité

*   **Chiffrement de Bout-en-Bout :** Strictement appliqué comme décrit dans l'architecture et les protocoles.
*   **Protection contre MitM :** Mécanisme de vérification par numéros de sécurité implémenté.
*   **Protection des Clés Privées :** Chiffrées au repos (sur serveur) avec une clé dérivée d'un mot de passe robuste via Argon2id. Jamais stockées en clair côté serveur. Uniquement en mémoire volatile côté client après login réussi.
*   **Authentification Forte :** Challenge-réponse basé sur signature asymétrique.
*   **Intégrité et Authenticité des Messages :** Assurées par AES-GCM (AEAD).
*   **Protection contre Brute-Force (Mot de passe) :** Utilisation d'Argon2id (KDF lente) côté client pour le déchiffrement de la clé privée. Le serveur peut implémenter un rate-limiting sur les tentatives de `/auth/challenge`.
*   **Sécurité du Transport :** HTTPS obligatoire pour l'API REST, WSS (TLS) obligatoire pour les WebSockets.
*   **Sécurité Dépendances :** Audit régulier des bibliothèques (crypto, backend, frontend).

### 3.2. Confidentialité

*   Le contenu des messages n'est accessible qu'aux participants de la conversation.
*   Le serveur n'a pas accès au contenu des messages en clair ni aux clés privées.
*   Les métadonnées (qui parle à qui, quand) sont visibles par le serveur et doivent être considérées comme non confidentielles vis-à-vis du serveur.

### 3.3. Performance

*   **Réactivité UI :** L'interface utilisateur doit rester fluide, même pendant les opérations cryptographiques. Utilisation de Web Workers pour les opérations longues (KDF, génération de clé) si nécessaire.
*   **Temps de Login :** Le calcul de la KDF (Argon2id) au login doit être acceptable (quelques centaines de ms à ~2s max). Les paramètres de coût doivent être équilibrés.
*   **Latence des Messages :** La livraison des messages via WebSocket doit être rapide. Le chiffrement/déchiffrement symétrique (AES-GCM) est très rapide.
*   **Scalabilité (Backend) :** Bien que SQLite soit choisi initialement, l'architecture doit permettre une migration future vers PostgreSQL si le nombre d'utilisateurs/messages augmente significativement. L'utilisation d'un ORM facilite cela. FastAPI est nativement performant et asynchrone.

### 3.4. Fiabilité

*   Livraison garantie des messages (dans des conditions réseau normales).
*   Gestion correcte des erreurs (réseau, serveur, crypto).
*   Persistance correcte des données chiffrées sur le serveur.

### 3.5. Maintenabilité

*   **Code Modulaire :** Frontend organisé en composables/stores. Backend organisé en routeurs/services.
*   **Code Typé :** Utilisation de TypeScript (Frontend) et des type hints Python (Backend).
*   **Tests :** Stratégie de tests unitaires (notamment pour la logique crypto et API) et d'intégration à définir.
*   **Documentation :** Code commenté, ce document de spécifications.

### 3.6. Expérience Utilisateur (UX)

*   Interface claire et intuitive (utilisation de Shadcn-Vue).
*   Feedback clair sur les opérations (envoi, réception, erreurs, vérification sécurité).
*   Processus de vérification des numéros de sécurité expliqué simplement.
*   Gestion transparente (mais signalée) des changements de clés des contacts.

## 4. Architecture Système

### 4.1. Vue d'Ensemble

L'application suit une architecture client-serveur classique, avec une séparation stricte des responsabilités cryptographiques :
*   **Client (Frontend Nuxt/Vue) :** Responsable de l'interface utilisateur, de la gestion de l'état local, et de toutes les opérations cryptographiques (génération/gestion des clés, chiffrement/déchiffrement).
*   **Serveur (Backend FastAPI) :** Responsable du stockage des données (utilisateurs, messages chiffrés, clés chiffrées), de la gestion des connexions, de la distribution des messages chiffrés et des clés publiques, et de l'authentification initiale. Agit comme un relais et un stockage sécurisé mais "aveugle" au contenu.

### 4.2. Composant Backend

#### 4.2.1. Rôle et Responsabilités

*   Stocker les informations utilisateur (clé publique, clé privée chiffrée, sel KDF).
*   Stocker les métadonnées des conversations et participants (avec clés de session chiffrées).
*   Stocker les messages chiffrés.
*   Gérer l'API REST pour les opérations CRUD et l'authentification.
*   Gérer les connexions WebSocket pour la communication temps réel.
*   Valider l'authentification et les autorisations de base (ex: appartenance à une conversation).
*   **Ne pas** effectuer de déchiffrement ou d'accès aux clés privées/session en clair.

#### 4.2.2. Technologies

*   Langage : Python 3.x
*   Framework : FastAPI
*   Base de Données : SQLite (initialement)
*   ORM : SQLAlchemy en mode async
*   Serveur ASGI : Uvicorn avec uvloop
*   WebSockets : Support natif de FastAPI

#### 4.2.3. Structure de la Base de Données

*   **`users`**:
    *   `id` (Integer, Primary Key, AutoIncrement)
    *   `username` (String, Unique, Not Null)
    *   `public_key` (Text ou Blob, Not Null) - Encodage Base64 ou Hex.
    *   `encrypted_private_key` (Text ou Blob, Not Null) - Encodage Base64 ou Hex.
    *   `kdf_salt` (Text ou Blob, Not Null) - Encodage Base64 ou Hex.
    *   `kdf_params` (JSON as Text ou Text, Not Null) - Stocke les paramètres Argon2id (memoryCost, timeCost, parallelism).
*   **`conversations`**:
    *   `id` (Integer, Primary Key, AutoIncrement)
    *   `created_at` (DateTime, Not Null, Default: NOW)
*   **`participants`**:
    *   `id` (Integer, Primary Key, AutoIncrement)
    *   `conversation_id` (Integer, ForeignKey(`conversations.id`), Not Null)
    *   `user_id` (Integer, ForeignKey(`users.id`), Not Null)
    *   `encrypted_session_key` (Text ou Blob, Not Null) - Encodage Base64 ou Hex.
    *   `joined_at` (DateTime, Not Null, Default: NOW)
    *   *Index Unique sur (`conversation_id`, `user_id`)*
*   **`messages`**:
    *   `id` (Integer, Primary Key, AutoIncrement)
    *   `conversation_id` (Integer, ForeignKey(`conversations.id`), Not Null)
    *   `sender_id` (Integer, ForeignKey(`users.id`), Not Null)
    *   `timestamp` (DateTime, Not Null, Default: NOW)
    *   `nonce` (Text ou Blob, Not Null) - Encodage Base64 ou Hex.
    *   `ciphertext` (Text ou Blob, Not Null) - Encodage Base64 ou Hex.
    *   `auth_tag` (Text ou Blob, Not Null) - Encodage Base64 ou Hex.
    *   `associated_data` (JSON as Text ou Text, Nullable)
    *   *Index sur (`conversation_id`, `timestamp`)*

#### 4.2.4. Composants Logiques

*   **Routeurs API (FastAPI Routers) :** Définissent les endpoints REST (`/auth`, `/users`, `/conversations`, `/messages`).
*   **Modèles de Données (Pydantic) :** Définissent la structure des données pour l'API et l'ORM.
*   **Logique Métier / Services :** Fonctions gérant la logique applicative (création user, vérification challenge, stockage message).
*   **Gestionnaire WebSocket :** Classe ou fonctions gérant les connexions, l'authentification WS, et la diffusion des messages.
*   **Accès Base de Données (ORM) :** Couche d'abstraction pour interagir avec SQLite.

### 4.3. Composant Frontend

#### 4.3.1. Rôle et Responsabilités

*   Afficher l'interface utilisateur.
*   Gérer les interactions utilisateur.
*   Gérer l'état de l'application (utilisateur connecté, conversations, messages).
*   Effectuer **toutes** les opérations cryptographiques :
    *   Génération de clés (identité, session).
    *   Dérivation de clé depuis mot de passe (KDF).
    *   Chiffrement/déchiffrement de la clé privée locale.
    *   Chiffrement/déchiffrement des clés de session pour distribution.
    *   Chiffrement/déchiffrement des messages.
    *   Signature et vérification.
    *   Calcul des numéros de sécurité.
*   Communiquer avec l'API Backend (REST).
*   Gérer la connexion WebSocket pour les messages temps réel.

#### 4.3.2. Technologies

*   Framework : Nuxt.js 3
*   Langage : TypeScript
*   Bibliothèque UI : Vue.js 3 (via Nuxt)
*   Composants UI : Shadcn-Vue
*   Styling : TailwindCSS
*   Gestion d'état : Pinia (recommandé avec Nuxt 3)
*   Cryptographie : `libsodium-wrappers`.
*   Appels HTTP : `fetch` (via `$fetch` de Nuxt).

#### 4.3.3. Structure Modulaire (Composables/Store)

*   **`composables/useCrypto.ts` :** Centralise toutes les fonctions cryptographiques. Ne contient pas d'état persistant (les clés sont passées en argument ou retournées).
*   **`composables/useAuth.ts` :** Gère le cycle de vie de l'authentification, stocke le token et l'état connecté (potentiellement via Pinia). Interagit avec `useCrypto` et `useApi`.
*   **`composables/useApi.ts` :** Wrapper pour les appels API, gère l'ajout du token d'authentification.
*   **`composables/useWebSocket.ts` :** Gère la connexion WS, l'authentification et le dispatch des messages reçus vers les stores/autres composables.
*   **`composables/useConversations.ts` :** Logique de gestion des conversations (création, ajout/retrait membres).
*   **`composables/useMessages.ts` :** Logique d'envoi/réception/déchiffrement des messages.
*   **`store/auth.ts` (Pinia) :** Stocke l'état de l'utilisateur connecté, le token, la clé privée déchiffrée (en mémoire !), le sel, les params KDF.
*   **`store/conversations.ts` (Pinia) :** Stocke la liste des conversations, les participants, et les clés de session déchiffrées (en mémoire !), associées par `conversation_id`.
*   **`store/messages.ts` (Pinia) :** Stocke les messages déchiffrés par conversation.
*   **`pages/` :** Structure des routes de l'application (`login.vue`, `register.vue`, `chat/[id].vue`, etc.).
*   **`components/` :** Composants UI réutilisables (liste de conversations, vue des messages, input, modal de sécurité, etc.).

### 4.4. Diagramme d'Architecture

```mermaid
graph TD
    subgraph Navigateur (Client)
        direction TB
        F_UI[UI Vue/Nuxt<br>(Pages, Shadcn Comp.)]
        F_State[État (Pinia Store)<br>Auth, Convs(Keys!), Msgs]
        F_Composables[Composables<br>useAuth, useCrypto, useApi, useWS, ...]
        F_CryptoLib[Bibliothèque Crypto<br>SubtleCrypto / Libsodium]
    end

    subgraph Serveur (Backend)
        direction TB
        B_API[API FastAPI<br>(Routeurs)]
        B_WS[Serveur WebSocket]
        B_Logic[Logique Métier/CRUD<br>Auth Check, DB Ops]
        B_DB[Base de Données SQLite<br>(Encrypted Data)]
    end

    F_UI -- Interagit --> F_State
    F_UI -- Appelle --> F_Composables

    F_Composables -- Lit/Écrit --> F_State
    F_Composables -- Utilise --> F_CryptoLib
    F_Composables -- Appelle API (HTTPS) --> B_API
    F_Composables -- Connecte/Échange (WSS) --> B_WS

    B_API -- Valide/Route --> B_Logic
    B_WS -- Reçoit/Diffuse --> B_Logic
    B_Logic -- Accède --> B_DB
    B_Logic -- Notifie --> B_WS

    style Navigateur fill:#f9f,stroke:#333,stroke-width:2px
    style Serveur fill:#ccf,stroke:#333,stroke-width:2px
```

## 5. Spécifications des Interfaces et APIs

### 5.1. API REST Backend

Toutes les requêtes doivent être faites via HTTPS. Les payloads sont en JSON.

#### 5.1.1. Authentification API

Les endpoints protégés nécessitent un token d'authentification (obtenu via `/auth/verify`) passé dans l'en-tête `Authorization: Bearer <token>`.

#### 5.1.2. Endpoints `/auth`

*   **`POST /auth/register`**
    *   **Request Body :** `{ username: string, publicKey: string, encryptedPrivateKey: string, kdfSalt: string, kdfParams: object }` (clés/sel/clé chiffrée encodés en Base64 ou Hex)
    *   **Response (201 Created) :** `{ message: "User created successfully" }`
    *   **Response (409 Conflict) :** `{ detail: "Username already exists" }`
    *   **Response (422 Unprocessable Entity) :** Validation Pydantic échouée.
*   **`POST /auth/challenge`**
    *   **Request Body :** `{ username: string }`
    *   **Response (200 OK) :** `{ challenge: string, publicKey: string, encryptedPrivateKey: string, kdfSalt: string, kdfParams: object }` (challenge et autres données binaires encodées)
    *   **Response (404 Not Found) :** `{ detail: "User not found" }`
*   **`POST /auth/verify`**
    *   **Request Body :** `{ username: string, challenge: string, signature: string }` (challenge/signature encodés)
    *   **Response (200 OK) :** `{ accessToken: string, tokenType: "bearer" }`
    *   **Response (401 Unauthorized) :** `{ detail: "Invalid signature or challenge" }`
    *   **Response (404 Not Found) :** `{ detail: "User not found" }`
*   **`PUT /auth/change-password`** (Authentifié)
    *   **Request Body :** `{ newEncryptedPrivateKey: string }` (encodé)
    *   **Response (200 OK) :** `{ message: "Password updated successfully" }` (Techniquement, seule la clé chiffrée est màj)
    *   **Response (401 Unauthorized) :** Token invalide/expiré.

#### 5.1.3. Endpoints `/users`

*   **`GET /users/{username}/public_key`** (Authentifié)
    *   **Response (200 OK) :** `{ publicKey: string }` (encodé)
    *   **Response (404 Not Found) :** `{ detail: "User not found" }`
    *   **Response (401 Unauthorized) :** Token invalide/expiré.

#### 5.1.4. Endpoints `/conversations`

*   **`POST /conversations`** (Authentifié)
    *   **Request Body :** `{ participants: string[], encryptedKeys: { [userId: string]: string } }` (`userId` est le `username`, clés chiffrées encodées)
    *   **Response (201 Created) :** `{ conversationId: int, participants: string[], ... }` (Détails de la conversation créée)
    *   **Response (404 Not Found) :** Un des participants n'existe pas.
    *   **Response (401 Unauthorized) :** Token invalide/expiré.
*   **`GET /conversations`** (Authentifié)
    *   **Response (200 OK) :** `[ { conversationId: int, participants: string[], lastMessageTimestamp: string|null, ... }, ... ]`
    *   **Response (401 Unauthorized) :** Token invalide/expiré.
*   **`GET /conversations/{conv_id}/messages`** (Authentifié)
    *   **Query Params :** `limit` (int, default 50), `before` (int, message_id ou timestamp pour pagination)
    *   **Response (200 OK) :** `[ { messageId: int, senderId: string, timestamp: string, nonce: string, ciphertext: string, authTag: string, associatedData: object|null }, ... ]` (Messages triés par timestamp desc)
    *   **Response (403 Forbidden) :** L'utilisateur n'est pas membre de la conversation.
    *   **Response (404 Not Found) :** Conversation non trouvée.
    *   **Response (401 Unauthorized) :** Token invalide/expiré.
*   **`POST /conversations/{conv_id}/participants`** (Authentifié)
    *   **Request Body :** `{ userId: string, encryptedSessionKey: string }` (username de l'utilisateur à ajouter, clé chiffrée encodée)
    *   **Response (200 OK) :** `{ message: "Participant added" }`
    *   **Response (403 Forbidden) :** L'utilisateur initiateur n'est pas membre.
    *   **Response (404 Not Found) :** Conversation ou utilisateur à ajouter non trouvé.
    *   **Response (409 Conflict) :** L'utilisateur est déjà participant.
    *   **Response (401 Unauthorized) :** Token invalide/expiré.
*   **`PUT /conversations/{conv_id}/session_key`** (Authentifié)
    *   **Request Body :** `{ participants: string[], newEncryptedKeys: { [userId: string]: string } }` (Liste des participants *restants*, nouvelles clés chiffrées encodées)
    *   **Response (200 OK) :** `{ message: "Session key updated and participants managed" }`
    *   **Response (403 Forbidden) :** Droits insuffisants ou non membre.
    *   **Response (404 Not Found) :** Conversation non trouvée.
    *   **Response (401 Unauthorized) :** Token invalide/expiré.
*   **`DELETE /conversations/{conv_id}/participants/{user_id}`** (Authentifié) - *Alternative à PUT /session_key si la logique de changement de clé est entièrement gérée par le client après un simple retrait.*
    *   **Response (200 OK) :** `{ message: "Participant removed (client must handle key rotation)" }`
    *   **Response (403 Forbidden) :** Droits insuffisants ou non membre.
    *   **Response (404 Not Found) :** Conversation ou participant non trouvé.
    *   **Response (401 Unauthorized) :** Token invalide/expiré.

#### 5.1.5. Endpoints `/messages`

*   **`POST /messages`** (Authentifié)
    *   **Request Body :** `{ conversationId: int, nonce: string, ciphertext: string, authTag: string, associatedData: object|null }` (Données binaires encodées)
    *   **Response (201 Created) :** `{ messageId: int, timestamp: string }`
    *   **Response (403 Forbidden) :** L'expéditeur n'est pas membre de `conversationId`.
    *   **Response (404 Not Found) :** Conversation non trouvée.
    *   **Response (401 Unauthorized) :** Token invalide/expiré.

### 5.2. Protocole WebSocket

Utilisation de WSS (WebSocket Secure).

#### 5.2.1. Connexion et Authentification

*   Le client se connecte à l'endpoint `/ws`.
*   L'authentification se fait via le token (JWT/Session) passé en paramètre query de l'URL de connexion (`/ws?token=...`) ou via un premier message d'authentification après connexion. Le serveur valide le token avant d'accepter la connexion logique.

#### 5.2.2. Messages Serveur -> Client

Le serveur envoie des messages JSON au client pour notifier des événements en temps réel.

*   **Nouveau Message :**
    ```json
    {
      "type": "newMessage",
      "data": {
        "messageId": 123,
        "conversationId": 45,
        "senderId": "Alice", // Username
        "timestamp": "2025-04-09T19:30:00Z",
        "nonce": "...", // Base64
        "ciphertext": "...", // Base64
        "authTag": "...", // Base64
        "associatedData": { ... } // Optionnel
      }
    }
    ```
*   **Nouveau Participant :**
    ```json
    {
      "type": "participantAdded",
      "data": {
        "conversationId": 45,
        "userId": "David", // Username
        "addedBy": "Alice", // Username
        "publicKey": "...", // Clé publique du nouveau participant (encodée)
        "encryptedSessionKey": "..." // Clé de session chiffrée POUR LE CLIENT ACTUEL (encodée) - Optionnel, si le client ne l'a pas déjà
      }
    }
    ```
*   **Participant Retiré / Changement de Clé :**
    ```json
    {
      "type": "keyRotation", // Ou "participantRemoved"
      "data": {
        "conversationId": 45,
        "removedUserId": "Bob", // Optionnel, si retrait
        "remainingParticipants": ["Alice", "Charlie"],
        "newEncryptedSessionKey": "..." // Nouvelle clé chiffrée POUR LE CLIENT ACTUEL (encodée)
      }
    }
    ```
*   **Changement de Clé Publique d'un Contact :**
    ```json
    {
        "type": "publicKeyChanged",
        "data": {
            "userId": "Bob",
            "newPublicKey": "..." // Nouvelle clé publique (encodée)
        }
    }
    ```

## 6. Considérations de Sécurité Détaillées

### 6.1. Cryptographie

#### 6.1.1. Algorithmes et Paramètres

*   **Génération Clé Identité :** Ed25519 (pour signature) et X25519 (pour échange de clé/chiffrement asymétrique via ECIES ou équivalent). Utiliser des bibliothèques éprouvées.
*   **KDF (Dérivation Clé depuis Mdp) :** Argon2id. Paramètres recommandés par OWASP (à ajuster selon tests de performance) : `memoryCost` >= 19MiB, `timeCost` >= 2, `parallelism` = 1.
*   **Chiffrement Clé Privée :** AES-256-GCM. Nonce unique (aléatoire 12 bytes) par chiffrement.
*   **Chiffrement Clé Session (Distribution) :** Schéma de chiffrement asymétrique basé sur X25519 (ex: ECIES avec AES-GCM ou ChaCha20-Poly1305 pour le chiffrement symétrique interne).
*   **Chiffrement Messages :** AES-256-GCM. Nonce unique (aléatoire 12 bytes) par message.
*   **Signature (Challenge Auth) :** Ed25519.
*   **Hash (Numéros Sécurité) :** SHA-512.

#### 6.1.2. Gestion des Clés d'Identité (Long Terme)

*   Génération aléatoire côté client.
*   Clé privée chiffrée avec clé dérivée du mot de passe (Argon2id + AES-GCM).
*   Clé privée chiffrée + sel + params KDF + clé publique stockés sur serveur.
*   Clé privée déchiffrée uniquement en mémoire client après login.
*   Changement de mot de passe rechiffre la clé privée avec nouvelle clé dérivée.
*   **Pas de récupération de compte** en cas d'oubli de mot de passe dans cette version (contrainte forte).

#### 6.1.3. Gestion des Clés de Session (Court Terme)

*   Génération aléatoire par le créateur de la conversation.
*   Chiffrement asymétrique pour chaque participant pour la distribution initiale et l'ajout de membres.
*   Stockage chiffré sur serveur (table `participants`).
*   Stockage déchiffré en mémoire client par conversation.
*   **Rotation Manuelle Obligatoire** lors du retrait d'un membre pour garantir que le membre retiré ne puisse plus déchiffrer les messages futurs.

#### 6.1.4. Authentification Utilisateur

*   Challenge-réponse basé sur signature Ed25519. Le serveur génère un challenge aléatoire, le client le signe avec sa clé privée (déchiffrée après saisie du mot de passe), le serveur vérifie avec la clé publique stockée.

#### 6.1.5. Chiffrement des Messages

*   AES-256-GCM utilisant la clé de session partagée.
*   Nonce unique par message (essentiel pour la sécurité de GCM).
*   Utilisation recommandée des `AssociatedData` pour lier le ciphertext au contexte (expéditeur, conversation, etc.) et prévenir certaines attaques de rejeu ou de découpage.

#### 6.1.6. Vérification de l'Authenticité des Clés Publiques

*   Implémentation des Numéros de Sécurité basés sur le hash des clés publiques des participants.
*   Calcul et affichage côté client.
*   Vérification manuelle hors bande par les utilisateurs.
*   Alerte et invalidation de l'état "vérifié" en cas de changement de clé publique détecté.

#### 6.1.7. Limitations Cryptographiques Connues

*   **Absence de Forward Secrecy (FS) pour les sessions :** La compromission d'une clé privée *long terme* permet de déchiffrer la clé de session *chiffrée* stockée sur le serveur, et donc potentiellement tous les messages passés et futurs chiffrés avec cette clé de session.
*   **Absence de Post-Compromise Security (PCS) pour les sessions :** Si une clé de session est compromise (ex: via malware sur le client), elle reste valide jusqu'à la prochaine rotation manuelle (retrait de membre).
*   **Métadonnées non protégées :** Le serveur connaît l'identité des participants, les heures des messages, etc.

### 6.2. Sécurité Côté Client

*   **Protection contre XSS :** Essentielle car le code JS manipule les clés privées/session en mémoire. Utiliser les mécanismes de protection de Nuxt/Vue, échapper les sorties, politique de sécurité de contenu (CSP)
*   **Validation des Entrées :** Valider toutes les données reçues du serveur ou de l'utilisateur.
*   **Sécurité des Dépendances :** Maintenir les bibliothèques (Nuxt, Vue, crypto) à jour.

### 6.3. Sécurité Côté Serveur

*   **Protection de la Base de Données :** Sécuriser l'accès au fichier SQLite (permissions système). Envisager le chiffrement du fichier DB au repos si l'OS le permet facilement. Protéger contre les injections SQL (géré par l'ORM si utilisé correctement).
*   **Rate Limiting :** Appliquer sur les endpoints sensibles (`/auth/challenge`, `/auth/verify`) pour prévenir le brute-force ou le déni de service.
*   **Validation des Entrées :** Valider toutes les données reçues des clients (FastAPI/Pydantic aide).
*   **Contrôle d'Accès :** Vérifier systématiquement l'authentification et les autorisations (ex: appartenance à une conversation) avant d'effectuer une action.
*   **Gestion des Erreurs :** Ne pas divulguer d'informations sensibles dans les messages d'erreur.
*   **Logging Sécurisé :** Journaliser les événements pertinents (logins, erreurs) mais éviter de logger des données sensibles (tokens, données chiffrées).

### 6.4. Sécurité du Transport

*   Utilisation exclusive de HTTPS pour l'API REST.
*   Utilisation exclusive de WSS (WebSockets sur TLS) pour la communication temps réel.
*   Configuration TLS robuste sur le serveur (certificats valides, protocoles/ciphers modernes).

## 7. Plan de Déploiement et de Maintenance (Esquisse)

### 7.1. Déploiement Initial

*   **Backend :** Déploiement de l'application FastAPI via un serveur ASGI (Uvicorn) derrière un reverse proxy (Caddy) gérant TLS. Gestion des dépendances Python (venv).
*   **Frontend :** Build de l'application Nuxt (`npm run build`). Déploiement des fichiers statiques générés via un serveur web (Caddy) ou un service d'hébergement statique. Configuration correcte pour le mode SPA ou SSR de Nuxt.
*   **Configuration :** Gestion des secrets (ex: clé pour signer les JWT si utilisés), configuration des paramètres KDF, configuration TLS.

### 7.2. Maintenance et Mises à Jour

*   **Surveillance :** Monitoring du serveur (CPU, mémoire, erreurs), logs applicatifs.
*   **Mises à Jour :** Application régulière des mises à jour de sécurité pour l'OS, Python, Node.js, et toutes les dépendances (backend/frontend).
*   **Sauvegardes :** Sauvegarde régulière de la base de données SQLite.
*   **Gestion des Incidents :** Procédure en cas de faille de sécurité découverte ou de panne majeure.

## 8. Glossaire des Termes Techniques

*   **AEAD (Authenticated Encryption with Associated Data) :** Mode de chiffrement symétrique (ex: AES-GCM) qui assure à la fois la Confidentialité, l'Intégrité et l'Authenticité des données chiffrées, ainsi que l'intégrité des données associées non chiffrées.
*   **AES-GCM (Advanced Encryption Standard - Galois/Counter Mode) :** Algorithme de chiffrement symétrique AEAD, standard de l'industrie, performant et sécurisé.
*   **Argon2id :** Fonction de dérivation de clé (KDF) moderne et robuste, résistante aux attaques par GPU et ASIC, recommandée par l'OWASP pour le hachage de mots de passe et la dérivation de clés.
*   **Challenge-Réponse :** Protocole d'authentification où une partie (serveur) envoie une donnée aléatoire (challenge) à l'autre partie (client), qui doit prouver son identité en transformant ce challenge d'une manière spécifique (ex: en le signant avec sa clé privée).
*   **Ed25519 :** Algorithme de signature numérique basé sur les courbes elliptiques (Curve25519), rapide et sécurisé.
*   **Forward Secrecy (FS) / Confidentialité Persistante :** Propriété d'un protocole où la compromission des clés à long terme ne compromet pas la confidentialité des communications passées (les clés de session passées ne peuvent pas être retrouvées). *Non fourni par le protocole de session simplifié ici.*
*   **KDF (Key Derivation Function) :** Fonction qui dérive une ou plusieurs clés cryptographiques à partir d'une source secrète (ex: mot de passe) et d'un sel. Conçue pour être lente et gourmande en ressources pour résister au brute-force. Ex: Argon2id, scrypt, PBKDF2.
*   **libsodium :** Bibliothèque cryptographique moderne et facile à utiliser, offrant une large gamme d'algorithmes. `libsodium-wrappers` est son portage pour le web (JavaScript/WASM).
*   **Nonce (Number used once) :** Nombre aléatoire ou pseudo-aléatoire utilisé une seule fois dans un contexte cryptographique (ex: avec AES-GCM). La réutilisation d'un nonce avec la même clé compromet gravement la sécurité.
*   **Post-Compromise Security (PCS) / Future Secrecy :** Propriété d'un protocole où, si l'état interne (ex: clé de session) est compromis à un instant T, le protocole peut se "rétablir" de sorte que les communications *futures* redeviennent sécurisées. *Non fourni par le protocole de session simplifié ici.*
*   **PKI (Public Key Infrastructure) :** Infrastructure basée sur des autorités de certification pour gérer et vérifier les clés publiques. *Non utilisé dans ce projet.*
*   **X25519 :** Algorithme d'échange de clés Diffie-Hellman basé sur les courbes elliptiques (Curve25519), utilisé pour établir des secrets partagés.
*   **XSS (Cross-Site Scripting) :** Type de faille de sécurité web permettant à un attaquant d'injecter du script côté client dans des pages web vues par d'autres utilisateurs. Dangereux si le script accède à des données sensibles (comme des clés crypto en mémoire).