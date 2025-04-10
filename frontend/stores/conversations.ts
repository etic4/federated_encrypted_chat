import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Ref } from 'vue';

/**
 * Interface minimale pour une conversation.
 * À remplacer par une importation correcte si elle existe ailleurs.
 */
export interface ConversationListInfo {
  id: number;
  title: string;
  participants: string[];
}

export const useConversationsStore = defineStore('conversations', () => {
  // État
  const conversations: Ref<ConversationListInfo[]> = ref([]);
  const sessionKeys: Ref<Record<number, Uint8Array>> = ref({});
  const currentConversationId: Ref<number | null> = ref(null);

  // Actions
  function setConversations(convos: ConversationListInfo[]) {
    conversations.value = convos;
  }

  function addConversation(convo: ConversationListInfo) {
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
    conversations.value = conversations.value.filter(c => c.id !== conversationId);
    delete sessionKeys.value[conversationId];
    if (currentConversationId.value === conversationId) {
      currentConversationId.value = null;
    }
  }


    /**
     * Gère l'ajout d'un participant à une conversation.
     * Met à jour la liste des participants et stocke la clé de session chiffrée si fournie.
     */
    function handleParticipantAdded(data: { conversationId: number; participant: string; encryptedSessionKey?: Uint8Array }) {
      const convo = conversations.value.find(c => c.id === data.conversationId);
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
          // Ici, il faudrait mettre à jour la clé publique du contact dans la conversation.
          // Comme la structure ne contient pas cette info, ce commentaire indique où le faire.
          // Invalider l'état "vérifié" si vous avez un tel champ dans la conversation.
        }
      });
    }
  function updateConversationParticipants(conversationId: number, participants: string[]) {
    const convo = conversations.value.find(c => c.id === conversationId);
    if (convo) {
      convo.participants = participants;
    }
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
    // actions
    setConversations,
    addConversation,
    setSessionKey,
    clearSessionKeys,
    setCurrentConversationId,
    removeConversation,
    updateConversationParticipants,
    // getters
    getConversationList,
    getSessionKey,
    getCurrentConversationId,
    handleParticipantAdded,
      handleKeyRotation,
      handlePublicKeyChanged,
    };
});