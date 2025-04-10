<template>
  <div>
    <!-- En-tête -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Participants</h2>
      <!-- Optionnel : bouton pour ouvrir dans un Dialog ou Sheet -->
    </div>

    <!-- Liste des participants -->
    <ul class="mb-4">
      <li
        v-for="participant in participants"
        :key="participant.username"
        class="flex items-center justify-between py-2 border-b last:border-b-0"
      >
        <div class="flex items-center gap-2">
          <!-- Avatar optionnel -->
          <span class="rounded-full bg-gray-200 w-8 h-8 flex items-center justify-center text-sm font-bold uppercase">
            {{ participant.username.charAt(0) }}
          </span>
          <span>{{ participant.username }}</span>
          <span v-if="participant.username === currentUser" class="text-xs text-gray-400 ml-2">(vous)</span>
          <template v-else>
            <span
              v-if="isParticipantVerified(props.conversationId, participant.username) && !needsReverification(props.conversationId, participant.username)"
              class="text-green-500 ml-2"
            >✅</span>
            <span
              v-else-if="needsReverification(props.conversationId, participant.username)"
              class="text-orange-500 ml-2"
            >🔄</span>
            <span
              v-else
              class="text-yellow-500 ml-2"
            >⚠️</span>
          </template>
        </div>
        <Button
          v-if="participant.username !== currentUser"
          variant="destructive"
          size="sm"
          @click="onRemove(participant.username)"
        >
          Retirer
        </Button>
        <Button
          v-if="participant.username !== currentUser"
          variant="secondary"
          size="sm"
          class="ml-2"
          @click="openModal(participant.username)"
        >
          Vérifier la sécurité
        </Button>
      </li>
    </ul>

    <!-- Ajout de participant -->
    <form class="flex gap-2" @submit.prevent="onAdd">
      <Input
        v-model="newParticipant"
        placeholder="Nom d'utilisateur à ajouter"
        autocomplete="off"
        size="sm"
      />
      <Button type="submit" :disabled="!newParticipant.trim()" size="sm">
        Ajouter
      </Button>
    </form>

    <SafetyNumberModal
      v-if="showModal && selectedParticipant"
      :visible="showModal"
      :conversation-id="props.conversationId"
      :participant-username="selectedParticipant"
      @close="closeModal"
      @mark-verified="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { ref } from 'vue'
import { useConversationsStore } from '../stores/conversations'
import SafetyNumberModal from './SafetyNumberModal.vue'

interface Participant {
  username: string
}

const props = defineProps<{
  participants: Participant[]
  currentUser: string
  conversationId: number
}>()

const emit = defineEmits<{
  (e: 'add-participant', username: string): void
  (e: 'remove-participant', username: string): void
}>()

const newParticipant = ref('')

const conversationStore = useConversationsStore()

const showModal = ref(false)
const selectedParticipant = ref<string | null>(null)

function openModal(username: string) {
  selectedParticipant.value = username
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedParticipant.value = null
}

function isParticipantVerified(conversationId: number, username: string): boolean {
  return conversationStore.isParticipantVerified(conversationId, username)
}

function needsReverification(conversationId: number, username: string): boolean {
  return conversationStore.needsReverification(conversationId, username)
}

function onAdd() {
  const username = newParticipant.value.trim()
  if (
    username &&
    !props.participants.some(p => p.username === username) &&
    username !== props.currentUser
  ) {
    emit('add-participant', username)
    newParticipant.value = ''
  }
}

function onRemove(username: string) {
  emit('remove-participant', username)
}
</script>

<style scoped>
/* Optionnel : styles pour améliorer l'affichage */
</style>
