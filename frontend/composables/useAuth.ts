/**
 * Composable d'authentification pour la gestion sécurisée des utilisateurs.
 *
 * Fournit les fonctions registerUser et loginUser pour :
 * - Enregistrer un nouvel utilisateur avec génération et chiffrement de clés cryptographiques.
 * - Authentifier un utilisateur via un challenge signé, en déchiffrant la clé privée côté client.
 *
 * Toutes les opérations cryptographiques (génération de clés, dérivation, chiffrement/déchiffrement)
 * sont réalisées côté client pour garantir la confidentialité de la clé privée.
 * Les informations sensibles (clé privée, sel KDF, paramètres KDF) sont stockées dans le store local.
 *
 *
 * Sécurité :
 * - La clé privée n'est jamais transmise en clair au backend.
 * - Le mot de passe sert uniquement à dériver une clé de chiffrement locale.
 * - L'authentification se fait par challenge signé.
 */

import { useCrypto } from "./useCrypto";
import { useAuthStore } from "~/stores/auth";
import { useApiFetch } from "./useApiFetch";
import type { AuthResponseOK, ChallengeResponse, Token } from "~/types/models";

export const useAuth = () => {
  // Récupère le store d'authentification (état global utilisateur)
  const authStore = useAuthStore();
  // Initialise l'état d'auth depuis le stockage local (persistant)
  authStore.initializeFromStorage();
  
  /**
   * Inscription d'un nouvel utilisateur.
   * - Génère une paire de clés (publique/privée) pour l'identité.
   * - Dérive une clé de chiffrement à partir du mot de passe et d'un sel KDF.
   * - Chiffre la clé privée avec la clé dérivée.
   * - Encode toutes les données sensibles en Base64.
   * - Envoie les données au backend pour création du compte.
   * - Stocke les infos et clés localement dans le store.
   *
   * @param username Nom d'utilisateur
   * @param password Mot de passe (utilisé uniquement côté client)
   */
  const registerUser = async (username: string, password: string) => {
    const crypto = useCrypto();

    // 1. Génère une paire de clés d'identité et de login 
    const { publicKey, privateKey } = await crypto.generateIdentityKeyPair();
    const { publicKey: loginPublicKey, privateKey: loginPrivateKey } = await crypto.generateLoginKeyPair();

    // 2. Génère un sel pour la dérivation de clé (KDF)
    const kdfSalt = await crypto.generateKdfSalt();

    // 3. Dérive une clé symétrique à partir du mot de passe et du sel
    const { key: keyK, kdfParams } = await crypto.deriveKeyFromPassword(password, kdfSalt); // Updated to include kdfParams

    // 4. Chiffre les clés privées (login et identité) avec la clé dérivée (keyK)
    // Le résultat correspond à la concaténation du nonce et de la clé chiffrée
    const encryptedPrivateKey = await crypto.encryptPrivateKey(privateKey, keyK);
    const encryptedLoginPrivateKey = await crypto.encryptPrivateKey(loginPrivateKey, keyK);


    // 5. Encode toutes les données binaires en Base64 pour transmission API
    
    const publicKeyEncoded = await crypto.toBase64(publicKey);
    const loginPublicKeyEncoded = await crypto.toBase64(loginPublicKey);
    const encryptedPrivateKeyEncoded = await crypto.toBase64(encryptedPrivateKey);
    const encryptedLoginPrivateKeyEncoded = await crypto.toBase64(encryptedLoginPrivateKey);
    const kdfSaltEncoded = await crypto.toBase64(kdfSalt);
    
    console.log("Registration - Private Key:", await crypto.toHex(privateKey));
    console.log("Registration - Keyk: (hex)", await crypto.toHex(keyK));
    console.log("Registration - Encrypted Private Key (hex):", await crypto.toHex(encryptedPrivateKey));
    console.log("Registration - Encrypted Login Private Key (hex):", await crypto.toHex(encryptedLoginPrivateKey));
    console.log("Registration - KDF Salt (hex):", await crypto.toHex(kdfSalt));
  
    // 6. Envoie les données d'inscription au backend via l'API
    try {
      const response = await useApiFetch<AuthResponseOK>("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: {
          username,
          publicKey: publicKeyEncoded,
          loginPublicKey: loginPublicKeyEncoded,
          encryptedPrivateKey: encryptedPrivateKeyEncoded,
          encryptedLoginPrivateKey: encryptedLoginPrivateKeyEncoded,
          kdfSalt: kdfSaltEncoded,
          kdfParams: kdfParams,
        },
      });

      // 7. Stocke les informations utilisateur et les clés dans le store local
      authStore.setAuthState({
        username,
        id: response.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, response.accessToken);
      
      // Stocke les clés et infos KDF pour usage ultérieur (session)
      authStore.setPublicKey(publicKey);
      authStore.setPrivateKey(privateKey);
      authStore.setKdfInfo(kdfSalt, kdfParams);
      
      return response;
    } catch (error) {
      // Gestion d'erreur lors de l'inscription
      console.error("Error during registration:", error);
      throw error;
    }
  };

  /**
   * Connexion d'un utilisateur existant.
   * - Récupère le challenge et les données chiffrées depuis le backend.
   * - Déchiffre la clé privée localement à partir du mot de passe.
   * - Signe le challenge avec la clé privée.
   * - Vérifie l'authentification auprès du backend.
   * - Stocke les infos et la clé privée dans le store.
   *
   * @param username Nom d'utilisateur
   * @param password Mot de passe (utilisé uniquement côté client)
   */
  const loginUser = async (username: string, password: string) => {
      // 1. Demande un challenge au backend pour l'utilisateur
      const challengeResponse = await useApiFetch<ChallengeResponse>("/auth/challenge", {
        method: "POST",
        body: { username }
      });

      // 2. Récupère et décode les données nécessaires depuis la réponse
      const {
        challenge,               // Challenge à signer (Base64)
        encryptedLoginPrivateKey,     // Clé privée login chiffrée (Base64)
        encryptedPrivateKey,         // Clé privée chiffrée (Base64)
        kdfSalt,                 // Sel KDF (Base64)
        kdfParams                // Paramètres KDF (objet)
      } = challengeResponse;

      const crypto = useCrypto();

      // Décodage des données Base64 en Uint8Array
      const challengeBytes = await crypto.fromBase64(challenge);
      const encryptedLoginPrivateKeyBytes = await crypto.fromBase64(encryptedLoginPrivateKey);
      const kdfSaltBytes = await crypto.fromBase64(kdfSalt);

      console.log("Login - Encrypted Login Private Key (hex):", await crypto.toHex(encryptedLoginPrivateKeyBytes));
      console.log("Login - KDF Salt (hex):", await crypto.toHex(kdfSaltBytes));

      // 3. Dérive la clé symétrique à partir du mot de passe et du sel KDF
      const { key: keyK } = await useCrypto().deriveKeyFromPassword(password, kdfSaltBytes);

      console.log("Login - Keyk: (hex)", await crypto.toHex(keyK));
    
      // 4. Déchiffre la clé privée de login à l'aide de la clé dérivée
      // Le nonce est stocké dans les `sodium.crypto_secretbox_NONCEBYTES` premiers octets, le reste est le texte chiffré
      const loginPrivateKey = await useCrypto().decryptPrivateKey(encryptedLoginPrivateKeyBytes, keyK);

      // Vérification de l'échec du déchiffrement
      if (!loginPrivateKey) {
        // L'erreur est loggée dans decryptPrivateKey, on lève juste l'erreur ici
        throw new Error("Failed to decrypt private key. Check password or data integrity.");
      }
      console.log("Login - Private Key (hex):", await crypto.toHex(loginPrivateKey));

      // 5. Signe le challenge avec la clé privée delogin pour prouver la possession
      const signature = await crypto.sign(challengeBytes, loginPrivateKey);
      console.log("Login - Signature (hex):", await crypto.toHex(signature));
      const signatureEncoded = await crypto.toBase64(signature);
      console.log("Login - Signature (Base64):", signatureEncoded);

      try {
      // 6. Envoie la signature au backend pour vérification et obtention du token
      const verifyResponse = await useApiFetch<AuthResponseOK>("/auth/verify", {
        method: "POST",
        body: {
          username,
          challenge,
          signature: signatureEncoded
        }
      });
      console.log("Login - Verify Response:", verifyResponse);

      // TODO: Vérifier la réponse et gérer les erreurs

      // Déchiffre la clé privée d'identité reçue du backend
      const encryptedPrivateKeyBytes = await crypto.fromBase64(encryptedPrivateKey);
      const privateKey = await useCrypto().decryptPrivateKey(encryptedPrivateKeyBytes, keyK);
      if (!privateKey) {
        throw new Error("Failed to decrypt identity private key. Check password or data integrity.");
      }

      // 7. Stocke les informations utilisateur et la clé privée dans le store local
      authStore.setAuthState({
        username,
        id: verifyResponse.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, verifyResponse.accessToken);
      
      // Stocke la clé privée et les infos KDF pour la session
      authStore.setPrivateKey(privateKey);
      authStore.setKdfInfo(kdfSaltBytes, kdfParams);
      
      return verifyResponse;
      
      } catch (error) {
        console.error("Error during verification:", error);
        throw error;
      }

      
  };

  // Expose les fonctions principales du composable
  return {
    registerUser,
    loginUser,
  };
};