# Plan d'Intégration E2EE (Matrix SDK) et Fédération Isolée (S2S Custom)

**Date :** 14 Avril 2025

**Objectifs :**

1.  Remplacer le système de chiffrement de bout en bout (E2EE) actuel basé sur `libsodium-wrappers` par celui fourni par `matrix-js-sdk` (utilisant les protocoles Olm/Megolm), en implémentant la Sauvegarde Sécurisée liée au Mot de Passe (SSSS - Secure Secret Storage and Sharing) pour la persistance des clés E2EE sur le serveur.
2.  Développer et intégrer un protocole Serveur-Serveur (S2S) personnalisé simple pour permettre la communication (y compris la propagation des informations E2EE nécessaires) entre utilisateurs enregistrés sur différentes instances déployées de l'application backend FastAPI.

**Hypothèse Principale :**

*   Le frontend Nuxt.js utilise `matrix-js-sdk` pour toutes les opérations E2EE côté client.
*   Le backend FastAPI existant est adapté pour fournir l'API Client-Serveur (C-S) minimale requise par le SDK client (gestion des devices, stockage SSSS, relais de messages to-device, etc.).
*   Le backend FastAPI implémente un nouveau protocole S2S personnalisé (ex: via API REST ou bus de messages) pour gérer la fédération isolée entre instances connues et de confiance, en relayant les messages et les données E2EE nécessaires.

**Phases du Projet :**

**Phase 1 : Analyse Approfondie et Préparation**

*   **1.1. Étude `matrix-js-sdk` E2EE & SSSS :**
    *   Comprendre en détail le fonctionnement d'Olm (1-to-1) et Megolm (groupes) dans le SDK.
    *   Analyser les mécanismes de sauvegarde de clés (`SecretStorage`) et de cross-signing.
    *   Confirmer et analyser le support et l'utilisation du mode SSSS (dérivation de la clé de sauvegarde depuis le mot de passe via KDF, activation, utilisation).
    *   Identifier les modules et API clés du SDK : `Crypto`, gestion des "devices", `SecretStorage`.
*   **1.2. Définition Stratégie Backend C-S :**
    *   Identifier précisément les endpoints API et les modifications de la base de données (SQLAlchemy) nécessaires dans FastAPI pour supporter les interactions du `matrix-js-sdk` client.
    *   Inclure la gestion des identifiants de device, le stockage/récupération du sel KDF pour SSSS, le stockage/récupération des blobs SSSS chiffrés, la publication/récupération des clés Olm, et le relais des messages "to-device".
*   **1.3. Conception du Protocole S2S Personnalisé :**
    *   **Objectifs Clairs :** Définir les fonctionnalités minimales requises : création/gestion de salons "fédérés" (entre instances locales), échange de messages standards, propagation fiable des informations E2EE (clés de device des participants distants, messages to-device pour l'établissement Olm, distribution des clés Megolm).
    *   **Transport :** Choisir le mécanisme (API REST sécurisée entre serveurs semble le plus simple à intégrer dans FastAPI).
    *   **Format des Messages S2S :** Définir une structure JSON claire pour les différents types d'événements S2S (invitation, message, partage de clé, etc.).
    *   **Authentification Inter-Serveurs :** Mécanisme simple et robuste (ex: tokens Bearer pré-partagés, mTLS si l'infrastructure le permet).
    *   **Adressage/Routage :** Définir un format d'identifiant utilisateur global (ex: `@username:instance.domain`) et un mécanisme pour que les instances FastAPI connaissent l'adresse des autres instances (ex: configuration statique).
    *   **Gestion des Identifiants :** Stratégie pour éviter les collisions d'ID utilisateur/salon (ex: préfixage par domaine d'instance).
    *   **Encapsulation E2EE :** Spécifier comment les données E2EE (traitées comme opaques par le serveur) sont encapsulées dans les messages S2S.

**Phase 2 : Adaptation du Frontend (Nuxt.js)**

*   **2.1. Intégration SDK :** Ajouter `matrix-js-sdk` comme dépendance, configurer son initialisation (ex: via un plugin Nuxt).
*   **2.2. Refonte des Composables :**
    *   `useAuth` : Adapter le flux login/register pour intégrer la création/gestion du "device" Matrix. Implémenter la dérivation de la clé SSSS depuis le mot de passe (via Argon2id + sel serveur) et l'utiliser pour initialiser/déverrouiller le `SecretStorage` du SDK. Gérer le stockage sécurisé local des informations du SDK.
    *   `useCrypto` : Remplacer les appels `libsodium-wrappers` par les fonctions du SDK (`encryptEvent`, `decryptEvent`, gestion des clés via `Crypto` et `SecretStorage`).
    *   `useConversations` / `useMessages` : Adapter la logique pour utiliser les concepts Matrix (rooms, events) et les fonctions de chiffrement/déchiffrement du SDK.
*   **2.3. Gestion des Utilisateurs/Salons Fédérés :** Modifier l'UI pour permettre la recherche/invitation d'utilisateurs via leur ID global (`@username:instance.domain`) et afficher clairement les salons/utilisateurs distants.
*   **2.4. Vérification des Clés :** Remplacer le système de "Numéros de Sécurité" par le mécanisme de vérification SAS (Short Authentication String) fourni par le SDK et intégrer l'UI correspondante.

**Phase 3 : Adaptation du Backend (FastAPI)**

*   **3.1. Modification Modèles DB :** Mettre à jour les modèles SQLAlchemy (`User`, `Device`, `ServerKeyBackup`, etc.) pour inclure les champs requis (ex: `device_id`, `kdf_salt_ssss`, `ssss_blob`, `olm_keys`, etc.). Gérer les migrations de base de données via Alembic.
*   **3.2. Adaptation Endpoints C-S :**
    *   Modifier `/auth` pour gérer les devices et le sel SSSS.
    *   Modifier/Ajouter des endpoints dans `/users` pour la gestion des clés Olm/devices.
    *   Adapter `/conversations` et `/messages` pour le format Matrix et pour déclencher des actions S2S lorsque nécessaire (ex: envoyer une invitation S2S si un utilisateur distant est ajouté).
    *   Ajouter les endpoints nécessaires pour le stockage/récupération des blobs SSSS chiffrés.
*   **3.3. Implémentation du Protocole S2S Personnalisé :**
    *   Créer de nouveaux routeurs/endpoints FastAPI pour gérer les requêtes S2S entrantes (authentification, traitement selon le format défini en 1.3).
    *   Implémenter la logique pour envoyer des requêtes S2S sortantes vers d'autres instances (ex: via `httpx` si API REST) lorsqu'une action C-S le requiert.
    *   Assurer la transmission fiable des données E2EE opaques via S2S.

**Phase 4 : Tests, Migration et Finalisation**

*   **4.1. Tests Approfondis :**
    *   **Tests Unitaires :** Fonctions cryptographiques du SDK (via mocks si besoin), logique SSSS, logique S2S (parsing, envoi).
    *   **Tests d'Intégration C-S :** Scénarios complets client-serveur local (login, envoi/réception message E2EE, sauvegarde/restauration SSSS, vérification SAS).
    *   **Tests d'Intégration S2S :** Mettre en place un environnement avec au moins deux instances FastAPI connectées via le protocole S2S custom. Tester les scénarios de fédération isolée : invitation d'utilisateur distant, échange de messages dans un salon fédéré, établissement de session Olm/Megolm inter-instances.
*   **4.2. Stratégie de Migration (Optionnel) :** Si des données existantes (utilisateurs, messages non-E2EE ?) doivent être migrées, définir le processus. La migration de l'historique E2EE sera probablement impossible.
*   **4.3. Documentation :** Mettre à jour `doc/specifications_techniques.md` pour refléter la nouvelle architecture E2EE (Matrix SDK, SSSS) et le protocole de fédération S2S personnalisé. Ajouter la documentation du protocole S2S custom.

**Diagramme Visuel :**

```mermaid
graph TD
    subgraph Phase 1: Analyse et Préparation
        A[Analyser matrix-js-sdk E2EE & SSSS] --> B(Définir stratégie Backend C-S);
        A --> F[Concevoir Protocole S2S Custom];
        B --> C[Identifier modifs API/DB C-S (incl. SSSS)];
        F --> G[Identifier modifs API/DB S2S];
        A --> H[Identifier modifs Frontend Nuxt (E2EE & Fédération)];
    end

    subgraph Phase 2: Implémentation Frontend (Nuxt)
        I[Intégrer SDK] --> J[Refactor useAuth (KDF SSSS)];
        J --> K[Refactor useCrypto (SecretStorage)];
        K --> L[Refactor useConversations/Messages];
        L --> M[Gérer UI Fédération Isolée];
        M --> N[Implémenter Vérification Clés (SAS)];
    end

    subgraph Phase 3: Implémentation Backend (FastAPI)
        O[Modifier Modèles DB (C-S & S2S)] --> P[Adapter Endpoints C-S (Trigger S2S)];
        P --> Q[Ajouter Endpoints SSSS];
        O --> R[Implémenter Protocole S2S (Réception/Envoi)];
    end

    subgraph Phase 4: Finalisation
        S[Tests E2EE & SSSS] --> T[Tests Fédération Isolée (S2S)];
        T --> U[Plan de Migration (si besoin)];
        U --> V[Documentation Technique];
    end

    C --> O;
    G --> O;
    H --> I;
    N --> S;
    Q --> S;
    R --> T;


    style Phase 1 fill:#ece,stroke:#333,stroke-width:2px
    style Phase 2 fill:#cee,stroke:#333,stroke-width:2px
    style Phase 3 fill:#fce,stroke:#333,stroke-width:2px
    style Phase 4 fill:#efc,stroke:#333,stroke-width:2px