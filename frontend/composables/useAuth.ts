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
import type { AuthResponse, ChallengeResponse } from "~/types/models";

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
    // 1. Génère une paire de clés d'identité (asymétrique)
    const { publicKey, privateKey } = await useCrypto().generateIdentityKeyPair();

    // 2. Génère un sel pour la dérivation de clé (KDF)
    const kdfSalt = await useCrypto().generateKdfSalt();

    // 3. Dérive une clé symétrique à partir du mot de passe et du sel
    const keyDerivationResult = await useCrypto().deriveKeyFromPassword(password, kdfSalt as Uint8Array);
    const keyK = keyDerivationResult.key; // Clé symétrique dérivée
    const kdfParams = keyDerivationResult.params; // Paramètres KDF utilisés

    // 4. Chiffre la clé privée avec la clé dérivée (keyK)
    // Le résultat contient le nonce et le texte chiffré
    const encryptionResult = await useCrypto().encryptPrivateKey(privateKey, keyK);
    const ciphertext = encryptionResult.cipher;
    const nonce = encryptionResult.nonce;
    // Concatène nonce + ciphertext pour obtenir la clé privée chiffrée complète
    const encryptedPrivateKey = new Uint8Array([...nonce, ...ciphertext]);

    // 5. Encode toutes les données binaires en Base64 pour transmission API
    const crypto = useCrypto();
    const publicKeyEncoded = await crypto.toBase64(publicKey);
    const encryptedPrivateKeyEncoded = await crypto.toBase64(encryptedPrivateKey);
    const kdfSaltEncoded = await crypto.toBase64(kdfSalt as Uint8Array);
  
    // 6. Envoie les données d'inscription au backend via l'API
    try {
      const response = await useApiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
          username,
          publicKey: publicKeyEncoded,
          encryptedPrivateKey: encryptedPrivateKeyEncoded,
          kdfSalt: kdfSaltEncoded,
          kdfParams: kdfParams,
        },
      });

      // 7. Stocke les informations utilisateur et les clés dans le store local
      authStore.setAuthState({
        username,
        email: response.email,
        id: response.userId,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
      }, response.token);
      
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
    try {
      // 1. Demande un challenge au backend pour l'utilisateur
      const challengeResponse = await useApiFetch<ChallengeResponse>("/auth/challenge", {
        method: "POST",
        body: { username }
      });

      // 2. Récupère et décode les données nécessaires depuis la réponse
      const {
        challenge,               // Challenge à signer (Base64)
        encryptedPrivateKey,     // Clé privée chiffrée (Base64)
        kdfSalt,                 // Sel KDF (Base64)
        kdfParams                // Paramètres KDF (objet)
      } = challengeResponse;

      const crypto = useCrypto();
      // Décodage des données Base64 en Uint8Array
      const challengeBytes = await crypto.fromBase64(challenge);
      const encryptedPrivateKeyBytes = await crypto.fromBase64(encryptedPrivateKey);
      const kdfSaltBytes = await crypto.fromBase64(kdfSalt);

      // 3. Dérive la clé symétrique à partir du mot de passe et du sel KDF
      const { key: keyK } = await useCrypto().deriveKeyFromPassword(password, kdfSaltBytes);

      // 4. Déchiffre la clé privée à l'aide de la clé dérivée
      // Le nonce est stocké dans les 24 premiers octets, le reste est le texte chiffré
      const nonce = encryptedPrivateKeyBytes.slice(0, 24);
      const ciphertext = encryptedPrivateKeyBytes.slice(24);
      const privateKey = await useCrypto().decryptPrivateKey(ciphertext, keyK, nonce);

      // 5. Signe le challenge avec la clé privée pour prouver la possession
      const signature = await crypto.sign(challengeBytes, privateKey);
      const signatureEncoded = await crypto.toBase64(signature);

      // 6. Envoie la signature au backend pour vérification et obtention du token
      const verifyResponse = await useApiFetch<AuthResponse>("/auth/verify", {
        method: "POST",
        body: {
          username,
          challenge,
          signature: signatureEncoded
        }
      });

      // 7. Stocke les informations utilisateur et la clé privée dans le store local
      authStore.setAuthState({
        username,
        email: verifyResponse.email,
        id: verifyResponse.userId,
        createdAt: verifyResponse.createdAt,
        updatedAt: verifyResponse.updatedAt
      }, verifyResponse.token);
      
      // Stocke la clé privée et les infos KDF pour la session
      authStore.setPrivateKey(privateKey);
      authStore.setKdfInfo(kdfSaltBytes, kdfParams);
      
      return verifyResponse;
    } catch (error) {
      // Gestion d'erreur lors de la connexion
      console.error("Login error:", error);
      throw error;
    }
  };

  // Expose les fonctions principales du composable
  return {
    registerUser,
    loginUser,
  };
};