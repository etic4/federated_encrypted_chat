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

    ws.value.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'newMessage':
            messageStore.handleIncomingMessage(data as unknown as NewMessagePayload);
            break;
          case 'participantAdded':
            conversationStore.handleParticipantAdded(data);
            break;
          case 'keyRotation':
            conversationStore.handleKeyRotation(data);
            break;
          case 'publicKeyChanged':
            // Selon la logique métier, cela peut concerner authStore ou conversationStore
            conversationStore.handlePublicKeyChanged(data);
            break;
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