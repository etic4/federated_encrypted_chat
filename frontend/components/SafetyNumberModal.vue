<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useConversationsStore } from '../stores/conversations'
import { useCrypto } from '../composables/useCrypto'

const props = defineProps<{
  conversationId: number
  participantUsername: string
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'mark-verified', conversationId: number, participantUsername: string): void
}>()

const authStore = useAuthStore()
const conversationStore = useConversationsStore()
const { calculateSafetyNumber } = useCrypto()

const loading = ref(false)
const safetyNumber = ref('')
const myId = ref('')
const theirId = ref('')

const isVerified = computed(() =>
  conversationStore.isParticipantVerified(props.conversationId, props.participantUsername)
)

const needsReverification = computed(() =>
  conversationStore.needsReverification(props.conversationId, props.participantUsername)
)

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      loading.value = true
      try {
        // Récupérer infos utilisateur courant
        myId.value = authStore.user?.username ?? ''
        const myPublicKey = authStore.publicKey

        // Récupérer clé publique du participant
        theirId.value = props.participantUsername
        let theirPublicKey = conversationStore.getParticipantPublicKey(props.participantUsername)

        if (!theirPublicKey) {
          // Appel API pour récupérer la clé publique distante
          const response = await fetch(`/api/users/${props.participantUsername}/public_key`)
          if (!response.ok) throw new Error('Erreur récupération clé publique distante')
          const data = await response.json()
          const base64Key = data.public_key as string
          const sodium = await import('libsodium-wrappers-sumo')
          await sodium.ready
          theirPublicKey = sodium.from_base64(base64Key)
          conversationStore.cacheParticipantPublicKey(props.participantUsername, theirPublicKey)
        }

        // Calculer le numéro de sécurité
        if (!myPublicKey) {
          throw new Error('Clé publique locale introuvable')
        }
        safetyNumber.value = await calculateSafetyNumber(
          myPublicKey,
          theirPublicKey,
          myId.value,
          theirId.value
        )
      } catch (e) {
        console.error(e)
        safetyNumber.value = 'Erreur lors du calcul'
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true }
)

function toggleVerified() {
  if (isVerified.value) {
    conversationStore.unverifyParticipant(props.conversationId, props.participantUsername)
  } else {
    conversationStore.markParticipantAsVerified(props.conversationId, props.participantUsername)
    emit('mark-verified', props.conversationId, props.participantUsername)
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
      <h2 class="text-xl font-semibold mb-4">Numéro de sécurité</h2>

      <div v-if="loading" class="text-center">Calcul en cours...</div>
      <div v-else>
        <p class="mb-2">
          <strong>Vous :</strong> {{ myId }}
        </p>
        <p class="mb-2">
          <strong>{{ participantUsername }} :</strong> {{ theirId }}
        </p>

        <div v-if="needsReverification" class="mb-4 p-2 rounded bg-red-100 text-red-700 border border-red-300 text-center">
          Attention : la clé publique de ce contact a changé.<br>
          Veuillez revérifier son identité avant de marquer comme vérifié.
        </div>

        <p class="font-mono whitespace-pre-wrap break-words border p-2 rounded mb-4 text-center text-lg">
          {{ safetyNumber }}
        </p>

        <div class="flex items-center mb-4">
          <input
            type="checkbox"
            id="verified"
            :checked="isVerified"
            @change="toggleVerified"
            class="mr-2"
          />
          <label for="verified">Marquer comme vérifié</label>
        </div>

        <button @click="close" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Fermer</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Style minimal pour le modal */
</style>