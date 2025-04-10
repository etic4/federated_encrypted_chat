import { ref, computed, type Ref } from 'vue';
import { defineStore } from 'pinia';
import { useCrypto } from '../composables/useCrypto';

// Interface pour un message déchiffré
export interface DecryptedMessage {
  messageId: number;
  senderId: string;
  timestamp: string;
  plaintext: string;
  error?: string;
}

export const useMessageStore = defineStore('messages', () => {
  const { decodeBase64, secretboxOpenEasy, getSecretboxNonceBytes } = useCrypto();

  // Etat : messages groupés par conversationId
  const messagesByConversation: Ref<Record<number, DecryptedMessage[]>> = ref({});

  // Getter : messages pour une conversation donnée
  function getMessagesForConversation(conversationId: number): DecryptedMessage[] {
    return messagesByConversation.value[conversationId] || [];
  }

  // Action : ajoute un message à une conversation
  function addMessage(conversationId: number, message: DecryptedMessage) {
    if (!messagesByConversation.value[conversationId]) {
      messagesByConversation.value[conversationId] = [];
    }
    messagesByConversation.value[conversationId].push(message);
  }

  // Action : remplace tous les messages d’une conversation
  function setMessagesForConversation(conversationId: number, messages: DecryptedMessage[]) {
    messagesByConversation.value[conversationId] = messages;
  }

  // Action : vide tout l’état (logout)
  function clearMessages() {
    messagesByConversation.value = {};
  }

  // Fonction fictive pour récupérer la clé de conversation (à remplacer par vraie implémentation)
  async function getConversationKey(conversationId: number): Promise<Uint8Array | null> {
    // TODO: remplacer par la vraie récupération de clé
    return null;
  }

  // Action : gérer un message entrant (temps réel ou historique)
  async function handleIncomingMessage(messageData: {
    conversationId: number;
    messageId: number;
    senderId: string;
    timestamp: string;
    ciphertext: string; // base64
  }) {
    const { conversationId, messageId, senderId, timestamp, ciphertext } = messageData;
    let plaintext = '';
    let error: string | undefined;

    try {
      const key = await getConversationKey(conversationId);
      if (!key) {
        throw new Error('Clé de conversation introuvable');
      }

      const decodedCiphertext = await decodeBase64(ciphertext, 1); // 1 = sodium.base64_variants.ORIGINAL
      const nonceLength = await getSecretboxNonceBytes();
      const nonce = decodedCiphertext.slice(0, nonceLength);
      const cipher = decodedCiphertext.slice(nonceLength);

      const decrypted = await secretboxOpenEasy(cipher, nonce, key);
      if (!decrypted) {
        throw new Error('Échec du déchiffrement');
      }
      plaintext = new TextDecoder().decode(decrypted);
    } catch (e: any) {
      plaintext = '';
      error = e.message || 'Erreur de déchiffrement';
    }

    const decryptedMessage: DecryptedMessage = {
      messageId,
      senderId,
      timestamp,
      plaintext,
      ...(error ? { error } : {}),
    };

    addMessage(conversationId, decryptedMessage);
  }

  return {
    messagesByConversation,
    getMessagesForConversation,
    addMessage,
    setMessagesForConversation,
    clearMessages,
    handleIncomingMessage,
    getConversationKey,
  };
});