import { ref } from 'vue';
import type { Ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMessageStore } from '@/stores/messages';
import { useConversationsStore } from '@/stores/conversations';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface NewMessagePayload {
  conversationId: number;
  messageId: number;
  senderId: string;
  timestamp: string;
  ciphertext: string;
  [key: string]: any;
}

let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export function useWebSocket() {
  const ws: Ref<WebSocket | null> = ref(null);
  const isConnected: Ref<boolean> = ref(false);

  const authStore = useAuthStore();
  const messageStore = useMessageStore();
  const conversationStore = useConversationsStore();

  function connectWebSocket() {
    const token = authStore.token;
    if (!token) {
      console.warn('No auth token found, cannot connect WebSocket');
      return;
    }

    const wsUrl = `wss://your-backend-domain/ws?token=${encodeURIComponent(token)}`;

    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    ws.value = new WebSocket(wsUrl);

    ws.value.onopen = () => {
      console.log('WebSocket connected');
      isConnected.value = true;
      reconnectAttempts = 0;
    };

    ws.value.onclose = () => {
      console.log('WebSocket disconnected');
      isConnected.value = false;
      attemptReconnect();
    };

    ws.value.onerror = (error) => {
      console.error('WebSocket error', error);
    };

    ws.value.onmessage = async (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'newMessage':
            messageStore.handleIncomingMessage(data as unknown as NewMessagePayload);
            break;

          case 'participantAdded': {
            // Bloc 11 : gestion explicite
            const { conversationId, userId, publicKey } = data;
            if (typeof conversationId !== 'number' || !userId) {
              console.error('participantAdded: données invalides', data);
              break;
            }
            // Mise à jour du store
            conversationStore.updateConversationParticipants(conversationId, [
              ...(
                conversationStore.conversations.find((c: any) => c.id === conversationId)?.participants || []
              ).filter((p: string) => p !== userId),
              userId
            ]);
            // Notification UI
            alert(`Utilisateur ${userId} a rejoint la conversation`);
            break;
          }

          case 'keyRotation': {
            // Bloc 11 : gestion explicite
            const { conversationId, removedUserId, remainingParticipants, newEncryptedSessionKey } = data;
            if (
              typeof conversationId !== 'number' ||
              !Array.isArray(remainingParticipants) ||
              !newEncryptedSessionKey
            ) {
              console.error('keyRotation: données invalides', data);
              break;
            }
            // On suppose que newEncryptedSessionKey est un objet { cipher: string, nonce: string }
            // et que la clé privée locale est dans authStore.privateKey (Uint8Array ou base64)
            try {
              const { cipher, nonce, senderPublicKey } = newEncryptedSessionKey;
              const useCrypto = (await import('@/composables/useCrypto')).useCrypto;
              const crypto = useCrypto();
              // Conversion base64 -> Uint8Array si besoin
              const cipherBuf = typeof cipher === 'string' ? await crypto.fromBase64(cipher) : cipher;
              const nonceBuf = typeof nonce === 'string' ? await crypto.fromBase64(nonce) : nonce;
              const senderPubKeyBuf = typeof senderPublicKey === 'string'
                ? await crypto.fromBase64(senderPublicKey)
                : senderPublicKey;
              let rawPrivateKey = authStore.privateKey;
              let privateKeyBuf: Uint8Array | null = null;
              if (typeof rawPrivateKey === 'string') {
                privateKeyBuf = await crypto.fromBase64(rawPrivateKey);
              } else if (rawPrivateKey && ArrayBuffer.isView(rawPrivateKey)) {
                privateKeyBuf = rawPrivateKey as Uint8Array;
              }
              if (!privateKeyBuf) {
                console.error(
                  "Erreur critique : clé privée locale manquante ou invalide, impossible de déchiffrer la nouvelle clé de session",
                  data
                );
                break;
              }
              // Déchiffrement
              let sessionKey: Uint8Array | null = null;
              try {
                sessionKey = await crypto.decryptAsymmetric(cipherBuf, nonceBuf, senderPubKeyBuf, privateKeyBuf);
              } catch (err) {
                sessionKey = null;
              }
              if (sessionKey) {
                conversationStore.setSessionKey(conversationId, sessionKey);
                conversationStore.updateConversationParticipants(conversationId, remainingParticipants);
                alert(
                  `Utilisateur ${removedUserId} a été retiré. La clé de session a été mise à jour.`
                );
              } else {
                console.error(
                  'Erreur critique : impossible de déchiffrer la nouvelle clé de session lors de la rotation',
                  data
                );
              }
            } catch (err) {
              console.error('Erreur lors du traitement de keyRotation', err, data);
            }
            break;
          }

          case 'removedFromConversation': {
            // Bloc 11 : gestion explicite
            const { conversationId } = data;
            if (typeof conversationId !== 'number') {
              console.error('removedFromConversation: données invalides', data);
              break;
            }
            conversationStore.removeConversation(conversationId);
            // Si l'utilisateur visualisait cette conversation, rediriger ou afficher un message
            if (conversationStore.currentConversationId === conversationId) {
              conversationStore.setCurrentConversationId(null);
              alert(
                "Vous avez été retiré de cette conversation. Vous allez être redirigé vers la liste des conversations."
              );
              window.location.href = '/'; // Redirection simple, à adapter si router accessible
            }
            break;
          }

          case 'publicKeyChanged': {
            const { contactId, newPublicKey } = data;
            if (!contactId || !newPublicKey) {
              console.error('publicKeyChanged: données invalides', data);
              break;
            }
            conversationStore.handlePublicKeyChanged({ contactId, newPublicKey });
            alert(`Clé publique de ${contactId} a changé. Veuillez revérifier son identité.`);
            break;
          }

          default:
            console.warn('Unknown WebSocket message type:', data.type);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message', e);
      }
    };
  }

  function disconnectWebSocket() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }

    isConnected.value = false;
    reconnectAttempts = 0;
  }

  function attemptReconnect() {
    reconnectAttempts++;
    const delay = Math.min(10000, 1000 * 2 ** reconnectAttempts); // max 10s
    console.log(`Reconnecting WebSocket in ${delay}ms`);

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    reconnectTimeout = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }

  return {
    ws,
    isConnected,
    connectWebSocket,
    disconnectWebSocket,
  };
}