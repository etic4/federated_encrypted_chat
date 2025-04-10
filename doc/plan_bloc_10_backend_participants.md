# Plan d'Implémentation - Bloc 10 : Backend - API Gestion des Participants

**Objectif :** Implémenter les endpoints API backend pour ajouter des participants à une conversation existante et pour gérer le retrait de participants via la rotation de la clé de session. Mettre en place la diffusion des événements correspondants via WebSocket.

**Référence Spécifications :** Section [2.2.3 Ajout d'un Participant](specifications_techniques.md#223-ajout-dun-participant), Section [2.2.4 Retrait d'un Participant](specifications_techniques.md#224-retrait-dun-participant), Section [5.1.4 Endpoints /conversations](specifications_techniques.md#514-endpoints-conversations) (POST participants, PUT session_key), Section [5.2.2 Messages Serveur -> Client](specifications_techniques.md#522-messages-serveur---client) (participantAdded, keyRotation).

---

- [ ] **Tâche 10.1 : Implémenter l'endpoint `POST /conversations/{conv_id}/participants`.**
    - **Instruction :** Dans le routeur `conversations.py`, implémentez l'endpoint pour ajouter un nouvel utilisateur à une conversation existante.
    - [ ] **Sous-tâche 10.1.1 :** Définir l'endpoint.
        - Définissez l'endpoint `POST /{conv_id}/participants` qui prend un `ParticipantAddRequest` en body.
        - Protégez avec `Depends(get_current_user)`. Récupérez `current_username`.
    - [ ] **Sous-tâche 10.1.2 :** Implémenter la logique métier.
        - Récupérez la session DB et l'utilisateur courant.
        - Vérifiez que l'utilisateur courant est bien participant de `conv_id`. Si non, `HTTPException` (403).
        - Récupérez l'objet `User` de l'utilisateur à ajouter (`userId` du body). Si non trouvé, `HTTPException` (404).
        - Vérifiez que l'utilisateur à ajouter n'est pas déjà participant. Si oui, `HTTPException` (409 Conflict).
        - Créez une nouvelle instance de `Participant` avec `conversation_id`, `user_id` (de l'utilisateur ajouté), et `encryptedSessionKey` (fournie dans le body, décodée si nécessaire).
        - Ajoutez le nouveau participant à la session et commitez.
        - **Action Post-Commit :** Déclenchez la notification WebSocket `participantAdded` (voir Tâche 10.3).
        - Retournez une réponse de succès (ex: 200 OK avec `{"message": "Participant added"}`).
    - **Vérification :** Une requête POST authentifiée par un membre ajoute correctement un nouveau participant à la conversation dans la DB. Les erreurs (non membre, utilisateur inconnu, déjà membre) sont gérées.

- [ ] **Tâche 10.2 : Implémenter l'endpoint `PUT /conversations/{conv_id}/session_key` pour la rotation de clé.**
    - **Instruction :** Dans le routeur `conversations.py`, implémentez l'endpoint qui permet de mettre à jour les clés de session chiffrées pour les participants restants, typiquement après qu'un client ait initié un retrait de membre et généré une nouvelle clé.
    - [ ] **Sous-tâche 10.2.1 :** Définir l'endpoint.
        - Définissez l'endpoint `PUT /{conv_id}/session_key` qui prend un `SessionKeyUpdateRequest` en body.
        - Protégez avec `Depends(get_current_user)`. Récupérez `current_username`.
    - [ ] **Sous-tâche 10.2.2 :** Implémenter la logique métier.
        - Récupérez la session DB et l'utilisateur courant.
        - Vérifiez que l'utilisateur courant est bien l'un des `participants` listés dans le body (ou a des droits d'admin, non spécifiés ici). Si non, `HTTPException` (403).
        - Récupérez tous les participants actuels de la conversation depuis la DB.
        - **Gestion des participants :**
            - Identifiez les participants à retirer (ceux présents dans la DB mais absents de la liste `participants` du body).
            - Identifiez les participants à mettre à jour (ceux présents dans la liste `participants` du body).
        - Pour chaque participant à mettre à jour (`username` dans `newEncryptedKeys`) :
            - Trouvez l'enregistrement `Participant` correspondant dans la DB.
            - Mettez à jour son champ `encrypted_session_key` avec la nouvelle clé fournie (décodée si nécessaire).
        - Pour chaque participant à retirer :
            - Supprimez son enregistrement `Participant` de la session (`await session.delete(participant_to_remove)`).
        - Commitez la transaction.
        - **Action Post-Commit :** Déclenchez la notification WebSocket `keyRotation` (voir Tâche 10.3). Identifiez qui a été retiré (si applicable) pour l'inclure dans la notification.
        - Retournez une réponse de succès (ex: 200 OK avec `{"message": "Session key updated and participants managed"}`).
    - **Vérification :** Une requête PUT authentifiée met à jour les clés chiffrées des participants spécifiés et supprime les participants non listés. Les erreurs (non autorisé, conversation non trouvée) sont gérées.

- [ ] **Tâche 10.3 : Implémenter la diffusion WebSocket pour les événements de participants.**
    - **Instruction :** Modifiez le `ConnectionManager` (ou la logique équivalente) et les endpoints précédents pour diffuser les événements `participantAdded` et `keyRotation` aux clients concernés.
    - [ ] **Sous-tâche 10.3.1 :** Diffuser `participantAdded`.
        - **Modification :** Dans la logique post-commit de la Tâche 10.1 (`POST /conversations/{conv_id}/participants`).
        - **Action :**
            1. Récupérez la liste des `username` de TOUS les participants de la conversation (incluant le nouveau).
            2. Récupérez la clé publique de l'utilisateur ajouté (`new_participant.user.public_key`). Encodez-la.
            3. Préparez le payload WebSocket de type `participantAdded` (voir specs 5.2.2) : `{ type: "participantAdded", data: { conversationId, userId: new_participant_username, addedBy: current_username, publicKey: encoded_pk } }`.
            4. **Important :** La spec mentionne aussi `encryptedSessionKey` dans la notif. C'est la clé chiffrée *pour le destinataire de la notif*. Le serveur ne l'a pas directement. Simplification : Ne pas envoyer `encryptedSessionKey` dans la notif. Le client qui reçoit la notif devra récupérer la clé via un appel API s'il ne l'a pas (cas où il était hors ligne). **Alternative :** Modifier la Tâche 10.1 pour que le client initiateur fournisse la clé chiffrée pour *tous* les participants existants en plus de celle du nouveau (complexe). **Décision :** On s'en tient à la simplification pour l'instant.
            5. Appelez `await manager.send_to_participants(payload, all_participant_usernames)`.
    - [ ] **Sous-tâche 10.3.2 :** Diffuser `keyRotation`.
        - **Modification :** Dans la logique post-commit de la Tâche 10.2 (`PUT /conversations/{conv_id}/session_key`).
        - **Action :**
            1. Identifiez le(s) `username`(s) du/des participant(s) retiré(s) (`removedUserIds`).
            2. Identifiez la liste des `username` des participants restants (`remaining_participant_usernames`).
            3. Pour chaque `username` dans `remaining_participant_usernames` :
                a. Récupérez la `newEncryptedSessionKey` qui lui est destinée depuis la requête initiale ou la DB mise à jour. Encodez-la.
                b. Préparez le payload WebSocket de type `keyRotation` : `{ type: "keyRotation", data: { conversationId, removedUserId: removedUserIds[0] if removedUserIds else None, remainingParticipants: remaining_participant_usernames, newEncryptedSessionKey: encoded_new_key_for_recipient } }`.
                c. Envoyez ce payload *spécifiquement* à cet utilisateur : `await manager.send_personal_message(payload, username)`. (Ou adaptez `send_to_participants` pour gérer des messages personnalisés).
            4. Pour chaque `username` dans `removedUserIds` (si applicable) :
                a. Préparez un payload de notification de retrait simple : `{ type: "removedFromConversation", data: { conversationId } }`.
                b. Envoyez ce payload à l'utilisateur retiré : `await manager.send_personal_message(payload, removed_username)`.
    - **Vérification :** L'ajout d'un participant déclenche une notification `participantAdded` à tous les membres. La mise à jour/rotation de clé déclenche une notification `keyRotation` (avec la nouvelle clé chiffrée spécifique) aux membres restants et une notification de retrait aux membres supprimés.

---
**Fin du Bloc 10.** Les endpoints backend pour ajouter des participants et gérer la rotation de clé (suite à un retrait) sont implémentés. Les notifications WebSocket correspondantes sont envoyées aux clients concernés.