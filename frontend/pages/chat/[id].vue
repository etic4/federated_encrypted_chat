<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import MessageView from '@/components/MessageView.vue'
import MessageInput from '@/components/MessageInput.vue'
import ParticipantManager from '@/components/ParticipantManager.vue'
import { useConversationsStore } from '@/stores/conversations'
import { useAuthStore } from '@/stores/auth'
import { useMessages } from '@/composables/useMessages'
import { useConversations } from '@/composables/useConversations'
import { useCrypto } from '@/composables/useCrypto'

const route = useRoute()
const conversationsStore = useConversationsStore()
const authStore = useAuthStore()
const { addParticipant, removeParticipant } = useConversations()

const conversationId = ref(Number(route.params.id))

const { sendMessage: sendEncryptedMessage, loadHistory } = useMessages()
const crypto = useCrypto()

async function sendMessage(conversationId: number, content: string) {
  try {
    await sendEncryptedMessage(conversationId, content)
    // L’input sera vidé automatiquement si MessageInput réinitialise son champ après émission
    // Sinon, gérer dans MessageInput
  } catch (error) {
    console.error('Erreur lors de l’envoi du message:', error)
    alert('Erreur lors de l’envoi du message')
  }
}

// Trouver la conversation active
const conversation = computed(() =>
  conversationsStore.conversations.find((c) => c.conversationId === conversationId.value)
)

// Transformer les participants en objets { username }
const participants = computed(() =>
  conversation.value?.participants
    ? conversation.value.participants.map((username: string) => ({ username }))
    : []
)

// Récupérer le nom d'utilisateur courant
const currentUser = computed(() => authStore.user?.username || '')

// Gérer l'ouverture/fermeture du Dialog
const showParticipantsDialog = ref(false)

function openParticipantsDialog() {
  showParticipantsDialog.value = true
}
function closeParticipantsDialog() {
  showParticipantsDialog.value = false
}
// Feedback pour l’ajout de participant
const addParticipantFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const addParticipantLoading = ref(false)

const removeParticipantFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const removeParticipantLoading = ref(false)

/**
 * Met à jour la conversation courante dans le store et déchiffre la clé de session si présente.
 */
 async function handleConversationSetup() {
  // On récupère la conversation active
  const conv = conversationsStore.conversations.find((c) => c.conversationId === conversationId.value)
  if (!conv) return

  // On met à jour l'id de la conversation courante dans le store
  conversationsStore.setCurrentConversationId(conversationId.value)

  // Déchiffrement de la clé de session si présente
  if (conv.encryptedSessionKey && authStore.publicKey && authStore.privateKey) {
    try {
      const encryptedKey = await crypto.fromBase64(conv.encryptedSessionKey)
      // Les clés sont stockées en Uint8Array dans le store d'auth
      const publicKey = authStore.publicKey
      const privateKey = authStore.privateKey
      const sessionKey = await crypto.sealOpen(encryptedKey, publicKey, privateKey)
      if (sessionKey) {
        conversationsStore.setSessionKey(conv.conversationId, sessionKey)
      } else {
        // Optionnel : gestion d'erreur si le déchiffrement échoue
        // console.warn('Impossible de déchiffrer la clé de session pour la conversation', conv.conversationId)
      }
    } catch (e) {
      // Optionnel : gestion d'erreur
      // console.error('Erreur lors du déchiffrement de la clé de session:', e)
    }
  }
}

/**
 * Handler pour l’ajout de participant (depuis ParticipantManager)
 */
async function handleAddParticipant(usernameToAdd: string) {
  addParticipantLoading.value = true
  addParticipantFeedback.value = null
  const result = await addParticipant(conversationId.value, usernameToAdd)
  if (result.success) {
    addParticipantFeedback.value = { type: 'success', message: `Participant ajouté (${usernameToAdd})` }
  } else {
    addParticipantFeedback.value = { type: 'error', message: result.error || 'Erreur inconnue' }
  }
  addParticipantLoading.value = false
}

/**
 * Handler pour le retrait de participant (depuis ParticipantManager)
 */
async function handleRemoveParticipant(usernameToRemove: string) {
  removeParticipantLoading.value = true
  removeParticipantFeedback.value = null
  const result = await removeParticipant(conversationId.value, usernameToRemove)
  if (result.success) {
    removeParticipantFeedback.value = { type: 'success', message: `Participant retiré (${usernameToRemove})` }
  } else {
    removeParticipantFeedback.value = { type: 'error', message: result.error || 'Erreur inconnue' }
  }
  removeParticipantLoading.value = false
}

onMounted(() => {
  handleConversationSetup()
  loadHistory(conversationId.value)
  
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      conversationId.value = Number(newId)
      handleConversationSetup()
      loadHistory(conversationId.value)
      
    }
  }
)

</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Barre d'en-tête -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-gray-900">
      <div class="font-semibold text-lg truncate">
        {{ conversationId || 'Conversation' }}
      </div>
      <button
        class="ml-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
        @click="openParticipantsDialog"
        aria-label="Gérer les participants"
      >
        Participants
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <MessageView :conversation-id="conversationId" />
    </div>
    <MessageInput @send-message="(content) => sendMessage(conversationId, content)" />

    <!-- Dialog Participants -->
    <div
      v-if="showParticipantsDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      @click.self="closeParticipantsDialog"
    >
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          class="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          @click="closeParticipantsDialog"
          aria-label="Fermer"
        >
          ✕
        </button>
        <ParticipantManager
          :participants="participants"
          :current-user="currentUser"
          :conversation-id="conversationId"
          @add-participant="handleAddParticipant"
          @remove-participant="handleRemoveParticipant"
        />
      </div>
            <!-- Feedback ajout participant -->
            <div v-if="addParticipantFeedback" class="mt-4">
              <div
                :class="[
                  'px-3 py-2 rounded text-sm',
                  addParticipantFeedback.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ addParticipantFeedback.message }}
              </div>
            </div>
            <div v-if="addParticipantLoading" class="mt-2 text-gray-500 text-sm">Ajout en cours...</div>
            <!-- Feedback retrait participant -->
            <div v-if="removeParticipantFeedback" class="mt-4">
              <div
                :class="[
                  'px-3 py-2 rounded text-sm',
                  removeParticipantFeedback.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ removeParticipantFeedback.message }}
              </div>
            </div>
            <div v-if="removeParticipantLoading" class="mt-2 text-gray-500 text-sm">Retrait en cours...</div>
          </div>
        </div>
</template>

<style scoped>
/* Optionnel : styles supplémentaires */
</style>