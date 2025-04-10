import { useAuthStore } from '~/stores/auth';
import { useConversationsStore, type ConversationListInfo } from '~/stores/conversations';

declare global {
  interface GlobalThis {
    $sodium: any;
  }
}

export {};

interface ConversationResponse {
  id: number;
  title: string;
  participants: string[];
}
import { useCrypto } from './useCrypto';

/**
 * Composable pour gérer les conversations :
 * - récupération
 * - création avec chiffrement des clés de session
 */
export function useConversations() {
  const authStore = useAuthStore();
  const conversationsStore = useConversationsStore();
  const crypto = useCrypto();

  /**
   * Récupère la liste des conversations via API et met à jour le store
   */
  async function fetchConversations() {
    try {
      const convos = await $fetch<ConversationListInfo[]>('/conversations', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authStore.getAuthToken}`,
        },
      });
      conversationsStore.setConversations(convos);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des conversations:', error);
      if (error?.status === 401) {
        authStore.clearAuthState();
      }
    }
  }

  /**
   * Crée une nouvelle conversation avec chiffrement des clés de session
   * @param participantUsernames Liste des usernames participants (y compris soi-même)
   */
  async function createConversation(participantUsernames: string[]) {
    try {
      const username = authStore.getUsername;
      if (!username) throw new Error('Utilisateur non authentifié');

      // Générer une clé de session symétrique
      const sessionKey = await crypto.generateSessionKey();

      // Accès à sodium natif
      const sodium = await (async () => {
        const g = globalThis as any;
        if (!g.$sodium) throw new Error('Libsodium non initialisé');
        return g.$sodium;
      })();

      const encryptedKeys: Record<string, string> = {};

      // Pour chaque participant (y compris soi-même)
      for (const participant of participantUsernames) {
        // Récupérer la clé publique du participant
        const { publicKey: publicKeyBase64 } = await $fetch<{ publicKey: string }>(
          `/users/${participant}/public_key`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${authStore.getAuthToken}`,
            },
          }
        );

        const publicKey = await crypto.fromBase64(publicKeyBase64);

        // Chiffrer la clé de session avec crypto_box_seal
        const encryptedSessionKey = sodium.crypto_box_seal(sessionKey, publicKey);

        // Encoder en base64
        const encryptedSessionKeyBase64 = await crypto.toBase64(encryptedSessionKey);

        encryptedKeys[participant] = encryptedSessionKeyBase64;
      }

      // Appel API création conversation
      const response = await $fetch<ConversationResponse>('/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.getAuthToken}`,
        },
        body: {
          participants: participantUsernames,
          encryptedKeys,
        },
      });

      // Stocker la clé de session déchiffrée pour soi
      if (response && response.id) {
        conversationsStore.setSessionKey(response.id, sessionKey);
      }

      // Ajouter la conversation dans le store
      conversationsStore.addConversation(response);
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      throw error;
    }
  }

  return {
    fetchConversations,
    createConversation,
  };
}