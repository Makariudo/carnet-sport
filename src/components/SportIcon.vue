<script setup lang="ts">
import type { Sport } from '../domain/types'
import { SPORT_ICON, sportTone } from '../lib/sports'

withDefaults(defineProps<{ sport: Sport; size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <span class="icon" :class="size" :style="{ '--tone': sportTone(sport) }" aria-hidden="true">
    <component :is="SPORT_ICON[sport]" :size="size === 'sm' ? 15 : 19" :stroke-width="2" />
  </span>
</template>
