<script setup lang="ts">
import { defineProps } from 'vue'
import UiCard from '@/components/ui/card/Card.vue'
import UiCardHeader from '@/components/ui/card/CardHeader.vue'
import UiCardTitle from '@/components/ui/card/CardTitle.vue'
import UiCardDescription from '@/components/ui/card/CardDescription.vue'
import UiScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'

interface Conversation {
  id: string
  participants: string[]
}

const props = defineProps<{
  conversations: Conversation[]
}>()
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <ui-scroll-area class="flex-1 overflow-y-auto p-4">
      <div class="grid gap-4">
        <ui-card
          v-for="conv in conversations"
          :key="conv.id"
          class="cursor-pointer hover:bg-gray-100 transition"
        >
          <ui-card-header>
            <ui-card-title>Conversation {{ conv.id }}</ui-card-title>
            <ui-card-description>
              Participants :
              <span v-for="(p, idx) in conv.participants" :key="idx">
                {{ p }}<span v-if="idx !== conv.participants.length -1">, </span>
              </span>
            </ui-card-description>
          </ui-card-header>
        </ui-card>
      </div>
    </ui-scroll-area>
  </div>
</template>

<style scoped>
/* Aucun style spécifique pour l'instant */
</style>