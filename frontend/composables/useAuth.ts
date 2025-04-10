import { useCrypto } from "./useCrypto";
import { Buffer } from 'node:buffer';
import type { KdfParams } from "~/types/kdfParams";
import { useAuthStore } from "~/stores/auth";

interface ChallengeResponse {
  challenge: string;
  publicKey: string;
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfParams: KdfParams;
}

interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export const useAuth = () => {
  const authStore = useAuthStore();
  authStore.initializeFromStorage();
  const registerUser = async (username: string, password: string) => {
    // 1. Appelez useCrypto().generateIdentityKeyPair() pour obtenir publicKey, privateKey.
    const { publicKey, privateKey } = await useCrypto().generateIdentityKeyPair();

    // 2. Appelez useCrypto().generateKdfSalt() pour obtenir kdfSalt.
    const kdfSalt = await useCrypto().generateKdfSalt();

    // 3. Appelez useCrypto().deriveKeyFromPassword(password, kdfSalt) pour obtenir keyK.
    const keyDerivationResult = await useCrypto().deriveKeyFromPassword(password, kdfSalt as Uint8Array);
    const keyK = keyDerivationResult.key;
    const kdfParams = keyDerivationResult.params;

    // 4. Appelez useCrypto().encryptPrivateKey(privateKey, keyK) pour obtenir { ciphertext, nonce }. Concaténez nonce + ciphertext pour encryptedPrivateKey.
    const encryptionResult = await useCrypto().encryptPrivateKey(privateKey, keyK);
    const ciphertext = encryptionResult.cipher;
    const nonce = encryptionResult.nonce;
    const encryptedPrivateKey = Buffer.concat([nonce, ciphertext]);

    // 5. Encodez publicKey, encryptedPrivateKey, kdfSalt en Base64/Hex.
    const publicKeyEncoded = Buffer.from(await publicKey).toString("base64");
    const encryptedPrivateKeyEncoded = Buffer.from(await encryptedPrivateKey).toString("base64");
    const kdfSaltEncoded = Buffer.from(await kdfSalt).toString("base64");

    // 6. Appelez l'API POST /auth/register avec les données formatées (username, clés encodées, sel encodé, kdfParams).
    try {
      const response = await $fetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
          username,
          publicKey: publicKeyEncoded,
          encryptedPrivateKey: encryptedPrivateKeyEncoded,
          kdfSalt: kdfSaltEncoded,
          kdfParams: kdfParams,
        },
      });

      // 7. Stockez les infos dans le store
      authStore.setAuthState({
        username,
        email: response.email,
        id: response.userId,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
      }, response.token);
      
      authStore.setPrivateKey(privateKey);
      authStore.setKdfInfo(kdfSaltEncoded, kdfParams);
      
      return response;
    } catch (error) {
      console.error("Error during registration:", error);
      throw error;
    }
  };

  const loginUser = async (username: string, password: string) => {
    try {
      // 1. Appelez l'API POST /auth/challenge avec { username }
      const challengeResponse = await $fetch<ChallengeResponse>("/auth/challenge", {
        method: "POST",
        body: { username }
      });

      // 2. Récupérez et décodez les données de la réponse
      const {
        challenge,
        publicKey,
        encryptedPrivateKey,
        kdfSalt,
        kdfParams
      } = challengeResponse;

      const challengeBytes = Buffer.from(challenge, "base64");
      const encryptedPrivateKeyBytes = Buffer.from(encryptedPrivateKey, "base64");
      const kdfSaltBytes = Buffer.from(kdfSalt, "base64");

      // 3. Dérivez la clé keyK
      const { key: keyK } = await useCrypto().deriveKeyFromPassword(password, kdfSaltBytes);

      // 4. Déchiffrez la clé privée
      const nonce = encryptedPrivateKeyBytes.slice(0, 24);
      const ciphertext = encryptedPrivateKeyBytes.slice(24);
      const privateKey = await useCrypto().decryptPrivateKey(ciphertext, keyK, nonce);

      // 5. Signez le challenge
      const signature = await useCrypto().sign(challengeBytes, privateKey);
      const signatureEncoded = Buffer.from(signature).toString("base64");

      // 6. Vérifiez la signature avec l'API
      const verifyResponse = await $fetch<AuthResponse>("/auth/verify", {
        method: "POST",
        body: {
          username,
          challenge,
          signature: signatureEncoded
        }
      });

      // Stockez les infos dans le store
      authStore.setAuthState({
        username,
        email: verifyResponse.email,
        id: verifyResponse.userId,
        createdAt: verifyResponse.createdAt,
        updatedAt: verifyResponse.updatedAt
      }, verifyResponse.token);
      
      authStore.setPrivateKey(privateKey);
      authStore.setKdfInfo(kdfSalt, kdfParams);
      
      return verifyResponse;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  return {
    registerUser,
    loginUser,
  };
};