<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useConversations } from '@/composables/useConversations'
import { useConversationsStore } from '@/stores/conversations'
import ConversationList from '@/components/ConversationList.vue'
import NewConversationForm from '@/components/NewConversationForm.vue'

const router = useRouter()
const authStore = useAuthStore()
const { fetchConversations } = useConversations()
const conversationsStore = useConversationsStore()

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  await fetchConversations()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Mes conversations</h1>
      <NewConversationForm />
    </div>
    <ConversationList :conversations="conversationsStore.getConversationList" />
  </div>
</template>

<style scoped>
/* Aucun style spécifique */
</style>