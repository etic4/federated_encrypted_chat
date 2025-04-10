# Plan d'Implémentation - Bloc 07 : Frontend - Gestion des Conversations (Base)

**Objectif :** Implémenter l'interface utilisateur et la logique côté client pour afficher la liste des conversations de l'utilisateur, créer une nouvelle conversation (incluant la génération et le chiffrement de la clé de session), et gérer l'état des conversations via Pinia.

**Référence Spécifications :** Section [2.2 Gestion des Conversations](specifications_techniques.md#22-gestion-des-conversations) (partiellement), Section [4.3 Composant Frontend](specifications_techniques.md#43-composant-frontend), Section [5.1.4 Endpoints /conversations](specifications_techniques.md#514-endpoints-conversations) (partiellement).

---

- [ ] **Tâche 7.1 : Créer les composants UI pour lister les conversations et en créer une nouvelle.**
    - **Instruction :** Créez les composants Vue nécessaires pour l'affichage de la liste des conversations et l'interface de création d'une nouvelle conversation. Utilisez Shadcn-Vue.
    - [ ] **Sous-tâche 7.1.1 :** Composant `ConversationList.vue`.
        - **Emplacement :** `frontend/components/ConversationList.vue`
        - **Fonctionnalité :** Affiche une liste des conversations (reçues via props ou store). Chaque élément de la liste doit être cliquable pour naviguer vers la vue de chat correspondante (sera implémenté plus tard). Affiche les participants de chaque conversation.
        - **Composants Shadcn :** `Card`, `ScrollArea`, etc.
    - [ ] **Sous-tâche 7.1.2 :** Composant/Modal `NewConversationForm.vue`.
        - **Emplacement :** `frontend/components/NewConversationForm.vue`
        - **Fonctionnalité :** Permet à l'utilisateur de sélectionner un ou plusieurs utilisateurs (à partir d'une liste ou via recherche - la recherche d'utilisateurs n'est pas encore implémentée côté API, pour l'instant on peut supposer une liste fixe ou un input simple pour les usernames). Contient un bouton pour initier la création.
        - **Composants Shadcn :** `Dialog` (ou `Sheet`), `Input`, `Button`, `Checkbox` (ou multi-select).
    - [ ] **Sous-tâche 7.1.3 :** Intégrer les composants dans la page principale.
        - **Instruction :** Créez ou modifiez la page principale de l'application (ex: `frontend/pages/index.vue` ou un layout dédié) pour afficher `ConversationList` et un bouton/mécanisme pour ouvrir `NewConversationForm`. Assurez-vous que ces pages/layouts sont protégés et nécessitent une authentification (via middleware Nuxt ou vérification dans `onMounted`).
    - **Vérification :** Les composants sont créés et intégrés dans une page accessible après connexion. L'UI de base pour lister et initier la création de conversations est visible.

- [ ] **Tâche 7.2 : Implémenter la logique de récupération et d'affichage des conversations (`useConversations`, `useApi`).**
    - **Instruction :** Créez le composable `frontend/composables/useConversations.ts`. Implémentez une fonction pour récupérer la liste des conversations de l'utilisateur via l'API.
    - [ ] **Sous-tâche 7.2.1 :** Créer le composable `useConversations.ts`.
        - Importez `useApi` (ou `$fetch`), le store Pinia `useConversationStore` (à créer Tâche 7.4).
    - [ ] **Sous-tâche 7.2.2 :** Implémenter `fetchConversations()`.
        - Définissez une fonction asynchrone `fetchConversations`.
        - Utilisez `useApi` pour appeler l'endpoint `GET /conversations`.
        - Gérez la réponse : en cas de succès, mettez à jour l'état dans le store Pinia (via une action du store).
        - Gérez les erreurs (ex: 401 Unauthorized).
    - [ ] **Sous-tâche 7.2.3 :** Appeler `fetchConversations` au chargement.
        - Dans la page principale ou le layout, appelez `useConversations().fetchConversations()` (ex: dans `onMounted`) pour charger la liste au démarrage après connexion.
    - [ ] **Sous-tâche 7.2.4 :** Lier les données du store à `ConversationList.vue`.
        - Modifiez `ConversationList.vue` pour récupérer la liste des conversations depuis le store Pinia et l'afficher.
    - **Vérification :** Après connexion, la liste des conversations de l'utilisateur est récupérée depuis le backend et affichée dans le composant `ConversationList`.

- [ ] **Tâche 7.3 : Implémenter la logique de création de conversation (sélection participants, récupération PKs, génération SK_Session, chiffrement SK_Session, appel API).**
    - **Instruction :** Dans `useConversations.ts`, implémentez la fonction `createConversation`.
    - [ ] **Sous-tâche 7.3.1 :** Définir `createConversation(participantUsernames: string[])`.
        - Ajoutez la fonction asynchrone `createConversation` au composable.
        - Assurez-vous d'inclure le `username` de l'utilisateur courant dans la liste des participants pour la requête API et le chiffrement de clé.
    - [ ] **Sous-tâche 7.3.2 :** Implémenter le flux de création.
        - Dans `createConversation` :
            1. Récupérez le `username` et la clé publique (`myPublicKey`) de l'utilisateur courant depuis le store `auth`.
            2. Initialisez un dictionnaire `encryptedKeys = {}`.
            3. Générez la clé de session : `sessionKey = useCrypto().generateSessionKey()`.
            4. Chiffrez la `sessionKey` pour l'utilisateur courant : `encryptedKeys[myUsername] = await useCrypto().encryptAsymmetric(sessionKey, myPublicKey, myPrivateKey)`. (Nécessite `myPrivateKey` depuis le store `auth`). **Attention:** `encryptAsymmetric` doit être adapté si `crypto_box_seal` est utilisé (ne nécessite pas la clé privée de l'expéditeur). Utiliser `crypto_box_seal` est préférable ici.
            5. Pour chaque `username` dans `participantUsernames` (excluant l'utilisateur courant) :
                a. Appelez l'API `GET /users/{username}/public_key` pour récupérer la `publicKey` du participant (décodez-la).
                b. Chiffrez la `sessionKey` pour ce participant : `encryptedKey = await useCrypto().encryptAsymmetric(sessionKey, participantPublicKey)`. (Utilisation de `crypto_box_seal`).
                c. Encodez `encryptedKey` en Base64/Hex et stockez-la : `encryptedKeys[username] = encodedEncryptedKey`.
            6. Appelez l'API `POST /conversations` avec `{ participants: allUsernames, encryptedKeys }`.
            7. Gérez la réponse : en cas de succès, récupérez les détails de la nouvelle conversation.
            8. **Stockez la clé de session déchiffrée** (`sessionKey`) dans le store Pinia `conversations`, associée à l'`id` de la nouvelle conversation.
            9. Mettez à jour la liste des conversations dans le store.
            10. Gérez les erreurs (participant non trouvé, etc.).
    - [ ] **Sous-tâche 7.3.3 :** Connecter la logique à l'UI.
        - Dans `NewConversationForm.vue`, appelez `useConversations().createConversation` lors de la soumission du formulaire avec la liste des usernames sélectionnés.
        - Fermez le formulaire/modal et rafraîchissez la liste des conversations en cas de succès. Affichez les erreurs le cas échéant.
    - **Vérification :** La création d'une conversation déclenche la génération de clé de session, le chiffrement pour chaque participant via leur clé publique récupérée, l'appel API, et le stockage local de la clé de session déchiffrée. La nouvelle conversation apparaît dans la liste.

- [ ] **Tâche 7.4 : Mettre en place la gestion de l'état des conversations (Pinia store `conversations.ts`).**
    - **Instruction :** Créez un store Pinia (`frontend/store/conversations.ts`) pour gérer l'état lié aux conversations.
    - [ ] **Sous-tâche 7.4.1 :** Définir l'état du store.
        - `conversations: Ref<ConversationListInfo[]>` : Liste des informations des conversations.
        - `sessionKeys: Ref<Record<number, Uint8Array>>` : Dictionnaire mappant `conversationId` à la clé de session `SK_Session` déchiffrée (**NON PERSISTÉ**, en mémoire uniquement).
        - `currentConversationId: Ref<number | null>` : ID de la conversation actuellement sélectionnée/affichée.
    - [ ] **Sous-tâche 7.4.2 :** Définir les actions du store.
        - `setConversations(convos: ConversationListInfo[])` : Remplace la liste des conversations.
        - `addConversation(convo: ConversationListInfo)` : Ajoute une nouvelle conversation à la liste.
        - `setSessionKey(conversationId: number, key: Uint8Array)` : Stocke une clé de session déchiffrée pour une conversation donnée.
        - `clearSessionKeys()` : Vide le dictionnaire des clés de session (appelé au logout).
        - `setCurrentConversationId(id: number | null)` : Définit la conversation active.
        - `removeConversation(conversationId: number)` : Supprime une conversation (utile si l'utilisateur est retiré).
        - `updateConversationParticipants(conversationId: number, participants: string[])` : Met à jour la liste des participants d'une conversation.
    - [ ] **Sous-tâche 7.4.3 :** Définir les getters du store.
        - `getConversationList`: Retourne `conversations`.
        - `getSessionKey(conversationId: number)`: Retourne la clé de session pour un ID donné, ou `undefined`.
        - `getCurrentConversationId`: Retourne `currentConversationId`.
    - [ ] **Sous-tâche 7.4.4 :** Intégrer le store avec `useConversations`.
        - Le composable `useConversations` utilisera ce store pour lire et écrire l'état des conversations et des clés de session.
    - **Vérification :** Le store Pinia est créé et fonctionnel. Les actions permettent de mettre à jour l'état, et les getters permettent d'y accéder. Le composable `useConversations` interagit correctement avec le store. Les clés de session sont stockées uniquement en mémoire.

---
**Fin du Bloc 07.** L'interface et la logique frontend pour lister les conversations, en créer de nouvelles (avec la cryptographie associée), et gérer leur état (y compris les clés de session en mémoire) sont implémentées.