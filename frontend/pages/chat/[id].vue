<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import MessageView from '@/components/MessageView.vue'
import MessageInput from '@/components/MessageInput.vue'
import ParticipantManager from '@/components/ParticipantManager.vue'
import { useMessageStore } from '@/stores/messages'
import { useConversationsStore } from '@/stores/conversations'
import { useAuthStore } from '@/stores/auth'
import { useMessages } from '@/composables/useMessages'
import { useConversations } from '@/composables/useConversations'

const route = useRoute()
const messageStore = useMessageStore()
const conversationsStore = useConversationsStore()
const authStore = useAuthStore()
const { addParticipant, removeParticipant } = useConversations()

const conversationId = Number(route.params.id)

const { sendMessage: sendEncryptedMessage, loadHistory } = useMessages()

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
  conversationsStore.conversations.find((c) => c.id === conversationId)
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
 * Handler pour l’ajout de participant (depuis ParticipantManager)
 */
async function handleAddParticipant(usernameToAdd: string) {
  addParticipantLoading.value = true
  addParticipantFeedback.value = null
  const result = await addParticipant(conversationId, usernameToAdd)
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
  const result = await removeParticipant(conversationId, usernameToRemove)
  if (result.success) {
    removeParticipantFeedback.value = { type: 'success', message: `Participant retiré (${usernameToRemove})` }
  } else {
    removeParticipantFeedback.value = { type: 'error', message: result.error || 'Erreur inconnue' }
  }
  removeParticipantLoading.value = false
}

onMounted(() => {
  loadHistory(conversationId)
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      const convId = Number(newId)
      loadHistory(convId)
    }
  }
)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Barre d'en-tête -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-gray-900">
      <div class="font-semibold text-lg truncate">
        {{ conversation?.title || 'Conversation' }}
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