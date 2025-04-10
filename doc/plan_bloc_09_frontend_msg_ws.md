# Plan d'Implémentation - Bloc 09 : Frontend - Messagerie et WebSockets

**Objectif :** Implémenter l'interface utilisateur pour afficher et envoyer des messages, établir la connexion WebSocket, gérer la réception et le déchiffrement des messages en temps réel et de l'historique, et gérer l'état des messages via Pinia.

**Référence Spécifications :** Section [2.3 Messagerie](specifications_techniques.md#23-messagerie), Section [4.3 Composant Frontend](specifications_techniques.md#43-composant-frontend), Section [5.2 Protocole WebSocket](specifications_techniques.md#52-protocole-websocket), Section [5.1.5 Endpoints /messages](specifications_techniques.md#515-endpoints-messages).

---

- [x] **Tâche 9.1 : Créer les composants UI pour afficher les messages et l'input d'envoi.**
    - **Instruction :** Développez les composants Vue pour la visualisation des messages et la saisie de nouveaux messages.
    - [x] **Sous-tâche 9.1.1 :** Composant `MessageView.vue`.
        - **Emplacement :** `frontend/components/MessageView.vue`
        - **Fonctionnalité :** Affiche une liste de messages pour la conversation active. Doit recevoir la liste des messages (déjà déchiffrés) via props ou le store. Style différemment les messages envoyés et reçus. Affiche l'expéditeur (username) et le timestamp. Gère le défilement (scroll).
        - **Composants Shadcn :** `ScrollArea`, `Avatar` (optionnel), `Card` (pour chaque bulle de message).
    - [x] **Sous-tâche 9.1.2 :** Composant `MessageInput.vue`.
        - **Emplacement :** `frontend/components/MessageInput.vue`
        - **Fonctionnalité :** Contient un champ de saisie de texte et un bouton d'envoi. Émet un événement (ex: `@send-message`) avec le contenu du message lorsque l'utilisateur clique sur envoyer ou appuie sur Entrée. Gère l'état du champ de saisie.
        - **Composants Shadcn :** `Textarea` (ou `Input`), `Button`.
    - [x] **Sous-tâche 9.1.3 :** Intégrer dans la page de chat.
        - **Instruction :** Créez la page principale de chat (ex: `frontend/pages/chat/[id].vue` où `[id]` est l'`conversationId`). Cette page affichera `MessageView` et `MessageInput`. Elle sera responsable de charger les messages historiques et d'écouter les nouveaux messages pour la conversation active (via `useMessages`).
    - **Vérification :** La page de chat affiche une zone pour les messages et une zone de saisie. Les composants de base sont en place.

- [x] **Tâche 9.2 : Implémenter la logique d'envoi de message (`useMessages`, `useCrypto`, `useApi`).**
    - **Instruction :** Créez le composable `useMessages.ts` et implémentez la fonction d'envoi.
    - [x] **Sous-tâche 9.2.1 :** Créer le composable `useMessages.ts`.
        - **Emplacement :** `frontend/composables/useMessages.ts`
        - **Imports :** `useCrypto`, `useApi`, `useConversationStore`, `useMessageStore`.
    - [x] **Sous-tâche 9.2.2 :** Implémenter `sendMessage(conversationId: number, plaintext: string)`.
        - Définissez la fonction asynchrone `sendMessage`.
        - Récupérez la clé de session (`sessionKey`) pour `conversationId` depuis le `conversationStore`. Si non trouvée, levez une erreur.
        - Récupérez l'`username` de l'utilisateur courant depuis `authStore`.
        - Préparez les `associatedData` (ex: `{ convId: conversationId, senderId: username }`). Convertissez en `Uint8Array`.
        - Appelez `useCrypto().encryptMessage(sessionKey, plaintext, associatedData)` pour obtenir `{ ciphertext, nonce }`.
        - Encodez `nonce`, `ciphertext`, `authTag` en Base64/Hex.
        - Appelez l'API `POST /messages` avec `{ conversationId, nonce, ciphertext, authTag, associatedData }`.
        - Gérez la réponse (succès/erreur). En cas de succès, on peut éventuellement ajouter le message à l'état local immédiatement (optimistic update) ou attendre la réception via WebSocket.
    - [x] **Sous-tâche 9.2.3 :** Connecter `MessageInput.vue` à `sendMessage`.
        - Dans la page `chat/[id].vue`, écoutez l'événement `@send-message` de `MessageInput.vue`.
        - Appelez `useMessages().sendMessage(conversationId, messageContent)` lorsque l'événement est reçu.
        - Videz le champ de saisie après l'envoi réussi.
    - **Vérification :** La saisie d'un message et l'appui sur "Envoyer" déclenchent le chiffrement avec la clé de session correcte et l'envoi à l'API backend.

- [x] **Tâche 9.3 : Implémenter la connexion WebSocket et la réception/dispatch des messages.**
    - **Instruction :** Créez le composable `useWebSocket.ts` pour gérer la connexion et la réception des messages temps réel.
    - [x] **Sous-tâche 9.3.1 :** Créer le composable `useWebSocket.ts`.
        - **Emplacement :** `frontend/composables/useWebSocket.ts`
        - **Imports :** `useAuthStore`, `useMessageStore`, `useConversationStore`.
        - **État local :** Référence pour l'objet WebSocket (`ws: Ref<WebSocket | null>`), état de connexion (`isConnected: Ref<boolean>`).
    - [x] **Sous-tâche 9.3.2 :** Implémenter `connectWebSocket()`.
        - Définissez une fonction `connectWebSocket`.
        - Récupérez le token d'authentification depuis `authStore`. Si pas de token, ne pas connecter.
        - Construisez l'URL WebSocket (WSS) avec le token : `wss://your-backend-domain/ws?token=...`.
        - Créez une nouvelle instance `WebSocket`.
        - Attachez les gestionnaires d'événements : `onopen`, `onmessage`, `onerror`, `onclose`.
        - `onopen`: Mettre `isConnected` à `true`.
        - `onclose`: Mettre `isConnected` à `false`, potentiellement tenter une reconnexion avec backoff exponentiel.
        - `onerror`: Logguer l'erreur.
    - [x] **Sous-tâche 9.3.3 :** Implémenter la gestion `onmessage`.
        - Dans le handler `onmessage` :
            1. Parsez les données reçues (JSON attendu).
            2. Vérifiez le champ `type` du message JSON.
            3. **Si `type === 'newMessage'`:** Dispatcher les données (`messageData = parsedMessage.data`) vers le store/composable des messages (ex: appeler une action `messageStore.handleIncomingMessage(messageData)`).
            4. **Si `type === 'participantAdded'`:** Dispatcher vers `conversationStore`.
            5. **Si `type === 'keyRotation'`:** Dispatcher vers `conversationStore`.
            6. **Si `type === 'publicKeyChanged'`:** Dispatcher vers `authStore` ou `conversationStore` pour invalider l'état vérifié.
    - [x] **Sous-tâche 9.3.4 :** Déclencher la connexion/déconnexion.
        - Appelez `connectWebSocket()` automatiquement après un login réussi (ex: depuis `useAuth.ts`).
        - Implémentez une fonction `disconnectWebSocket()` qui ferme la connexion (`ws.value?.close()`) et nettoie l'état. Appelez-la lors du logout.
    - **Vérification :** La connexion WebSocket est établie après le login avec le token correct. Les messages entrants du serveur sont parsés et dispatchés en fonction de leur type. La connexion est fermée au logout.

- [x] **Tâche 9.4 : Implémenter le déchiffrement et l'affichage des messages.**
    - **Instruction :** Mettez en place la logique pour déchiffrer les messages reçus (temps réel et historique) et les afficher.
    - [x] **Sous-tâche 9.4.1 :** Gérer les messages entrants dans le store/composable.
        - **Instruction :** Dans `useMessageStore` (ou `useMessages`), créez une action `handleIncomingMessage(messageData)`.
        - Récupérez l'`conversationId` depuis `messageData`.
        - Récupérez la `sessionKey` correspondante depuis `conversationStore`. Si non trouvée, logguer une erreur (ne devrait pas arriver si la conversation est chargée).
        - Décodez `nonce`, `ciphertext`, `authTag` (Base64/Hex).
        - Préparez les `associatedData` si utilisées.
        - Appelez `useCrypto().decryptMessage(sessionKey, nonce, ciphertext, authTag, associatedData)`.
        - Si le déchiffrement réussit, ajoutez le message déchiffré (avec `senderId`, `timestamp`, `plaintext`) à l'état du store pour la bonne conversation.
        - Si le déchiffrement échoue, logguer l'erreur et potentiellement stocker un message d'erreur à afficher dans l'UI.
    - [x] **Sous-tâche 9.4.2 :** Charger et déchiffrer l'historique.
        - **Instruction :** Dans la page `chat/[id].vue` (ou dans `useMessages`), implémentez une fonction `loadHistory(conversationId)`.
        - Appelez l'API `GET /conversations/{conversationId}/messages`.
        - Récupérez la `sessionKey` depuis `conversationStore`.
        - Pour chaque message chiffré reçu de l'API :
            - Décodez les données.
            - Tentez de déchiffrer avec `useCrypto().decryptMessage`.
            - Stockez les messages déchiffrés (ou les erreurs) dans le `messageStore`.
        - Appelez `loadHistory` lorsque la page de chat est montée (`onMounted`) ou lorsque l'utilisateur sélectionne une conversation.
    - [x] **Sous-tâche 9.4.3 :** Mettre à jour `MessageView.vue`.
        - **Instruction :** Modifiez `MessageView.vue` pour récupérer et afficher les messages (déchiffrés) depuis le `messageStore` pour la conversation active (`currentConversationId` du `conversationStore`).
        - Assurez-vous que la liste se met à jour réactivement lorsque de nouveaux messages sont ajoutés au store (temps réel ou historique).
        - Affichez un indicateur spécial pour les messages qui n'ont pas pu être déchiffrés.
    - **Vérification :** Les messages reçus via WebSocket sont déchiffrés et apparaissent dans la vue de chat. L'historique des messages est chargé, déchiffré et affiché lors de l'ouverture d'une conversation. Les erreurs de déchiffrement sont gérées.

- [x] **Tâche 9.5 : Mettre en place le Pinia store pour les messages.**
    - **Instruction :** Créez et configurez le store Pinia pour gérer l'état des messages déchiffrés.
    - [x] **Sous-tâche 9.5.1 :** Créer `frontend/store/messages.ts`.
    - [x] **Sous-tâche 9.5.2 :** Définir l'état.
        - `messagesByConversation: Ref<Record<number, DecryptedMessage[]>>` où `DecryptedMessage` est une interface/type contenant `{ messageId: number, senderId: string, timestamp: string, plaintext: string, error?: string }`.
    - [x] **Sous-tâche 9.5.3 :** Définir les actions.
        - `addMessage(conversationId: number, message: DecryptedMessage)` : Ajoute un message à la liste d'une conversation. Gère la création du tableau s'il n'existe pas.
        - `setMessagesForConversation(conversationId: number, messages: DecryptedMessage[])` : Remplace les messages pour une conversation (utile pour le chargement de l'historique).
        - `clearMessages()` : Vide l'état (appelé au logout).
        - `handleIncomingMessage(messageData)` : Action principale appelée par `useWebSocket` qui contient la logique de déchiffrement et appelle `addMessage`.
    - [x] **Sous-tâche 9.5.4 :** Définir les getters.
        - `getMessagesForConversation(conversationId: number)` : Retourne le tableau des messages pour une conversation donnée, ou un tableau vide.
    - [x] **Sous-tâche 9.5.5 :** Intégrer le store.
        - Assurez-vous que `useMessages`, `useWebSocket` et les composants UI (`MessageView`) utilisent ce store pour lire et écrire l'état des messages.
    - **Vérification :** Le store Pinia gère correctement l'état des messages déchiffrés par conversation. Les actions et getters fonctionnent comme prévu.

---
**Fin du Bloc 09.** L'interface de messagerie est fonctionnelle : envoi de messages chiffrés, connexion WebSocket, réception, déchiffrement et affichage des messages en temps réel et de l'historique. L'état est géré via Pinia.