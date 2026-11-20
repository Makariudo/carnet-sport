<script setup lang="ts">
/** Chrono de chaque répétition, une courbe par séance comparée. L'axe est inversé : plus haut = plus rapide. */
import { computed } from 'vue'
import { fmtClock } from '../lib/time'

const props = defineProps<{ series: { label: string; color: string; values: number[] }[] }>()

const W = 340, H = 180, L = 36, R = 8, T = 12, B = 22
const all = computed(() => props.series.flatMap((s) => s.values))
const n = computed(() => Math.max(2, ...props.series.map((s) => s.values.length)))
const lo = computed(() => Math.floor(Math.min(...all.value) - 1))
const hi = computed(() => Math.ceil(Math.max(...all.value) + 1))
const yTicks = computed(() => {
  const step = Math.max(1, Math.ceil((hi.value - lo.value) / 4))
  const t: number[] = []
  for (let v = lo.value; v <= hi.value; v += step) t.push(v)
  return t
})
const x = (i: number) => L + (i / (n.value - 1)) * (W - L - R)
const y = (v: number) => T + ((v - lo.value) / (hi.value - lo.value || 1)) * (H - T - B)
const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
</script>

<template>
  <div class="chart">
    <p class="eyebrow" style="margin: 0 2px 6px">Chrono par répétition · plus haut = plus rapide</p>
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Chrono de chaque répétition pour les séances comparées">
      <g v-for="t in yTicks" :key="t">
        <line class="grid" :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" />
        <text class="t" :x="L - 5" :y="y(t) + 3" text-anchor="end">{{ fmtClock(t) }}</text>
      </g>
      <text v-for="i in n" :key="'x' + i" class="t" :x="x(i - 1)" :y="H - 6" text-anchor="middle">{{ i }}</text>
      <g v-for="s in series" :key="s.label">
        <path :d="path(s.values)" fill="none" :stroke="s.color" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-for="(v, i) in s.values" :key="i" :cx="x(i)" :cy="y(v)" r="3" :fill="s.color" stroke="var(--surface)" stroke-width="1.5" />
      </g>
    </svg>
    <div class="legend">
      <span v-for="s in series" :key="s.label" :style="{ '--c': s.color }"><i></i>{{ s.label }}</span>
    </div>
  </div>
</template>
