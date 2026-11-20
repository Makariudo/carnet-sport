<script setup lang="ts">
/**
 * Plusieurs courbes sur les mêmes périodes : axe de gauche (ex. km) et, en option, axe de droite
 * pour une autre unité (ex. heures de PPG). Toucher une période la sélectionne.
 */
import { computed } from 'vue'
import { ticks, type Series } from '../lib/chart'

const props = withDefaults(defineProps<{
  series: Series[]
  labels: string[]
  unit?: string
  rightUnit?: string
  selected?: number | null
  description: string
}>(), { unit: '', rightUnit: '', selected: null })
const emit = defineEmits<{ select: [i: number] }>()

const W = 340, H = 170, L = 30, T = 14, B = 22
const n = computed(() => props.labels.length)
const hasRight = computed(() => props.series.some((s) => s.axis === 'right'))
const R = computed(() => (hasRight.value ? 26 : 8))

const scale = (axis: 'left' | 'right') => {
  const vals = props.series.filter((s) => (s.axis ?? 'left') === axis).flatMap((s) => s.values)
  const t = ticks(0, Math.max(1, ...vals))
  return { ticks: t, top: t[t.length - 1] }
}
const left = computed(() => scale('left'))
const right = computed(() => scale('right'))

const x = (i: number) => L + (n.value < 2 ? 0.5 : i / (n.value - 1)) * (W - L - R.value)
const y = (v: number, axis: 'left' | 'right' = 'left') => {
  const top = axis === 'right' ? right.value.top : left.value.top
  return T + (1 - v / top) * (H - T - B)
}
const path = (s: Series) => s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v, s.axis).toFixed(1)}`).join('')
const every = computed(() => Math.ceil(n.value / 6))
const sel = computed(() => props.selected ?? n.value - 1)
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="description">
    <g v-for="t in left.ticks" :key="'g' + t">
      <line class="grid" :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" />
      <text class="t" :x="L - 5" :y="y(t) + 3" text-anchor="end">{{ t }}</text>
    </g>
    <text class="t" :x="L - 5" :y="T - 5" text-anchor="end">{{ unit }}</text>
    <template v-if="hasRight">
      <text v-for="t in right.ticks" :key="'r' + t" class="t" :x="W - R + 5" :y="y(t, 'right') + 3" text-anchor="start">{{ t.toLocaleString('fr-FR') }}</text>
      <text class="t" :x="W - R + 5" :y="T - 5" text-anchor="start">{{ rightUnit }}</text>
    </template>
    <template v-for="(l, i) in labels" :key="'l' + i">
      <text v-if="(labels.length - 1 - i) % every === 0" class="t" :x="x(i)" :y="H - 6" text-anchor="middle">{{ l }}</text>
    </template>
    <line class="cursor" :x1="x(sel)" :x2="x(sel)" :y1="T" :y2="y(0)" />
    <g v-for="s in series" :key="s.label" :style="{ '--c': s.color }">
      <path class="ml" :class="{ alt: s.axis === 'right' }" :d="path(s)" />
      <circle v-for="(v, i) in s.values" :key="i" class="md" :class="{ on: i === sel }" :cx="x(i)" :cy="y(v, s.axis)" :r="i === sel ? 4 : 2.2" />
    </g>
    <rect v-for="(_, i) in labels" :key="'h' + i" class="hit" :x="x(i) - (W - L - R) / n / 2" :y="0"
      :width="(W - L - R) / n" :height="H" @click="emit('select', i)" />
  </svg>
</template>

<style scoped>
.ml { fill: none; stroke: var(--c); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round }
.ml.alt { stroke-dasharray: 5 3 }
.md { fill: var(--surface); stroke: var(--c); stroke-width: 1.5 }
.md.on { fill: var(--c) }
.cursor { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 2 3; opacity: .6 }
.hit { fill: transparent; cursor: pointer }
</style>
