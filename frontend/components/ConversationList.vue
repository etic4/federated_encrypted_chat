<script setup lang="ts">
import { defineProps } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationResponse } from '~/types/models'


const props = defineProps<{
  conversations: ConversationResponse[]
}>()
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <ScrollArea class="flex-1 overflow-y-auto p-4">
      <div class="grid gap-4">
        <Card
          v-for="conv in conversations"
          :key="conv.conversationId"
          class="cursor-pointer hover:bg-gray-100 transition"
        >
          <CardHeader>
            <CardTitle>Conversation {{ conv.conversationId }}</CardTitle>
            <CardDescription>
              Participants :
              <span v-for="(p, idx) in conv.participants" :key="idx">
                {{ p }}<span v-if="idx !== conv.participants.length -1">, </span>
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </ScrollArea>
  </div>
</template>

<style scoped>
/* Aucun style spécifique pour l'instant */
</style>