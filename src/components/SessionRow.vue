<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'
import type { Session } from '../domain/types'
import { formatBlock } from '../domain/blocks'
import { SPORT_LABEL, sessionDistance, speedLabel } from '../domain/sessions'
import { data } from '../stores/sport'
import { fmtDistance, fmtDuration } from '../lib/time'
import { shortDate, weekdayShort } from '../lib/dates'
import SportIcon from './SportIcon.vue'

const props = defineProps<{ s: Session }>()

const label = computed(() => {
  const s = props.s
  if (s.title) return s.title
  if (s.sport === 'ppg') return data.programs.find((p) => p.id === s.programId)?.name ?? s.kind ?? 'PPG'
  return s.kind ? `${SPORT_LABEL[s.sport]} · ${s.kind}` : SPORT_LABEL[s.sport]
})
const detail = computed(() => {
  const s = props.s
  const parts: string[] = [`${weekdayShort(s.date)} ${shortDate(s.date)}`]
  if (s.blocks?.length) parts.push(s.blocks.map(formatBlock).join(' + '))
  else if (s.rpe) parts.push(`ressenti ${s.rpe}/10`)
  return parts.join(' · ')
})
const dist = computed(() => sessionDistance(props.s))
</script>

<template>
  <RouterLink :to="`/seance/${s.id}`" class="row">
    <SportIcon :sport="s.sport" />
    <span class="lab">
      <b><Star v-if="s.favorite" class="star" :size="13" fill="currentColor" /> {{ label }}</b>
      <small>{{ s.milestone && s.favorite ? s.milestone : detail }}</small>
    </span>
    <span class="val">
      <span>{{ dist ? fmtDistance(dist) : s.duration ? fmtDuration(s.duration) : '' }}</span>
      <small>{{ speedLabel(s) ?? (dist && s.duration ? fmtDuration(s.duration) : '') }}</small>
    </span>
  </RouterLink>
</template>
