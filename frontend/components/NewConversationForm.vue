<template>
  <div>
    <ui-dialog v-model="isOpen">
      <template #trigger>
        <ui-button @click="isOpen = true">Nouvelle conversation</ui-button>
      </template>
      <template #default>
        <div class="p-4 space-y-4">
          <h2 class="text-lg font-semibold">Créer une nouvelle conversation</h2>
          <div>
            <label class="block mb-2 font-medium">Participants :</label>
            <div class="space-y-2">
              <div v-for="user in mockUsers" :key="user" class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  :id="user"
                  :value="user"
                  v-model="selectedUsers"
                  class="checkbox"
                />
                <label :for="user">{{ user }}</label>
              </div>
            </div>
          </div>
          <ui-button @click="createConversation" class="mt-4 w-full">Créer</ui-button>
        </div>
      </template>
    </ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/button/Button.vue'
import { useConversations } from '@/composables/useConversations'

const isOpen = ref(false)
const selectedUsers = ref<string[]>([])

// Liste factice d'utilisateurs
const mockUsers = ['alice', 'bob', 'carol', 'dave']

const { createConversation: createConv, fetchConversations } = useConversations()

async function createConversation() {
  if (selectedUsers.value.length === 0) {
    alert('Veuillez sélectionner au moins un participant.')
    return
  }
  try {
    await createConv(selectedUsers.value)
    isOpen.value = false
    selectedUsers.value = []
    await fetchConversations()
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error)
    alert('Erreur lors de la création de la conversation.')
  }
}
</script>

<style scoped>
/* Style minimal pour checkbox */
.checkbox {
  accent-color: #3b82f6; /* bleu tailwind */
}
</style>