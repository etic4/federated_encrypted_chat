/**
 * Store Pinia pour la gestion des messages déchiffrés par conversation.
 * Permet d'ajouter, lister, vider et traiter les messages entrants (temps réel ou historique),
 * en s'appuyant sur la cryptographie et la gestion des conversations.
 * Centralise l'état des messages pour l'ensemble de l'application.
 */

import { ref, type Ref } from 'vue';
import { defineStore } from 'pinia';
import { useCrypto } from '~/composables/useCrypto';
import type { DecryptedMessage, MessageResponse } from '~/types/models';
import { useConversationsStore } from './conversations';


export const useMessageStore = defineStore('messages', () => {
  // Initialise le composable de cryptographie (libsodium)
  const crypto = useCrypto();
  // Récupère le store des conversations pour accéder aux clés de session
  const conversationsStore = useConversationsStore();

  /**
   * Etat réactif : dictionnaire associant chaque conversationId à la liste de ses messages déchiffrés.
   * Permet un accès rapide aux messages d'une conversation.
   */
  const messagesByConversation: Ref<Record<number, DecryptedMessage[]>> = ref({});

  /**
   * Getter : retourne la liste des messages pour une conversation donnée.
   * Si aucun message n'est présent, retourne un tableau vide.
   * @param conversationId Identifiant de la conversation
   */
  function getMessagesForConversation(conversationId: number): DecryptedMessage[] {
    return messagesByConversation.value[conversationId] || [];
  }

  /**
   * Action : ajoute un message déchiffré à la liste d'une conversation.
   * Crée la liste si elle n'existe pas encore.
   * @param conversationId Identifiant de la conversation
   * @param message Message déchiffré à ajouter
   */
  function addMessage(conversationId: number, message: DecryptedMessage) {
    if (!messagesByConversation.value[conversationId]) {
      messagesByConversation.value[conversationId] = [];
    }
    messagesByConversation.value[conversationId].push(message);
  }

  /**
   * Action : remplace tous les messages d'une conversation par un nouveau tableau.
   * Utile lors du chargement de l'historique.
   * @param conversationId Identifiant de la conversation
   * @param messages Tableau de messages déchiffrés
   */
  function setMessagesForConversation(conversationId: number, messages: DecryptedMessage[]) {
    messagesByConversation.value[conversationId] = messages;
  }

  /**
   * Action : vide complètement l'état des messages (ex : lors d'une déconnexion).
   * Supprime tous les messages de toutes les conversations.
   */
  function clearMessages() {
    messagesByConversation.value = {};
  }

  /**
   * Gère un message entrant (temps réel ou historique) :
   * - Déchiffre le message reçu à l'aide de la clé de session de la conversation.
   * - Gère les erreurs de déchiffrement et les signale dans le message.
   * - Ajoute le message déchiffré à l'état du store.
   *
   * @param msg Données du message chiffré à traiter.
   */
  async function handleIncomingMessage(msg: MessageResponse) {
    
    let plaintext = '';
    let error: string | undefined;

    try {
      // Récupère la clé de session pour la conversation
      const sessionKey = conversationsStore.getSessionKey(msg.conversationId);
      if (!sessionKey) {
        // Si la clé n'est pas trouvée, on lève une erreur explicite
        throw new Error('Clé de conversation introuvable');
      }

       // Décode les champs base64 en Uint8Array
       const nonce_bytes = await crypto.fromBase64(msg.nonce)
       const ciphertext_bytes = await crypto.fromBase64(msg.ciphertext)

       // Déchiffre le message
       const plaintextBytes = await crypto.decryptMessage(ciphertext_bytes, nonce_bytes, sessionKey)
       if (!plaintextBytes) {
         throw new Error('Erreur déchiffement message')
       }
       plaintext = crypto.uint8ArrayToString(plaintextBytes)

    } catch (e: any) {
      // En cas d'erreur (clé manquante, déchiffrement impossible, etc.)
      plaintext = '***ERREUR DE DÉCHIFFREMENT***';
      error = e.message || 'Erreur de déchiffrement';
    }

    /**
     * Construction de l'objet message déchiffré, incluant éventuellement l'erreur.
     * L'objet est ensuite ajouté à la conversation concernée.
     */
    // Extraction des champs du message reçu
    const { conversationId, messageId, senderId, timestamp } = msg;
    const decryptedMessage: DecryptedMessage = {
      conversationId,
      messageId,
      senderId,
      timestamp,
      plaintext,
      error,
    };

    addMessage(conversationId, decryptedMessage);
  }

  /**
   * Expose les propriétés et actions du store pour utilisation dans l'application.
   */
  return {
    messagesByConversation,
    getMessagesForConversation,
    addMessage,
    setMessagesForConversation,
    clearMessages,
    handleIncomingMessage,
  };
});