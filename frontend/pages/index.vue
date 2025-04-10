<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Mes conversations</h1>
      <NewConversationForm />
    </div>
    <ConversationList :conversations="conversationsStore.getConversationList" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useConversations } from '@/composables/useConversations'
import { useConversationsStore } from '@/stores/conversations'
import ConversationList from '@/components/ConversationList.vue'
import NewConversationForm from '@/components/NewConversationForm.vue'

const router = useRouter()
const auth = useAuth()
const { fetchConversations } = useConversations()
const conversationsStore = useConversationsStore()

onMounted(async () => {
  if (!auth.isAuthenticated()) {
    router.push('/login')
    return
  }
  await fetchConversations()
})
</script>

<style scoped>
/* Aucun style spécifique */
</style>