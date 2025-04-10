# Plan d'Implémentation - Bloc 11 : Frontend - Gestion des Participants et Rotation de Clé

**Objectif :** Implémenter l'interface utilisateur et la logique côté client pour ajouter et retirer des participants d'une conversation, y compris la génération et la distribution d'une nouvelle clé de session lors d'un retrait. Gérer les notifications WebSocket correspondantes.

**Référence Spécifications :** Section [2.2.3 Ajout d'un Participant](specifications_techniques.md#223-ajout-dun-participant), Section [2.2.4 Retrait d'un Participant](specifications_techniques.md#224-retrait-dun-participant), Section [4.3 Composant Frontend](specifications_techniques.md#43-composant-frontend), Section [5.1.4 Endpoints /conversations](specifications_techniques.md#514-endpoints-conversations), Section [5.2.2 Messages Serveur -> Client](specifications_techniques.md#522-messages-serveur---client).

---

- [x] **Tâche 11.1 : Créer les composants UI pour gérer les participants.**
    - **Instruction :** Créez un composant (ex: modal ou section dans les détails de la conversation) pour afficher la liste des participants et permettre l'ajout/retrait.
    - [x] **Sous-tâche 11.1.1 :** Composant `ParticipantManager.vue`.
        - **Emplacement :** `frontend/components/ParticipantManager.vue` (ou nom similaire).
        - **Fonctionnalité :**
            - Affiche la liste des participants de la conversation active (reçue via props ou store).
            - Fournit un bouton/mécanisme pour ajouter un nouveau participant (ouvre un champ de saisie/recherche).
            - Fournit un bouton "Retirer" à côté de chaque participant (sauf l'utilisateur courant).
            - Émet des événements (ex: `@add-participant`, `@remove-participant`) avec le `username` concerné.
        - **Composants Shadcn :** `Dialog`, `Sheet`, `List`, `Button`, `Input`, `Avatar` (optionnel).
    - [x] **Sous-tâche 11.1.2 :** Intégrer dans la vue de chat ou les détails de la conversation.
        - Ajoutez un bouton ou une option dans l'interface de chat (ex: barre de titre, menu) pour ouvrir le `ParticipantManager`.
    - **Vérification :** L'interface pour voir, ajouter et initier le retrait de participants est accessible et fonctionnelle.

- [x] **Tâche 11.2 : Implémenter la logique d'ajout de participant.**
    - **Instruction :** Dans `useConversations.ts`, implémentez la fonction `addParticipant`.
    - [x] **Sous-tâche 11.2.1 :** Définir `addParticipant(conversationId: number, usernameToAdd: string)`.
        - Ajoutez la fonction asynchrone au composable.
    - [x] **Sous-tâche 11.2.2 :** Implémenter le flux d'ajout.
        - Récupérez la clé de session actuelle (`sessionKey`) pour `conversationId` depuis `conversationStore`. Si non trouvée, erreur.
        - Récupérez la clé publique de `usernameToAdd` via l'API (`GET /users/{usernameToAdd}/public_key`). Décodez-la.
        - Chiffrez `sessionKey` avec la clé publique de l'utilisateur à ajouter : `encryptedSessionKey = await useCrypto().encryptAsymmetric(sessionKey, userToAddPublicKey)`. (Utiliser `crypto_box_seal`).
        - Encodez `encryptedSessionKey` en Base64/Hex.
        - Appelez l'API `POST /conversations/{conversationId}/participants` avec `{ userId: usernameToAdd, encryptedSessionKey: encodedKey }`.
        - Gérez la réponse (succès/erreur). En cas de succès, mettez à jour l'état local des participants dans le store (ou attendez la notification WebSocket).
    - [x] **Sous-tâche 11.2.3 :** Connecter à l'UI.
        - Dans `ParticipantManager.vue`, appelez `useConversations().addParticipant` lorsque l'utilisateur confirme l'ajout. Affichez feedback/erreurs.
    - **Vérification :** L'ajout d'un participant via l'UI déclenche la récupération de sa clé publique, le chiffrement de la clé de session actuelle pour lui, et l'appel API correspondant.

- [x] **Tâche 11.3 : Implémenter la logique de retrait de participant (avec rotation de clé).**
    - **Instruction :** Dans `useConversations.ts`, implémentez la fonction `removeParticipant`. C'est l'opération la plus complexe car elle implique la génération et la distribution d'une nouvelle clé.
    - [x] **Sous-tâche 11.3.1 :** Définir `removeParticipant(conversationId: number, usernameToRemove: string)`.
        - Ajoutez la fonction asynchrone au composable.
    - [x] **Sous-tâche 11.3.2 :** Implémenter le flux de retrait et rotation de clé.
        - Récupérez la liste actuelle des participants de `conversationId` depuis `conversationStore`.
        - Identifiez les participants *restants* (excluant `usernameToRemove`).
        - Générez une **nouvelle** clé de session : `newSessionKey = useCrypto().generateSessionKey()`.
        - Initialisez `newEncryptedKeys = {}`.
        - Pour chaque `username` dans les participants restants :
            a. Récupérez sa clé publique (depuis le store `auth` si c'est l'utilisateur courant, sinon via API `GET /users/{username}/public_key`). Décodez-la.
            b. Chiffrez `newSessionKey` avec la clé publique du participant restant : `encryptedKey = await useCrypto().encryptAsymmetric(newSessionKey, remainingUserPublicKey)`. (Utiliser `crypto_box_seal`).
            c. Encodez `encryptedKey` et stockez : `newEncryptedKeys[username] = encodedEncryptedKey`.
        - Appelez l'API `PUT /conversations/{conversationId}/session_key` avec `{ participants: remainingUsernames, newEncryptedKeys }`.
        - Gérez la réponse (succès/erreur).
        - **En cas de succès :**
            a. Mettez à jour la clé de session stockée localement pour `conversationId` avec `newSessionKey` dans `conversationStore`.
            b. Mettez à jour la liste des participants dans `conversationStore`.
    - [x] **Sous-tâche 11.3.3 :** Connecter à l'UI.
        - Dans `ParticipantManager.vue`, appelez `useConversations().removeParticipant` lorsque l'utilisateur clique sur "Retirer". Affichez feedback/erreurs.
    - **Vérification :** Le retrait d'un participant déclenche la génération d'une nouvelle clé de session, son chiffrement pour tous les membres restants, l'appel API pour mettre à jour le serveur, et la mise à jour de la clé de session locale et de la liste des participants.

- [x] **Tâche 11.4 : Gérer les notifications WebSocket pour les changements de participants.**
    - **Instruction :** Modifiez le handler `onmessage` dans `useWebSocket.ts` (Tâche 9.3.3) pour traiter les types d'événements `participantAdded`, `keyRotation`, et `removedFromConversation`.
    - [x] **Sous-tâche 11.4.1 :** Gérer `participantAdded`.
        - Lorsque ce type est reçu :
            - Extrayez `conversationId`, `userId` (nouveau participant), `publicKey` (du nouveau participant).
            - Mettez à jour la liste des participants pour `conversationId` dans `conversationStore`.
            - Affichez une notification dans l'UI de chat (ex: "David a rejoint la conversation").
            - **Note :** Comme décidé précédemment, le client ne reçoit pas la clé de session chiffrée pour lui dans cette notif. Il devra la récupérer s'il en a besoin (ce qui n'est pas le cas ici, car il a déjà la clé s'il est dans la conversation).
    - [x] **Sous-tâche 11.4.2 :** Gérer `keyRotation`.
        - Lorsque ce type est reçu :
            - Extrayez `conversationId`, `removedUserId`, `remainingParticipants`, `newEncryptedSessionKey` (celle chiffrée pour *moi*).
            - Récupérez la clé privée de l'utilisateur courant depuis `authStore`.
            - Décodez `newEncryptedSessionKey`.
            - Déchiffrez la nouvelle clé de session : `newSessionKey = await useCrypto().decryptAsymmetric(decodedEncryptedKey, senderPublicKey, myPrivateKey)`. (Nécessite la clé publique de l'expéditeur de la rotation, qui n'est pas dans la notif actuelle. **Problème de design !** Il faut soit que le client initiateur signe la requête PUT, soit que le serveur inclue la PK de l'initiateur dans la notif, soit utiliser `crypto_box_seal_open` qui ne nécessite que la paire de clés du destinataire). **Décision :** Utiliser `crypto_box_seal_open` pour le déchiffrement, qui ne nécessite que la clé publique/privée du destinataire (l'utilisateur courant). Mettez à jour `useCrypto` si nécessaire.
            - Si le déchiffrement réussit :
                - Mettez à jour la clé de session pour `conversationId` dans `conversationStore` avec `newSessionKey`.
                - Mettez à jour la liste des participants dans `conversationStore` avec `remainingParticipants`.
                - Affichez une notification (ex: "Bob a été retiré. La clé de session a été mise à jour.").
            - Si le déchiffrement échoue, logguer une erreur critique.
    - [x] **Sous-tâche 11.4.3 :** Gérer `removedFromConversation`.
        - Lorsque ce type est reçu :
            - Extrayez `conversationId`.
            - Supprimez la conversation de la liste dans `conversationStore`.
            - Supprimez la clé de session associée de `conversationStore`.
            - Si l'utilisateur visualisait cette conversation, redirigez-le ou affichez un message clair.
    - **Vérification :** Le client réagit correctement aux notifications WebSocket : met à jour la liste des participants, déchiffre et stocke la nouvelle clé de session lors d'une rotation, et supprime la conversation si l'utilisateur est retiré.

---
**Fin du Bloc 11.** L'interface et la logique frontend pour ajouter et retirer des participants (avec rotation de clé) sont implémentées. Le client gère correctement les notifications WebSocket associées.