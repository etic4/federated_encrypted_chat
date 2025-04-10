# Plan d'Implémentation - Bloc 05 : Frontend - Authentification Utilisateur

**Objectif :** Implémenter l'interface utilisateur et la logique côté client pour l'inscription, la connexion (incluant les opérations cryptographiques KDF, déchiffrement de clé, signature), le changement de mot de passe, et la gestion de l'état d'authentification.

**Référence Spécifications :** Section [2.1 Gestion des Utilisateurs](specifications_techniques.md#21-gestion-des-utilisateurs), Section [4.3 Composant Frontend](specifications_techniques.md#43-composant-frontend), Section [5.1.2 Endpoints /auth](specifications_techniques.md#512-endpoints-auth), Section [6.1 Cryptographie](specifications_techniques.md#61-cryptographie).

---

- [x] **Tâche 5.1 : Créer les pages et composants UI pour l'inscription et la connexion.**
    - **Instruction :** Créez les pages Nuxt (`register.vue`, `login.vue`) et les composants Vue nécessaires (ex: formulaires) en utilisant les composants Shadcn-Vue (`Input`, `Button`, `Card`, etc.).
    - [x] **Sous-tâche 5.1.1 :** Créer la page `frontend/pages/register.vue`.
        - Incluez un formulaire avec des champs pour `username` et `password`.
        - Utilisez les composants Shadcn-Vue pour les champs et le bouton de soumission.
        - Gérez l'état local du formulaire (ex: avec `ref`).
        - Prévoyez un espace pour afficher les messages d'erreur.
    - [x] **Sous-tâche 5.1.2 :** Créer la page `frontend/pages/login.vue`.
        - Incluez un formulaire similaire à celui de l'inscription (`username`, `password`).
        - Utilisez les composants Shadcn-Vue.
        - Gérez l'état local du formulaire.
        - Prévoyez un espace pour afficher les messages d'erreur.
    - [x] **Sous-tâche 5.1.3 :** (Optionnel) Créer une page/composant pour le changement de mot de passe.
        - Incluez des champs pour l'ancien et le nouveau mot de passe.
    - **Vérification :** Les pages de connexion et d'inscription sont accessibles et affichent les formulaires correctement.

- [x] **Tâche 5.2 : Implémenter la logique d'inscription dans `useAuth` (appel crypto et API).**
    - **Instruction :** Créez le composable `frontend/composables/useAuth.ts`. Implémentez une fonction `registerUser` qui gère le processus d'inscription.
    - [x] **Sous-tâche 5.2.1 :** Créer le composable `useAuth.ts`.
        - Importez `useCrypto` (pour les fonctions crypto) et `useApi` (ou `$fetch` pour les appels API).
        - Définissez une fonction `registerUser(username, password)`.
    - [x] **Sous-tâche 5.2.2 :** Implémenter le flux d'inscription.
        - Dans `registerUser` :
            1. Appelez `useCrypto().generateIdentityKeyPair()` pour obtenir `publicKey`, `privateKey`.
            2. Appelez `useCrypto().generateKdfSalt()` pour obtenir `kdfSalt`.
            3. Appelez `useCrypto().deriveKeyFromPassword(password, kdfSalt)` pour obtenir `keyK`.
            4. Appelez `useCrypto().encryptPrivateKey(privateKey, keyK)` pour obtenir `{ ciphertext, nonce }` (Note: les specs ne mentionnaient pas le nonce pour la clé privée chiffrée, mais AES-GCM le nécessite. Il faudra adapter le backend ou utiliser un mode différent/concaténer nonce+ciphertext). **Décision : Concaténer nonce + ciphertext pour `encryptedPrivateKey`**. Mettez à jour `useCrypto` pour retourner cette concaténation et le backend pour la gérer.
            5. Encodez `publicKey`, `encryptedPrivateKey` (nonce+ciphertext), `kdfSalt` en Base64/Hex.
            6. Appelez l'API `POST /auth/register` avec les données formatées (username, clés encodées, sel encodé, `kdfParams` - à définir ou récupérer depuis libsodium si possible).
            7. Gérez la réponse (succès/erreur).
    - [x] **Sous-tâche 5.2.3 :** Connecter la logique à l'UI.
        - Dans `register.vue`, appelez `useAuth().registerUser` lors de la soumission du formulaire.
        - Affichez les messages d'erreur/succès et redirigez vers la page de login en cas de succès.
    - **Vérification :** Le formulaire d'inscription déclenche les opérations crypto et l'appel API. Les erreurs (username déjà pris, etc.) sont affichées. Un succès redirige l'utilisateur.

- [x] **Tâche 5.3 : Implémenter la logique de connexion dans `useAuth` (KDF, déchiffrement clé, signature challenge, appel API, stockage token/clé privée).**
    - **Instruction :** Implémentez une fonction `loginUser(username, password)` dans `useAuth.ts`.
    - [x] **Sous-tâche 5.3.1 :** Définir la fonction `loginUser`.
        - Ajoutez `loginUser(username, password)` dans `useAuth.ts`.
    - [x] **Sous-tâche 5.3.2 :** Implémenter le flux de connexion.
        - Dans `loginUser` :
            1. Appelez l'API `POST /auth/challenge` avec `{ username }`.
            2. Gérez les erreurs (ex: 404 User not found).
            3. Récupérez `challenge`, `publicKey`, `encryptedPrivateKey`, `kdfSalt`, `kdfParams` de la réponse. Décodez les données Base64/Hex.
            4. Appelez `useCrypto().deriveKeyFromPassword(password, kdfSalt)` pour obtenir `keyK`.
            5. Appelez `useCrypto().decryptPrivateKey(encryptedPrivateKey, keyK)` (en gérant la séparation nonce/ciphertext si concaténés).
            6. Si le déchiffrement échoue (mot de passe incorrect), affichez une erreur et arrêtez.
            7. Si succès, stockez la `privateKey` déchiffrée **en mémoire** (voir Tâche 5.5).
            8. Appelez `useCrypto().sign(challenge, privateKey)` pour obtenir `signature`.
            9. Encodez `challenge` et `signature` en Base64/Hex.
            10. Appelez l'API `POST /auth/verify` avec `{ username, challenge, signature }`.
            11. Gérez les erreurs (ex: 401 Invalid signature).
            12. Si succès, récupérez `accessToken`. Stockez le token (voir Tâche 5.5).
            13. Déclenchez la connexion WebSocket (voir Bloc 09).
            14. Indiquez le succès de la connexion (ex: mise à jour état Pinia).
    - [x] **Sous-tâche 5.3.3 :** Connecter la logique à l'UI.
        - Dans `login.vue`, appelez `useAuth().loginUser` lors de la soumission.
        - Affichez les erreurs.
        - En cas de succès, redirigez vers la page principale de chat (ex: `/`).
    - **Vérification :** Le formulaire de login exécute le flux complet : challenge, KDF, déchiffrement, signature, vérification. Les erreurs sont gérées. Un succès stocke le token/clé et redirige.

- [x] **Tâche 5.4 : Implémenter la logique de changement de mot de passe.**
    - **Instruction :** Implémentez une fonction `changePassword(oldPassword, newPassword)` dans `useAuth.ts`.
    - [x] **Sous-tâche 5.4.1 :** Définir la fonction `changePassword`.
    - [x] **Sous-tâche 5.4.2 :** Implémenter le flux.
        - Récupérez `kdfSalt`, `kdfParams`, `encryptedPrivateKey` (depuis l'état Pinia ou via un appel API si non stocké).
        - Dérivez `oldKeyK` avec `oldPassword`.
        - Tentez de déchiffrer `encryptedPrivateKey` avec `oldKeyK`. Si échec, erreur "Ancien mot de passe incorrect".
        - Récupérez la `privateKey` déchiffrée.
        - Dérivez `newKeyK` avec `newPassword`.
        - Rechiffrez `privateKey` avec `newKeyK` pour obtenir `newEncryptedPrivateKey` (nonce+ciphertext concaténés).
        - Encodez `newEncryptedPrivateKey` en Base64/Hex.
        - Appelez l'API `PUT /auth/change-password` (en incluant le token d'authentification) avec `{ newEncryptedPrivateKey }`.
        - Gérez la réponse.
    - [x] **Sous-tâche 5.4.3 :** Connecter à l'UI (si une UI dédiée est créée).
    - **Vérification :** La fonction permet de mettre à jour la clé privée chiffrée sur le serveur après avoir validé l'ancien mot de passe.

- [x] **Tâche 5.5 : Mettre en place la gestion de l'état d'authentification (Pinia store `auth.ts`).**
    - **Instruction :** Créez un store Pinia (`frontend/store/auth.ts`) pour gérer l'état lié à l'authentification.
    - [x] **Sous-tâche 5.5.1 :** Définir l'état du store.
        - Incluez des états pour : `isAuthenticated` (boolean), `user` (object | null - ex: `{ username, publicKey }`), `token` (string | null), `privateKey` (Uint8Array | null - **NON PERSISTÉ**), `kdfSalt` (Uint8Array | null), `kdfParams` (object | null).
    - [x] **Sous-tâche 5.5.2 :** Définir les actions du store.
        - `setAuthState({ isAuthenticated, user, token, privateKey, kdfSalt, kdfParams })` : Pour mettre à jour l'état après un login réussi.
        - `clearAuthState()` : Pour réinitialiser l'état lors de la déconnexion.
        - `setToken(token)` : Pour stocker le token (potentiellement dans `sessionStorage` si une persistance minimale est souhaitée, sinon en mémoire).
        - `setPrivateKey(key)` : Pour stocker la clé privée **uniquement en mémoire** (variable non réactive du store ou closure).
        - `setKdfInfo(salt, params)` : Pour stocker les infos KDF.
    - [x] **Sous-tâche 5.5.3 :** Définir les getters du store.
        - `isLoggedIn`: Retourne `isAuthenticated`.
        - `getUsername`: Retourne `user.username`.
        - `getAuthToken`: Retourne `token`.
        - `getPrivateKey`: Fonction qui retourne la clé privée stockée en mémoire.
        - `getKdfSalt`, `getKdfParams`.
    - [x] **Sous-tâche 5.5.4 :** Intégrer le store avec `useAuth`.
        - Le composable `useAuth` utilisera les actions et getters du store Pinia pour lire et écrire l'état d'authentification.
    - [x] **Sous-tâche 5.5.5 :** Mettre en place la persistance du token (optionnel, via `sessionStorage`).
        - Si une persistance minimale du login entre rechargements de page (mais pas fermeture de navigateur) est souhaitée, le token peut être stocké dans `sessionStorage` et rechargé à l'initialisation du store. **Attention :** La clé privée ne doit JAMAIS être persistée. L'utilisateur devra se reloguer si la clé privée n'est plus en mémoire.
    - [x] **Sous-tâche 5.5.6 :** Implémenter la déconnexion.
        - Ajoutez une fonction `logout()` dans `useAuth` qui appelle `clearAuthState()` dans le store Pinia, supprime le token de `sessionStorage` (si utilisé), et redirige vers la page de login.
    - **Vérification :** L'état d'authentification est géré de manière centralisée. Le login met à jour l'état, le logout le réinitialise. La clé privée est stockée uniquement en mémoire. Le token peut être optionnellement persisté dans `sessionStorage`.

---
**Fin du Bloc 05.** L'interface et la logique frontend pour l'inscription, la connexion (avec crypto), le changement de mot de passe et la gestion de l'état d'authentification (via Pinia) sont implémentées.