<script setup lang="ts">
/** Courbe avec aire et moyenne ; toucher un point le sélectionne. */
import { computed } from 'vue'
import { ticks } from '../lib/chart'

const props = withDefaults(defineProps<{
  values: number[]
  labels: string[]
  /** Unité affichée sur l'axe vertical. */
  unit?: string
  selected?: number | null
  description: string
}>(), { unit: '', selected: null })
const emit = defineEmits<{ select: [i: number] }>()

const W = 340, H = 170, L = 30, R = 8, T = 14, B = 22
const yTicks = computed(() => ticks(0, Math.max(1, ...props.values)))
const top = computed(() => yTicks.value[yTicks.value.length - 1])
const x = (i: number) => L + (props.values.length < 2 ? 0.5 : i / (props.values.length - 1)) * (W - L - R)
const y = (v: number) => T + (1 - v / top.value) * (H - T - B)
const path = computed(() => props.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(''))
const area = computed(() => `${path.value}V${y(0).toFixed(1)}H${x(0).toFixed(1)}Z`)
const avg = computed(() => props.values.reduce((a, v) => a + v, 0) / (props.values.length || 1))
/** Une étiquette sur deux ou trois selon la place. */
const every = computed(() => Math.ceil(props.values.length / 6))
const sel = computed(() => props.selected ?? props.values.length - 1)
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="description">
    <g v-for="t in yTicks" :key="t">
      <line class="grid" :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" />
      <text class="t" :x="L - 5" :y="y(t) + 3" text-anchor="end">{{ t }}</text>
    </g>
    <text class="t" :x="L - 5" :y="T - 5" text-anchor="end">{{ unit }}</text>
    <template v-for="(l, i) in labels" :key="'l' + i">
      <text v-if="(labels.length - 1 - i) % every === 0" class="t" :x="x(i)" :y="H - 6" text-anchor="middle">{{ l }}</text>
    </template>
    <path class="area" :d="area" />
    <line class="avgline" :x1="L" :x2="W - R" :y1="y(avg)" :y2="y(avg)" />
    <path class="line" :d="path" />
    <line class="cursor" :x1="x(sel)" :x2="x(sel)" :y1="T" :y2="y(0)" />
    <circle v-for="(v, i) in values" :key="'d' + i" class="dot" :class="{ on: i === sel }" :cx="x(i)" :cy="y(v)" :r="i === sel ? 5 : 3" />
    <!-- Zones de toucher larges, une par point. -->
    <rect v-for="(_, i) in values" :key="'h' + i" class="hit" :x="x(i) - (W - L - R) / values.length / 2" :y="0"
      :width="(W - L - R) / values.length" :height="H" @click="emit('select', i)" />
  </svg>
</template>

<style scoped>
.cursor { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 2 3; opacity: .6 }
.dot:not(.on) { fill: var(--surface); stroke: var(--acc); stroke-width: 1.6 }
.hit { fill: transparent; cursor: pointer }
</style>
