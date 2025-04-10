# Plan d'Implémentation - Bloc 03 : Frontend - Initialisation et Utilitaires Crypto

**Objectif :** Mettre en place la base du projet frontend Nuxt.js, intégrer la bibliothèque de composants UI Shadcn-Vue, et implémenter le composable `useCrypto` contenant toutes les fonctions cryptographiques nécessaires en utilisant `libsodium-wrappers`.

**Référence Spécifications :** Section [1.4 Stack Technologique](specifications_techniques.md#14-stack-technologique), Section [4.3 Composant Frontend](specifications_techniques.md#43-composant-frontend), Section [6.1 Cryptographie](specifications_techniques.md#61-cryptographie).

---

- [x] **Tâche 3.1 : Initialiser le projet Nuxt.js avec TypeScript, TailwindCSS.**
    - **Statut :** Normalement complété lors de la Sous-tâche 1.1.3.
    - **Instruction :** Vérifiez que le projet Nuxt dans le dossier `frontend` est fonctionnel, que TypeScript est configuré, et que TailwindCSS est installé et configuré (via `@nuxtjs/tailwindcss`).
    - **Vérification :** La commande `npm run dev` (ou équivalent) dans `frontend/` démarre le serveur de développement Nuxt sans erreur. Le fichier `tailwind.config.js` existe.

- [x] **Tâche 3.2 : Intégrer Shadcn-Vue pour les composants UI.**
    - **Instruction :** Utilisez le CLI de Shadcn-Vue pour initialiser la bibliothèque dans le projet Nuxt. Configurez les options de base (style, répertoire des composants, etc.) selon les préférences ou les standards du projet.
    - **Commande :**
      ```bash
      # Depuis le dossier frontend/
      npx shadcn-vue@latest init
      ```
    - Suivez les invites du CLI pour configurer (ex: style `Default`, couleur de base `Slate`, chemin des composants `~/components/ui`, etc.).
    - **Instruction :** Installez quelques composants de base pour tester (ex: `Button`, `Input`).
    - **Commande :**
      ```bash
      npx shadcn-vue@latest add button input card # etc.
      ```
    - **Vérification :** Les composants sont ajoutés dans le répertoire configuré (ex: `frontend/components/ui/`). Vous pouvez importer et utiliser `<Button />` dans une page de test.

- [x] **Tâche 3.3 : Implémenter le composable `useCrypto` avec `libsodium-wrappers`.**
    - **Instruction :** Créez le fichier `frontend/composables/useCrypto.ts`. Ce composable exposera toutes les fonctions cryptographiques nécessaires, en utilisant `libsodium-wrappers`. Assurez-vous que libsodium est correctement initialisé.
    - [x] **Sous-tâche 3.3.1 :** Initialisation de Libsodium.
        - **Instruction :** `libsodium-wrappers` doit être initialisé avant utilisation (c'est une opération asynchrone). Créez un plugin Nuxt ou une logique dans le composable pour garantir que `sodium.ready` est résolu avant que les fonctions crypto ne soient appelées. Utilisez une variable globale ou un état partagé pour stocker l'instance initialisée de `sodium`.
        - **Exemple (Plugin Nuxt `frontend/plugins/sodium.client.ts`) :**
          ```typescript
          import sodium from 'libsodium-wrappers';

          export default defineNuxtPlugin(async (nuxtApp) => {
            await sodium.ready;
            // Rendre sodium accessible globalement si nécessaire, ou via provide/inject
            nuxtApp.provide('sodium', sodium);
            console.log('Libsodium initialized!');
          });
          ```
        - **Note :** Le `.client.ts` assure que cela ne s'exécute que côté client.
    - [x] **Sous-tâche 3.3.2 :** Implémenter la génération de clés d'identité.
        - **Fonction :** `generateIdentityKeyPair()` -> `{ publicKey: Uint8Array, privateKey: Uint8Array }`
        - **Implémentation :** Utilise `sodium.crypto_sign_keypair()` (pour Ed25519) et potentiellement `sodium.crypto_kx_keypair()` (pour X25519 si besoin d'échange de clé séparé). Retourne les clés brutes (Uint8Array).
        - **Référence Specs :** 6.1.1, 6.1.2.
    - [x] **Sous-tâche 3.3.3 :** Implémenter la dérivation de clé depuis mot de passe (KDF).
        - **Fonction :** `deriveKeyFromPassword(password: string, salt: Uint8Array)` -> `Promise<Uint8Array>` (la clé de chiffrement `keyK`)
        - **Implémentation :** Utilise `sodium.crypto_pwhash()` avec `sodium.crypto_pwhash_ALG_DEFAULT` (qui correspond à Argon2id dans les versions récentes). Utilisez des paramètres de coût robustes (ex: `opslimit_interactive`, `memlimit_interactive`). Retourne la clé dérivée (ex: 32 bytes pour AES-256).
        - **Référence Specs :** 6.1.1, 6.1.2.
        - **Note :** Les paramètres KDF (`kdfParams` des specs) sont gérés par libsodium via les constantes `opslimit`/`memlimit`. Le `salt` doit être généré aléatoirement (voir sous-tâche suivante).
    - [x] **Sous-tâche 3.3.4 :** Implémenter la génération de sel KDF.
        - **Fonction :** `generateKdfSalt()` -> `Uint8Array`
        - **Implémentation :** Utilise `sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)`.
        - **Référence Specs :** 2.1.1, 6.1.2.
    - [x] **Sous-tâche 3.3.5 :** Implémenter le chiffrement/déchiffrement de la clé privée.
        - **Fonction :** `encryptPrivateKey(privateKey: Uint8Array, keyK: Uint8Array)` -> `{ ciphertext: Uint8Array, nonce: Uint8Array }`
        - **Fonction :** `decryptPrivateKey(ciphertext: Uint8Array, nonce: Uint8Array, keyK: Uint8Array)` -> `Promise<Uint8Array | null>` (null si échec)
        - **Implémentation :** Utilise `sodium.crypto_aead_aes256gcm_encrypt()` et `sodium.crypto_aead_aes256gcm_decrypt()`. Génère un nonce aléatoire (`sodium.randombytes_buf(sodium.crypto_aead_aes256gcm_NPUBBYTES)`) pour chaque chiffrement. Gère les erreurs de déchiffrement (qui lèvent une exception dans libsodium).
        - **Référence Specs :** 6.1.1, 6.1.2.
    - [x] **Sous-tâche 3.3.6 :** Implémenter la génération de clé de session.
        - **Fonction :** `generateSessionKey()` -> `Uint8Array`
        - **Implémentation :** Utilise `sodium.crypto_secretbox_keygen()` ou `sodium.randombytes_buf(32)`.
        - **Référence Specs :** 6.1.1, 6.1.3.
    - [x] **Sous-tâche 3.3.7 :** Implémenter le chiffrement/déchiffrement asymétrique (pour clés de session).
        - **Fonction :** `encryptAsymmetric(data: Uint8Array, recipientPublicKey: Uint8Array, senderPrivateKey: Uint8Array)` -> `Promise<Uint8Array>` (ciphertext combinant nonce+chiffré)
        - **Fonction :** `decryptAsymmetric(ciphertext: Uint8Array, senderPublicKey: Uint8Array, recipientPrivateKey: Uint8Array)` -> `Promise<Uint8Array | null>`
        - **Implémentation :** Utilise `sodium.crypto_box_seal()` et `sodium.crypto_box_seal_open()` (chiffrement anonyme, ne nécessite que la clé publique du destinataire pour chiffrer) ou `sodium.crypto_box_easy()` / `sodium.crypto_box_open_easy()` (chiffrement authentifié nécessitant la clé privée de l'expéditeur et la clé publique du destinataire). `crypto_box_seal` est plus adapté pour la distribution de clés de session où l'expéditeur n'a pas besoin de prouver son identité à ce stade. Assurez-vous que les clés publiques/privées utilisées sont compatibles (X25519, converties depuis Ed25519 si nécessaire via `sodium.crypto_sign_ed25519_pk_to_curve25519` et `..._sk_to_curve25519`).
        - **Référence Specs :** 6.1.1, 6.1.3, 2.2.1.
    - [x] **Sous-tâche 3.3.8 :** Implémenter le chiffrement/déchiffrement des messages (symétrique).
        - **Fonction :** `encryptMessage(sessionKey: Uint8Array, plaintext: string, associatedData?: Uint8Array)` -> `{ ciphertext: Uint8Array, nonce: Uint8Array }`
        - **Fonction :** `decryptMessage(sessionKey: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array, associatedData?: Uint8Array)` -> `Promise<string | null>`
        - **Implémentation :** Utilise `sodium.crypto_aead_aes256gcm_encrypt()` et `..._decrypt()`. Convertit le `plaintext` (string) en `Uint8Array` (UTF-8) avant chiffrement, et inversement après déchiffrement. Génère un nonce aléatoire pour chaque chiffrement.
        - **Référence Specs :** 6.1.1, 6.1.5, 2.3.1, 2.3.2.
    - [x] **Sous-tâche 3.3.9 :** Implémenter la signature et la vérification.
        - **Fonction :** `sign(data: Uint8Array, privateKey: Uint8Array)` -> `Uint8Array` (signature)
        - **Fonction :** `verifySignature(signature: Uint8Array, data: Uint8Array, publicKey: Uint8Array)` -> `boolean`
        - **Implémentation :** Utilise `sodium.crypto_sign_detached()` et `sodium.crypto_sign_verify_detached()`. Utilise la clé privée/publique Ed25519.
        - **Référence Specs :** 6.1.1, 6.1.4, 2.1.2.
    - [x] **Sous-tâche 3.3.10 :** Implémenter le calcul des numéros de sécurité.
        - **Fonction :** `calculateSafetyNumber(myPublicKey: Uint8Array, theirPublicKey: Uint8Array, myId: string, theirId: string)` -> `string` (numéro formaté)
        - **Implémentation :** Concatène les IDs et clés publiques (converties en format comparable, ex: hex) dans un ordre défini. Hashe avec SHA-512 (`sodium.crypto_hash_sha512`). Prend une partie du hash (ex: 30 bytes = 240 bits). Formate ces bytes en une chaîne de chiffres décimaux groupés (ex: 12 groupes de 5 chiffres).
        - **Référence Specs :** 6.1.1, 6.1.6, 2.4.1.
    - [x] **Sous-tâche 3.3.11 :** Ajouter des utilitaires d'encodage/décodage.
        - **Fonctions :** `toBase64(data: Uint8Array)`, `fromBase64(str: string)`, `toHex(data: Uint8Array)`, `fromHex(str: string)`, `stringToUint8Array(str: string)`, `uint8ArrayToString(data: Uint8Array)`.
        - **Implémentation :** Utilise les fonctions de `libsodium-wrappers` (`sodium.to_base64`, `sodium.from_base64`, etc.) ou les API Web standard (`btoa`/`atob` avec gestion UTF-8, `TextEncoder`/`TextDecoder`).
    - **Vérification :** Le composable `useCrypto` est créé dans `frontend/composables/`. Il expose toutes les fonctions listées avec les signatures correctes. Libsodium est initialisé correctement via un plugin Nuxt. Les fonctions utilisent `libsodium-wrappers` comme prévu.

---
**Fin du Bloc 03.** Le projet frontend est initialisé avec Nuxt, TypeScript, Tailwind et Shadcn-Vue. Le composable `useCrypto` est implémenté avec toutes les primitives cryptographiques nécessaires basées sur `libsodium-wrappers`.