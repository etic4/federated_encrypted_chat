import { defineStore } from 'pinia';
import { getSodium } from '../composables/useCrypto';
import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { ConversationResponse } from '~/types/models';


export const useConversationsStore = defineStore('conversations', () => {
  // État
  const conversations: Ref<ConversationResponse[]> = ref([]);
  const sessionKeys: Ref<Record<number, Uint8Array>> = ref({});
  
  // Etat vérification : conversationId -> Set de usernames vérifiés
  const verifiedParticipants: Ref<Record<number, Set<string>>> = ref({})

  // Nouvel état : conversationId -> Set de usernames nécessitant une révérification
  const pendingReverification: Ref<Record<number, Set<string>>> = ref({})

  // Cache local des clés publiques : username -> clé publique Uint8Array
  const participantPublicKeys: Ref<Record<string, Uint8Array>> = ref({})
  const currentConversationId: Ref<number | null> = ref(null);

  // Actions
  function setConversations(convos: ConversationResponse[]) {
    conversations.value = convos;
  }

  function addConversation(convo: ConversationResponse) {
    conversations.value.push(convo);
  }

  function setSessionKey(conversationId: number, key: Uint8Array) {
    sessionKeys.value[conversationId] = key;
  }

  function clearSessionKeys() {
    sessionKeys.value = {};
  }

  function setCurrentConversationId(id: number | null) {
    currentConversationId.value = id;
  }

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
     */
    function handleParticipantAdded(data: { conversationId: number; participant: string; encryptedSessionKey?: Uint8Array }) {
      const convo = conversations.value.find(c => c.conversationId === data.conversationId);
      if (convo) {
        if (!convo.participants.includes(data.participant)) {
          convo.participants.push(data.participant);
        }
        if (data.encryptedSessionKey) {
          // Supposé déjà déchiffré ou à déchiffrer ailleurs
          sessionKeys.value[data.conversationId] = data.encryptedSessionKey;
        }
      }
    }

    /**
     * Gère la rotation de clé de session.
     * Met à jour la clé de session déchiffrée pour la conversation concernée.
     */
    function handleKeyRotation(data: { conversationId: number; newEncryptedSessionKey: Uint8Array }) {
      // Supposé déjà déchiffré ou à déchiffrer ailleurs
      sessionKeys.value[data.conversationId] = data.newEncryptedSessionKey;
    }

    /**
     * Gère le changement de clé publique d'un contact.
     * Met à jour la clé publique dans la conversation et invalide l'état vérifié si nécessaire.
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

      // Mettre à jour la clé publique dans le cache local
      ;(async () => {
        const sodium = await getSodium()
        participantPublicKeys.value[data.contactId] = sodium.from_base64(data.newPublicKey)
      })()
    }
  function updateConversationParticipants(conversationId: number, participants: string[]) {
    const convo = conversations.value.find(c => c.conversationId === conversationId);
    if (convo) {
      convo.participants = participants;
    }
  }

  // Actions pour gestion vérification

  function markParticipantAsVerified(conversationId: number, username: string) {
    if (!verifiedParticipants.value[conversationId]) {
      verifiedParticipants.value[conversationId] = new Set()
    }
    verifiedParticipants.value[conversationId].add(username)
    // Si l'utilisateur vérifie, on enlève le flag pendingReverification
    clearPendingReverification(conversationId, username)
  }

  function unverifyParticipant(conversationId: number, username: string) {
    if (verifiedParticipants.value[conversationId]) {
      verifiedParticipants.value[conversationId].delete(username)
    }
  }

  function unverifyAllForConversation(conversationId: number) {
    verifiedParticipants.value[conversationId] = new Set()
    pendingReverification.value[conversationId] = new Set()
  }

  function clearVerifiedStatus() {
    verifiedParticipants.value = {}
    pendingReverification.value = {}
  }

  function markPendingReverification(conversationId: number, username: string) {
    if (!pendingReverification.value[conversationId]) {
      pendingReverification.value[conversationId] = new Set()
    }
    pendingReverification.value[conversationId].add(username)
  }

  function clearPendingReverification(conversationId: number, username: string) {
    if (pendingReverification.value[conversationId]) {
      pendingReverification.value[conversationId].delete(username)
    }
  }

  function isParticipantVerified(conversationId: number, username: string): boolean {
    return !!verifiedParticipants.value[conversationId]?.has(username)
  }

  function needsReverification(conversationId: number, username: string): boolean {
    return !!pendingReverification.value[conversationId]?.has(username)
  }

  function cacheParticipantPublicKey(username: string, key: Uint8Array) {
    participantPublicKeys.value[username] = key
  }

  function getParticipantPublicKey(username: string): Uint8Array | undefined {
    return participantPublicKeys.value[username]
  }

  // Getters
  const getConversationList = computed(() => conversations.value);

  function getSessionKey(conversationId: number): Uint8Array | undefined {
    return sessionKeys.value[conversationId];
  }

  const getCurrentConversationId = computed(() => currentConversationId.value);

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