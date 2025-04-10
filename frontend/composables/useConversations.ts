import { useAuthStore } from '~/stores/auth';
import { useConversationsStore, type ConversationListInfo } from '~/stores/conversations';

declare global {
  interface GlobalThis {
    $sodium: typeof import('libsodium-wrappers');
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

  /**
   * Ajoute un participant à une conversation existante (Bloc 11)
   * @param conversationId ID de la conversation
   * @param usernameToAdd Username du participant à ajouter
   */
  async function addParticipant(conversationId: number, usernameToAdd: string) {
    try {
      // 1. Récupérer la clé de session actuelle pour la conversation
      const sessionKey = conversationsStore.getSessionKey(conversationId);
      if (!sessionKey) throw new Error('Clé de session introuvable pour cette conversation');

      // 2. Récupérer la clé publique du nouvel utilisateur via l’API
      const { publicKey: publicKeyBase64 } = await $fetch<{ publicKey: string }>(
        `/users/${usernameToAdd}/public_key`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authStore.getAuthToken}`,
          },
        }
      );
      // 3. Chiffrer la sessionKey avec la clé publique du nouvel utilisateur (crypto_box_seal)
      const publicKey = await crypto.fromBase64(publicKeyBase64);
      const sodium = await (async () => {
        const g = globalThis as any;
        if (!g.$sodium) throw new Error('Libsodium non initialisé');
        return g.$sodium;
      })();
      const encryptedSessionKey = sodium.crypto_box_seal(sessionKey, publicKey);

      // 4. Encoder la clé chiffrée
      const encryptedSessionKeyBase64 = await crypto.toBase64(encryptedSessionKey);

      // 5. Appeler l’API POST /conversations/{conversationId}/participants
      await $fetch(`/conversations/${conversationId}/participants`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.getAuthToken}`,
        },
        body: {
          userId: usernameToAdd,
          encryptedSessionKey: encryptedSessionKeyBase64,
        },
      });

      // 6. Succès : on attend la notif WebSocket pour mettre à jour le store
      return { success: true };
    } catch (error: any) {
      // Gestion de l’erreur
      console.error('Erreur lors de l’ajout du participant:', error);
      return { success: false, error: error?.message || 'Erreur inconnue' };
    }
  }

  /**
   * Retire un participant d'une conversation (Bloc 11)
   * @param conversationId ID de la conversation
   * @param usernameToRemove Username du participant à retirer
   */
  async function removeParticipant(conversationId: number, usernameToRemove: string) {
    try {
      // 1. Récupérer la conversation et la liste des participants
      const conversation = conversationsStore.conversations.find((c: any) => c.id === conversationId);
      if (!conversation) throw new Error('Conversation introuvable');
      const currentParticipants: string[] = conversation.participants || [];
      // 2. Identifier les participants restants
      const remainingUsernames = currentParticipants.filter((u) => u !== usernameToRemove);
      if (remainingUsernames.length === 0) throw new Error('Impossible de retirer le dernier participant');
      // 3. Générer une nouvelle clé de session
      const sessionKey = await crypto.generateSessionKey();
      // 4. Pour chaque participant restant, récupérer la clé publique et chiffrer la sessionKey
      const sodium = await (async () => {
        const g = globalThis as any;
        if (!g.$sodium) throw new Error('Libsodium non initialisé');
        return g.$sodium;
      })();
      const newEncryptedKeys: Record<string, string> = {};
      for (const participant of remainingUsernames) {
        // Récupérer la clé publique via API
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
        // Chiffrer la nouvelle sessionKey
        const encryptedSessionKey = sodium.crypto_box_seal(sessionKey, publicKey);
        // Encoder en base64
        const encryptedSessionKeyBase64 = await crypto.toBase64(encryptedSessionKey);
        newEncryptedKeys[participant] = encryptedSessionKeyBase64;
      }
      // 5. Appeler l’API PUT /conversations/{conversationId}/session_key
      await $fetch(`/conversations/${conversationId}/session_key`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authStore.getAuthToken}`,
        },
        body: {
          participants: remainingUsernames,
          newEncryptedKeys,
        },
      });
      // 6. Succès : mettre à jour la clé de session et la liste des participants dans le store
      conversationsStore.setSessionKey(conversationId, sessionKey);
      conversationsStore.updateConversationParticipants(conversationId, remainingUsernames);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors du retrait du participant:', error);
      return { success: false, error: error?.message || 'Erreur inconnue' };
    }
  }

  return {
    fetchConversations,
    createConversation,
    addParticipant,
    removeParticipant,
  };
}