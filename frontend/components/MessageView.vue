<script setup lang="ts">
import { ref, watchEffect, onMounted, nextTick } from 'vue';
import { useMessageStore } from '@/stores/messages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  conversationId: number;
}

const props = defineProps<Props>();

const messageStore = useMessageStore();

const messages = ref(messageStore.getMessagesForConversation(props.conversationId));

const scrollContainer = ref<HTMLElement | null>(null);

watchEffect(() => {
  messages.value = messageStore.getMessagesForConversation(props.conversationId);
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
});
</script>

<template>
  <ScrollArea class="h-full w-full overflow-y-auto" ref="scrollContainer">
    <div class="flex flex-col space-y-2 p-4">
      <Card
        v-for="msg in messages"
        :key="msg.messageId"
        :class="[
          'max-w-[70%]',
          msg.senderId === 'me' ? 'self-end bg-blue-100' : 'self-start bg-gray-100',
          msg.error ? 'border border-red-500' : ''
        ]"
      >
        <CardContent class="p-2">
          <div class="text-sm whitespace-pre-wrap break-words">
            {{ msg.plaintext || (msg.error ? 'Erreur de déchiffrement' : '') }}
          </div>
          <div class="text-xs text-gray-500 mt-1 flex justify-between">
            <span>{{ msg.senderId }}</span>
            <span>{{ new Date(msg.timestamp).toLocaleTimeString() }}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </ScrollArea>
</template>

<style scoped>
/* Optionnel : styles supplémentaires */
</style>