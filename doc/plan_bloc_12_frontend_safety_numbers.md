# Plan d'Implémentation - Bloc 12 : Frontend - Vérification des Clés (Numéros de Sécurité)

**Objectif :** Implémenter la fonctionnalité permettant aux utilisateurs de vérifier l'authenticité des clés publiques de leurs contacts via la comparaison hors bande de "Numéros de Sécurité". Gérer l'état de vérification et les alertes en cas de changement de clé.

**Référence Spécifications :** Section [2.4.1 Vérification des Clés Publiques (Numéros de Sécurité)](specifications_techniques.md#241-vérification-des-clés-publiques-numéros-de-sécurité), Section [6.1.6 Vérification de l'Authenticité des Clés Publiques](specifications_techniques.md#616-vérification-de-lauthenticité-des-clés-publiques), Section [5.2.2 Messages Serveur -> Client](specifications_techniques.md#522-messages-serveur---client) (publicKeyChanged).

---

- [ ] **Tâche 12.1 : Implémenter le calcul des numéros de sécurité dans `useCrypto`.**
    - **Instruction :** Ajoutez la fonction de calcul des numéros de sécurité au composable `useCrypto.ts`.
    - [ ] **Sous-tâche 12.1.1 :** Définir la fonction `calculateSafetyNumber`.
        - **Fonction Signature :** `calculateSafetyNumber(myPublicKey: Uint8Array, theirPublicKey: Uint8Array, myId: string, theirId: string): string`
        - **Note :** Les IDs sont inclus pour assurer un ordre de concaténation stable et unique.
    - [ ] **Sous-tâche 12.1.2 :** Implémenter la logique de calcul.
        - Convertissez les clés publiques (`myPublicKey`, `theirPublicKey`) en une représentation stable (ex: Base64 ou Hex).
        - Déterminez un ordre de concaténation stable basé sur les IDs (ex: concaténer `ID1 || PK1 || ID2 || PK2` où ID1 est lexicographiquement inférieur à ID2).
        - Concaténez les chaînes résultantes.
        - Convertissez la chaîne concaténée en `Uint8Array` (UTF-8).
        - Hashez le `Uint8Array` avec SHA-512 : `hash = sodium.crypto_hash_sha512(dataToHash)`.
        - Prenez une partie suffisamment longue du hash (ex: les 30 premiers bytes = 240 bits).
        - Formatez ces bytes en une chaîne de chiffres décimaux lisible :
            - Itérez sur les bytes tronqués.
            - Pour chaque groupe de N bits (ex: 10 bits pour avoir des nombres < 1024, ou utiliser des opérations sur des entiers plus grands), convertissez en nombre décimal.
            - Concaténez ces nombres (avec des zéros de padding si nécessaire pour avoir une longueur fixe par groupe, ex: 4 chiffres par groupe de 10 bits).
            - Insérez des espaces tous les X chiffres pour la lisibilité (ex: tous les 4 ou 5 chiffres pour faire des groupes). Viser environ 60 chiffres au total (ex: 6 groupes de 10 chiffres, ou 12 groupes de 5).
        - Retournez la chaîne formatée.
    - **Vérification :** La fonction `calculateSafetyNumber` existe dans `useCrypto` et retourne une chaîne de chiffres formatée de manière déterministe à partir des entrées.

- [ ] **Tâche 12.2 : Créer le composant UI (modal) pour afficher les numéros de sécurité.**
    - **Instruction :** Créez un composant modal Vue pour afficher le numéro de sécurité et permettre à l'utilisateur de marquer la vérification comme effectuée.
    - [ ] **Sous-tâche 12.2.1 :** Créer `SafetyNumberModal.vue`.
        - **Emplacement :** `frontend/components/SafetyNumberModal.vue`
        - **Props :** Accepte l'`conversationId` et le `participantUsername` (ou l'objet participant complet) pour lequel afficher le numéro.
    - [ ] **Sous-tâche 12.2.2 :** Calculer et afficher le numéro.
        - Dans le composant, lorsque ouvert :
            - Récupérez la clé publique de l'utilisateur courant (`myPublicKey`, `myId`) depuis `authStore`.
            - Récupérez la clé publique du participant (`theirPublicKey`, `theirId`) (peut nécessiter un appel API `GET /users/{username}/public_key` si non déjà stockée localement).
            - Appelez `useCrypto().calculateSafetyNumber(...)` avec les clés et IDs.
            - Affichez le numéro formaté de manière proéminente.
            - Affichez également les usernames des deux participants concernés.
    - [ ] **Sous-tâche 12.2.3 :** Ajouter l'option de marquer comme "vérifié".
        - Ajoutez une checkbox ou un bouton "Marquer comme vérifié".
        - Lorsque l'utilisateur clique, émettez un événement (ex: `@mark-verified`) avec `conversationId` et `participantUsername`.
        - Affichez l'état de vérification actuel (si déjà vérifié ou non) récupéré depuis le store (voir Tâche 12.3).
    - [ ] **Sous-tâche 12.2.4 :** Intégrer le déclencheur du modal.
        - Ajoutez un bouton/lien "Vérifier la sécurité" dans les détails de la conversation ou à côté du nom du participant dans `ParticipantManager.vue` pour ouvrir ce modal.
    - **Vérification :** Le modal s'ouvre, calcule et affiche correctement le numéro de sécurité formaté. Le bouton/checkbox pour marquer comme vérifié est présent.

- [ ] **Tâche 12.3 : Gérer l'état de vérification et les alertes de changement de clé.**
    - **Instruction :** Modifiez le store Pinia des conversations pour stocker l'état de vérification et gérez les notifications de changement de clé publique.
    - [ ] **Sous-tâche 12.3.1 :** Ajouter l'état de vérification au store.
        - **Modification :** `frontend/store/conversations.ts`.
        - **Ajouter l'état :** `verifiedParticipants: Ref<Record<number, Set<string>>>` - Un dictionnaire mappant `conversationId` à un `Set` contenant les `username` des participants dont la clé a été vérifiée par l'utilisateur courant dans cette conversation. **Stocker en mémoire uniquement.**
        - **Ajouter Action :** `markParticipantAsVerified(conversationId: number, username: string)` - Ajoute le `username` au `Set` correspondant.
        - **Ajouter Action :** `unverifyParticipant(conversationId: number, username: string)` - Retire le `username` du `Set`.
        - **Ajouter Action :** `unverifyAllForConversation(conversationId: number)` - Vide le `Set` pour une conversation.
        - **Ajouter Action :** `clearVerifiedStatus()` - Vide tout l'état (au logout).
        - **Ajouter Getter :** `isParticipantVerified(conversationId: number, username: string): boolean` - Vérifie si un participant est dans le `Set`.
    - [ ] **Sous-tâche 12.3.2 :** Connecter le modal au store.
        - Lorsque l'événement `@mark-verified` est émis par `SafetyNumberModal.vue`, appelez l'action `conversationStore.markParticipantAsVerified(...)`.
    - [ ] **Sous-tâche 12.3.3 :** Gérer la notification `publicKeyChanged`.
        - **Modification :** Handler `onmessage` dans `useWebSocket.ts`.
        - Lorsque le type `publicKeyChanged` est reçu :
            1. Extrayez `userId` (le username dont la clé a changé) et `newPublicKey`.
            2. Itérez sur toutes les conversations dans `conversationStore.conversations`.
            3. Pour chaque conversation contenant `userId` :
                a. Appelez `conversationStore.unverifyParticipant(conversationId, userId)`.
                b. (Optionnel) Stockez une notification à afficher à l'utilisateur indiquant que la clé de `userId` a changé dans cette conversation et qu'une nouvelle vérification est nécessaire.
            4. Mettez à jour la clé publique stockée localement pour cet utilisateur si vous avez un cache local (sinon elle sera récupérée via API au besoin).
    - [ ] **Sous-tâche 12.3.4 :** Afficher l'état de vérification dans l'UI.
        - Dans `ParticipantManager.vue` ou la liste des participants, utilisez le getter `conversationStore.isParticipantVerified(...)` pour afficher une icône (ex: coche verte) à côté des participants vérifiés.
        - Affichez un avertissement si une clé a changé et n'est plus vérifiée.
    - **Vérification :** L'état de vérification est stocké et mis à jour correctement. Le changement de clé publique d'un contact invalide l'état de vérification pour toutes les conversations partagées et une notification (visuelle ou autre) est potentiellement affichée. L'état de vérification est visible dans l'UI.

---
**Fin du Bloc 12.** La fonctionnalité de vérification des clés publiques via les numéros de sécurité est implémentée, incluant le calcul, l'affichage UI, la gestion de l'état de vérification et la réaction aux changements de clés signalés par le serveur.