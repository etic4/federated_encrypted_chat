<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import MessageView from '@/components/MessageView.vue';
import MessageInput from '@/components/MessageInput.vue';
import { useMessageStore } from '@/stores/messages';

const route = useRoute();
const messageStore = useMessageStore();

const conversationId = Number(route.params.id);

import { useMessages } from '@/composables/useMessages'

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

onMounted(() => {
  loadHistory(conversationId);
});

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      const convId = Number(newId)
      loadHistory(convId)
    }
  }
);
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto">
      <MessageView :conversation-id="conversationId" />
    </div>
    <MessageInput @send-message="(content) => sendMessage(conversationId, content)" />
  </div>
</template>

<style scoped>
/* Optionnel : styles supplémentaires */
</style>