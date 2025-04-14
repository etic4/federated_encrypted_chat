/**
 * Composable Vue 3 pour la gestion d'une connexion WebSocket sécurisée et réactive.
 * Centralise la logique temps réel de l'application de chat chiffré :
 * - Connexion/déconnexion WebSocket
 * - Reconnexion automatique avec backoff exponentiel
 * - Gestion des messages entrants selon leur type
 * - Synchronisation avec les stores Pinia (auth, messages, conversations)
 */

import { ref } from 'vue';
import type { Ref } from 'vue';
import { useRuntimeConfig } from '#app'; // Accès à la configuration runtime de Nuxt (ex: URL API)
import { useCrypto } from '@/composables/useCrypto'; // Fonctions cryptographiques (chiffrement/déchiffrement)
import { useAuthStore } from '@/stores/auth'; // Store Pinia pour l'authentification utilisateur
import { useMessageStore } from '@/stores/messages'; // Store Pinia pour la gestion des messages
import { useConversationsStore } from '@/stores/conversations'; // Store Pinia pour les conversations
import type { ConversationResponse } from '~/types/models'; // Typage des conversations

/**
 * Interface générique pour les messages WebSocket reçus.
 * Chaque message doit avoir un champ 'type', les autres champs sont dynamiques selon le type.
 */
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Interface pour la charge utile d'un nouveau message reçu.
 */
interface NewMessagePayload {
  type: 'newMessage';
  conversationId: number;
  messageId: number;
  senderId: string;
  timestamp: string;
  nonce: string; // Message nonce
  ciphertext: string; // Message chiffré
  associatedData: string; // Données associées
  
}

// Variables globales pour la gestion de la reconnexion automatique
let reconnectAttempts = 0; // Nombre de tentatives de reconnexion consécutives
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null; // Timeout de reconnexion en cours

/**
 * Fonction principale du composable WebSocket.
 * Retourne les méthodes et états nécessaires à la gestion du WebSocket.
 */
export function useWebSocket() {
  // Référence réactive à l'instance WebSocket (null si non connectée)
  const ws: Ref<WebSocket | null> = ref(null);
  // Statut réactif de la connexion WebSocket
  const isConnected: Ref<boolean> = ref(false);

  // Récupération des stores Pinia et de la config runtime Nuxt
  const runtimeConfig = useRuntimeConfig();
  const authStore = useAuthStore();
  const messageStore = useMessageStore();
  const conversationStore = useConversationsStore();

  /**
   * Établit la connexion WebSocket avec authentification JWT.
   * Gère la création de l'instance, l'attachement des gestionnaires d'événements,
   * et la prévention des connexions multiples.
   */
  function connectWebSocket() {
    const token = authStore.token; // Récupère le token JWT de l'utilisateur
    if (!token) {
      // Si pas de token, on ne tente pas de connexion
      console.warn('No auth token found, cannot connect WebSocket');
      return;
    }

    // Construction de l'URL WebSocket à partir de l'URL API (http(s) -> ws(s))
    const wsUrl = `${(runtimeConfig.apiBase as string).replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`;

    // Si déjà connecté ou en cours de connexion, on ne fait rien
    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    // Création de l'instance WebSocket
    ws.value = new WebSocket(wsUrl);

    // Gestionnaire : connexion ouverte
    ws.value.onopen = () => {
      // La connexion est établie
      console.log('WebSocket connected');
      isConnected.value = true;
      reconnectAttempts = 0; // Réinitialise le compteur de reconnexion
    };

    // Gestionnaire : connexion fermée
    ws.value.onclose = () => {
      // La connexion a été fermée (volontairement ou non)
      console.log('WebSocket disconnected');
      isConnected.value = false;
      attemptReconnect(); // Lance la reconnexion automatique
    };

    // Gestionnaire : erreur WebSocket
    ws.value.onerror = (error) => {
      // Une erreur s'est produite sur la connexion WebSocket
      console.error('WebSocket error', error);
    };

    // Gestionnaire : message reçu
    ws.value.onmessage = async (event: MessageEvent) => {
      try {
        // Parse le message JSON reçu
        const data: WebSocketMessage = JSON.parse(event.data);

        // Traitement selon le type de message reçu
        switch (data.type) {
          case 'newMessage':
            // Nouveau message dans une conversation : délègue au store messages
            messageStore.handleIncomingMessage(data as NewMessagePayload);
            break;

          case 'participantAdded': {
            // Un nouveau participant a été ajouté à une conversation
            const { conversationId, userId: username, publicKey } = data;
            if (typeof conversationId !== 'number' || !username) {
              // Données invalides
              console.error('participantAdded: données invalides', data);
              break;
            }
            // Met à jour la liste des participants dans le store (évite les doublons)
            conversationStore.updateConversationParticipants(conversationId, [
              ...(
                conversationStore.conversations.find((c: ConversationResponse) => c.conversationId === conversationId)?.participants || []
              ).filter((p: string) => p !== username),
              username
            ]);
            // Notification UI (à remplacer par un système de notifications plus élégant si besoin)
            alert(`Utilisateur ${username} a rejoint la conversation`);
            break;
          }

          case 'keyRotation': {
            // Rotation de la clé de session (exclusion d'un participant ou sécurité)
            const { conversationId, removedUserId, remainingParticipants, newEncryptedSessionKey } = data;
            if (
              typeof conversationId !== 'number' ||
              !Array.isArray(remainingParticipants) ||
              !newEncryptedSessionKey
            ) {
              // Données invalides
              console.error('keyRotation: données invalides', data);
              break;
            }
            // newEncryptedSessionKey : { cipher, nonce, senderPublicKey }
            // La clé privée locale est dans authStore.privateKey (Uint8Array ou base64)
            try {
              const { cipher, nonce, senderPublicKey } = newEncryptedSessionKey;
              const crypto = useCrypto();
              // Conversion base64 -> Uint8Array si besoin
              const cipherBuf = await crypto.fromBase64(cipher);
              const nonceBuf = await crypto.fromBase64(nonce);
              const senderPubKeyBuf = await crypto.fromBase64(senderPublicKey);
              let rawPrivateKey = authStore.privateKey;
              let privateKeyBuf: Uint8Array | null = null;
              if (typeof rawPrivateKey === 'string') {
                privateKeyBuf = await crypto.fromBase64(rawPrivateKey);
              } else if (rawPrivateKey && ArrayBuffer.isView(rawPrivateKey)) {
                privateKeyBuf = rawPrivateKey as Uint8Array;
              }
              if (!privateKeyBuf) {
                // Impossible de déchiffrer la nouvelle clé de session sans clé privée locale valide
                console.error(
                  "Erreur critique : clé privée locale manquante ou invalide, impossible de déchiffrer la nouvelle clé de session",
                  data
                );
                break;
              }
              // Déchiffrement de la nouvelle clé de session
              let sessionKey: Uint8Array | null = null;
              try {
                sessionKey = await crypto.decryptAsymmetric(cipherBuf, nonceBuf, senderPubKeyBuf, privateKeyBuf);
              } catch (err) {
                sessionKey = null;
              }
              if (sessionKey) {
                // Mise à jour de la clé de session et des participants dans le store
                conversationStore.setSessionKey(conversationId, sessionKey);
                conversationStore.updateConversationParticipants(conversationId, remainingParticipants);
                alert(
                  `Utilisateur ${removedUserId} a été retiré. La clé de session a été mise à jour.`
                );
              } else {
                // Échec du déchiffrement
                console.error(
                  'Erreur critique : impossible de déchiffrer la nouvelle clé de session lors de la rotation',
                  data
                );
              }
            } catch (err) {
              // Erreur inattendue lors du traitement de la rotation de clé
              console.error('Erreur lors du traitement de keyRotation', err, data);
            }
            break;
          }

          case 'removedFromConversation': {
            // L'utilisateur courant a été retiré d'une conversation
            const { conversationId } = data;
            if (typeof conversationId !== 'number') {
              // Données invalides
              console.error('removedFromConversation: données invalides', data);
              break;
            }
            // Supprime la conversation du store
            conversationStore.removeConversation(conversationId);
            // Si l'utilisateur visualisait cette conversation, on le redirige
            if (conversationStore.currentConversationId === conversationId) {
              conversationStore.setCurrentConversationId(null);
              alert(
                "Vous avez été retiré de cette conversation. Vous allez être redirigé vers la liste des conversations."
              );
              window.location.href = '/'; // Redirection (à adapter si utilisation d'un router)
            }
            break;
          }

          case 'publicKeyChanged': {
            // Un contact a changé de clé publique (ex: réinitialisation de compte)
            const { contactId, newPublicKey } = data;
            if (!contactId || !newPublicKey) {
              // Données invalides
              console.error('publicKeyChanged: données invalides', data);
              break;
            }
            // Met à jour la clé publique du contact dans le store
            conversationStore.handlePublicKeyChanged({ contactId, newPublicKey });
            alert(`Clé publique de ${contactId} a changé. Veuillez revérifier son identité.`);
            break;
          }

          default:
            // Type de message inconnu : on log un avertissement
            console.warn('Unknown WebSocket message type:', data.type);
        }
      } catch (e) {
        // Erreur lors du parsing ou du traitement du message
        console.error('Error parsing WebSocket message', e);
      }
    };
  }

  /**
   * Ferme proprement la connexion WebSocket et annule toute reconnexion planifiée.
   * Réinitialise les compteurs et états.
   */
  function disconnectWebSocket() {
    // Annule tout timeout de reconnexion en cours
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // Ferme la connexion WebSocket si elle existe
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }

    isConnected.value = false;
    reconnectAttempts = 0;
  }

  /**
   * Fonction de reconnexion automatique avec backoff exponentiel.
   * Incrémente le compteur de tentatives et planifie une reconnexion après un délai croissant (max 10s).
   */
  function attemptReconnect() {
    reconnectAttempts++;
    const delay = Math.min(10000, 1000 * 2 ** reconnectAttempts); // Délai max 10s
    console.log(`Reconnecting WebSocket in ${delay}ms`);

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    // Planifie la reconnexion après le délai calculé
    reconnectTimeout = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }

  // Expose les propriétés et méthodes du composable pour utilisation dans les composants Vue
  return {
    ws, // Référence à l'instance WebSocket
    isConnected, // Statut de connexion
    connectWebSocket, // Méthode pour se connecter
    disconnectWebSocket, // Méthode pour se déconnecter
  };
}