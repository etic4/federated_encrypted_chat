/**
 * Store Pinia pour la gestion des conversations chiffrées.
 * Ce store centralise l'état, les actions et les getters liés aux conversations,
 * à la gestion des clés de session, à la vérification des participants et à la sécurité.
 *
 * Sécurité :
 * - Les clés de session et les clés publiques sont stockées en mémoire (jamais en clair côté serveur).
 * - Les opérations de vérification et de révérification sont cruciales pour garantir l'intégrité des échanges.
 * - Toute modification de clé publique ou de session déclenche une invalidation de la vérification.
 */

import { defineStore } from 'pinia';
import { useCrypto } from '../composables/useCrypto';
import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { ConversationResponse } from '~/types/models';

const crypto = useCrypto();


export const useConversationsStore = defineStore('conversations', () => {
  // =========================
  // ÉTAT (STATE)
  // =========================
  
  /**
   * Liste des conversations de l'utilisateur.
   * Chaque conversation suit le modèle ConversationResponse.
   */
  const conversations: Ref<ConversationResponse[]> = ref([]);

 
  /**
   * Clés de session déchiffrées pour chaque conversation.
   * Clé : conversationId, Valeur : clé de session (Uint8Array).
   * Sécurité : Ces clés ne doivent jamais être persistées en clair côté serveur.
   */
  const sessionKeys: Ref<Record<number, Uint8Array>> = ref({});

  /**
   * Participants vérifiés pour chaque conversation.
   * conversationId -> Set de usernames vérifiés.
   * Permet de savoir si l'identité d'un participant a été validée (ex : fingerprint).
   */
  const verifiedParticipants: Ref<Record<number, Set<string>>> = ref({})

  /**
   * Participants nécessitant une révérification (ex : changement de clé publique).
   * conversationId -> Set de usernames à revérifier.
   * Sécurité : Important pour éviter les attaques de type "man-in-the-middle" lors d'un changement de clé.
   */
  const pendingReverification: Ref<Record<number, Set<string>>> = ref({})

  /**
   * Cache local des clés publiques des participants.
   * username -> clé publique (Uint8Array).
   * Sécurité : Ce cache permet d'accélérer les vérifications, mais doit être invalidé en cas de changement de clé.
   */
  const participantPublicKeys: Ref<Record<string, Uint8Array>> = ref({})

  /**
   * Identifiant de la conversation actuellement sélectionnée (ou null si aucune).
   */
  const currentConversationId: Ref<number | null> = ref(null);

  // =========================
  // ACTIONS (MUTATIONS)
  // =========================

  /**
   * Remplace la liste des conversations par une nouvelle liste.
   * @param convos Liste complète des conversations (type ConversationResponse[])
   */
  function setConversations(convos: ConversationResponse[]) {
    conversations.value = convos;
  }

  /**
   * Ajoute une nouvelle conversation à la liste.
   * @param convo Conversation à ajouter (type ConversationResponse)
   */
  function addConversation(convo: ConversationResponse) {
    conversations.value.push(convo);
  }

  /**
   * Définit la clé de session pour une conversation donnée.
   * @param conversationId Identifiant de la conversation
   * @param key Clé de session (Uint8Array)
   * Sécurité : La clé doit être déchiffrée avant d'être stockée ici.
   */
  function setSessionKey(conversationId: number, key: Uint8Array) {
    sessionKeys.value[conversationId] = key;
  }

  /**
   * Réinitialise toutes les clés de session (ex : lors de la déconnexion).
   * Sécurité : Important pour éviter la persistance de clés sensibles en mémoire.
   */
  function clearSessionKeys() {
    sessionKeys.value = {};
  }

  /**
   * Définit l'identifiant de la conversation actuellement sélectionnée.
   * @param id Identifiant de la conversation ou null
   */
  function setCurrentConversationId(id: number | null) {
    currentConversationId.value = id;
  }

  /**
   * Supprime une conversation et toutes ses données associées (clés, vérifications...).
   * @param conversationId Identifiant de la conversation à supprimer
   * Sécurité : Nettoie toutes les traces de la conversation en local.
   */
  function removeConversation(conversationId: number) {
    conversations.value = conversations.value.filter(c => c.conversationId !== conversationId);
    delete sessionKeys.value[conversationId];
    if (currentConversationId.value === conversationId) {
      currentConversationId.value = null;
    }
    delete verifiedParticipants.value[conversationId];
    delete pendingReverification.value[conversationId];
  }

  /**
   * Gère l'ajout d'un participant à une conversation.
   * Met à jour la liste des participants et stocke la clé de session chiffrée si fournie.
   * @param data Objet contenant : conversationId, participant (username), encryptedSessionKey (optionnelle)
   * Sécurité : La clé de session doit être déchiffrée avant usage.
   */
  function handleParticipantAdded(data: { conversationId: number; participant: string; encryptedSessionKey?: Uint8Array }) {
    const convo = conversations.value.find(c => c.conversationId === data.conversationId);
    if (convo) {
      if (!convo.participants.includes(data.participant)) {
        convo.participants.push(data.participant);
      }
      if (data.encryptedSessionKey) {
        // Sécurité : La clé doit être déchiffrée avant d'être utilisée.
        sessionKeys.value[data.conversationId] = data.encryptedSessionKey;
      }
    }
  }

  /**
   * Gère la rotation de la clé de session d'une conversation.
   * @param data Objet contenant : conversationId, newEncryptedSessionKey
   * Sécurité : La nouvelle clé doit être déchiffrée avant d'être stockée.
   */
  function handleKeyRotation(data: { conversationId: number; newEncryptedSessionKey: Uint8Array }) {
    // Sécurité : La clé doit être déchiffrée avant d'être utilisée.
    sessionKeys.value[data.conversationId] = data.newEncryptedSessionKey;
  }

  /**
   * Gère le changement de clé publique d'un contact.
   * Invalide la vérification et marque le contact comme nécessitant une révérification.
   * @param data Objet contenant : contactId (username), newPublicKey (base64)
   * Sécurité : Toute modification de clé publique doit déclencher une révérification.
   */
  function handlePublicKeyChanged(data: { contactId: string; newPublicKey: string }) {
    conversations.value.forEach(convo => {
      if (convo.participants.includes(data.contactId)) {
        // Invalider la vérification pour ce contact dans cette conversation
        unverifyParticipant(convo.conversationId, data.contactId)
        // Marquer comme nécessitant une révérification
        markPendingReverification(convo.conversationId, data.contactId)
      }
    })

    // Mettre à jour la clé publique dans le cache local (asynchrone)
    ;(async () => {
      participantPublicKeys.value[data.contactId] = await crypto.fromBase64(data.newPublicKey)
    })()
  }

  /**
   * Met à jour la liste des participants d'une conversation.
   * @param conversationId Identifiant de la conversation
   * @param participants Liste des usernames des participants
   */
  function updateConversationParticipants(conversationId: number, participants: string[]) {
    const convo = conversations.value.find(c => c.conversationId === conversationId);
    if (convo) {
      convo.participants = participants;
    }
  }

  // =========================
  // GESTION DE LA VÉRIFICATION DES PARTICIPANTS
  // =========================

  /**
   * Marque un participant comme vérifié dans une conversation.
   * @param conversationId Identifiant de la conversation
   * @param username Nom d'utilisateur du participant
   * Sécurité : Permet de garantir l'authenticité de l'identité du participant.
   */
  function markParticipantAsVerified(conversationId: number, username: string) {
    if (!verifiedParticipants.value[conversationId]) {
      verifiedParticipants.value[conversationId] = new Set()
    }
    verifiedParticipants.value[conversationId].add(username)
    // Si l'utilisateur vérifie, on enlève le flag pendingReverification
    clearPendingReverification(conversationId, username)
  }

  /**
   * Invalide la vérification d'un participant (ex : changement de clé publique).
   * @param conversationId Identifiant de la conversation
   * @param username Nom d'utilisateur du participant
   */
  function unverifyParticipant(conversationId: number, username: string) {
    if (verifiedParticipants.value[conversationId]) {
      verifiedParticipants.value[conversationId].delete(username)
    }
  }

  /**
   * Invalide toutes les vérifications et révérifications pour une conversation.
   * @param conversationId Identifiant de la conversation
   */
  function unverifyAllForConversation(conversationId: number) {
    verifiedParticipants.value[conversationId] = new Set()
    pendingReverification.value[conversationId] = new Set()
  }

  /**
   * Réinitialise tous les statuts de vérification et de révérification.
   * Sécurité : À utiliser lors d'une déconnexion ou d'un reset complet.
   */
  function clearVerifiedStatus() {
    verifiedParticipants.value = {}
    pendingReverification.value = {}
  }

  /**
   * Marque un participant comme nécessitant une révérification.
   * @param conversationId Identifiant de la conversation
   * @param username Nom d'utilisateur du participant
   * Sécurité : Important lors d'un changement de clé publique.
   */
  function markPendingReverification(conversationId: number, username: string) {
    if (!pendingReverification.value[conversationId]) {
      pendingReverification.value[conversationId] = new Set()
    }
    pendingReverification.value[conversationId].add(username)
  }

  /**
   * Retire le statut "à revérifier" d'un participant.
   * @param conversationId Identifiant de la conversation
   * @param username Nom d'utilisateur du participant
   */
  function clearPendingReverification(conversationId: number, username: string) {
    if (pendingReverification.value[conversationId]) {
      pendingReverification.value[conversationId].delete(username)
    }
  }

  /**
   * Indique si un participant est vérifié dans une conversation.
   * @param conversationId Identifiant de la conversation
   * @param username Nom d'utilisateur du participant
   * @returns true si vérifié, false sinon
   */
  function isParticipantVerified(conversationId: number, username: string): boolean {
    return !!verifiedParticipants.value[conversationId]?.has(username)
  }

  /**
   * Indique si un participant nécessite une révérification dans une conversation.
   * @param conversationId Identifiant de la conversation
   * @param username Nom d'utilisateur du participant
   * @returns true si révérification nécessaire, false sinon
   */
  function needsReverification(conversationId: number, username: string): boolean {
    return !!pendingReverification.value[conversationId]?.has(username)
  }

  /**
   * Met en cache la clé publique d'un participant.
   * @param username Nom d'utilisateur
   * @param key Clé publique (Uint8Array)
   * Sécurité : Toujours invalider le cache en cas de changement de clé.
   */
  function cacheParticipantPublicKey(username: string, key: Uint8Array) {
    participantPublicKeys.value[username] = key
  }

  /**
   * Récupère la clé publique d'un participant depuis le cache local.
   * @param username Nom d'utilisateur
   * @returns Clé publique (Uint8Array) ou undefined si absente
   */
  function getParticipantPublicKey(username: string): Uint8Array | undefined {
    return participantPublicKeys.value[username]
  }

  // =========================
  // GETTERS
  // =========================

  /**
   * Getter réactif pour la liste des conversations.
   */
  const getConversationList = computed(() => conversations.value);

  /**
   * Récupère la clé de session d'une conversation.
   * @param conversationId Identifiant de la conversation
   * @returns Clé de session (Uint8Array) ou undefined
   */
  function getSessionKey(conversationId: number): Uint8Array | undefined {
    return sessionKeys.value[conversationId];
  }

  /**
   * Getter réactif pour l'identifiant de la conversation courante.
   */
  const getCurrentConversationId = computed(() => currentConversationId.value);

  // =========================
  // EXPORTS DU STORE
  // =========================

  return {
    // état
    conversations,
    sessionKeys,
    currentConversationId,
    verifiedParticipants,
    pendingReverification,
    participantPublicKeys,
    // actions
    setConversations,
    addConversation,
    setSessionKey,
    clearSessionKeys,
    setCurrentConversationId,
    removeConversation,
    updateConversationParticipants,
    handleParticipantAdded,
    handleKeyRotation,
    handlePublicKeyChanged,
    markParticipantAsVerified,
    unverifyParticipant,
    unverifyAllForConversation,
    clearVerifiedStatus,
    markPendingReverification,
    clearPendingReverification,
    // getters
    isParticipantVerified,
    needsReverification,
    cacheParticipantPublicKey,
    getParticipantPublicKey,
    getConversationList,
    getSessionKey,
    getCurrentConversationId,
  };
});