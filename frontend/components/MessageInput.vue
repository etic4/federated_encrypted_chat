<script setup lang="ts">
import { ref } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const emit = defineEmits<{
  (e: 'send-message', content: string): void;
}>();

const messageContent = ref('');

function send() {
  const content = messageContent.value.trim();
  if (!content) return;
  emit('send-message', content);
  messageContent.value = '';
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}
</script>

<template>
  <div class="flex space-x-2 p-2 border-t">
    <Input
      v-model="messageContent"
      placeholder="Tapez votre message..."
      class="flex-1"
      @keydown="onKeydown"
    />
    <Button @click="send">Envoyer</Button>
  </div>
</template>

<style scoped>
/* Optionnel : styles supplémentaires */
</style>