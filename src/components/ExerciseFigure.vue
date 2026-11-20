<script setup lang="ts">
/**
 * Schéma d'un exercice : bonhomme articulé animé en boucle (ou figé pour une vignette).
 * Respecte « réduire les animations » : on montre alors la pose clé, sans mouvement.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GROUND, keySkeleton, skeletonAt, type Figure, type Pt, type Skeleton } from '../domain/figure'

const props = withDefaults(defineProps<{ figure: Figure; animate?: boolean; label?: string }>(), { animate: true, label: '' })

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const time = ref(0)
let raf = 0
let start = 0

function loop(now: number) {
  if (!start) start = now
  time.value = (now - start) / 1000
  raf = requestAnimationFrame(loop)
}
function run() {
  cancelAnimationFrame(raf)
  start = 0
  if (props.animate && !reduced) raf = requestAnimationFrame(loop)
}
onMounted(run)
watch(() => [props.figure, props.animate], run)
onBeforeUnmount(() => cancelAnimationFrame(raf))

const sk = computed<Skeleton>(() => (props.animate && !reduced ? skeletonAt(props.figure, time.value) : keySkeleton(props.figure)))
const line = (...pts: Pt[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
const has = (k: string) => props.figure.props?.some((p) => p.kind === k)
const boxes = computed(() => props.figure.props?.filter((p) => p.kind === 'box') ?? [])
const walls = computed(() => props.figure.props?.filter((p) => p.kind === 'wall') ?? [])
const band = computed(() => props.figure.props?.find((p) => p.kind === 'band'))
</script>

<template>
  <svg class="fig" viewBox="0 0 200 160" role="img" :aria-label="label || 'Schéma de l\'exercice'">
    <line class="ground" x1="4" :y1="GROUND" x2="196" :y2="GROUND" />
    <template v-for="(b, i) in boxes" :key="'b' + i">
      <rect v-if="b.kind === 'box'" class="prop-fill" :x="b.x" :y="GROUND - b.h" :width="b.w" :height="b.h" rx="2" />
    </template>
    <template v-for="(w, i) in walls" :key="'w' + i">
      <line v-if="w.kind === 'wall'" class="wall" :x1="w.x" y1="10" :x2="w.x" :y2="GROUND" />
    </template>

    <!-- Côté éloigné -->
    <g class="far">
      <polyline :points="line(sk.hip, sk.lKnee, sk.lAnkle, sk.lToe)" />
      <polyline :points="line(sk.neck, sk.lElbow, sk.lWrist)" />
    </g>
    <!-- Tronc, tête -->
    <g class="body">
      <line :x1="sk.hip[0]" :y1="sk.hip[1]" :x2="sk.neck[0]" :y2="sk.neck[1]" class="trunk" />
      <circle :cx="sk.head[0]" :cy="sk.head[1]" r="8" class="head" />
      <polyline :points="line(sk.hip, sk.rKnee, sk.rAnkle, sk.rToe)" />
      <polyline :points="line(sk.neck, sk.rElbow, sk.rWrist)" />
    </g>

    <!-- Charges et accessoires -->
    <g v-if="has('dumbbells')" class="load">
      <rect :x="sk.lWrist[0] - 6" :y="sk.lWrist[1] - 3" width="12" height="6" rx="2" class="far-load" />
      <rect :x="sk.rWrist[0] - 6" :y="sk.rWrist[1] - 3" width="12" height="6" rx="2" />
    </g>
    <g v-if="has('dumbbell')" class="load">
      <rect :x="sk.rWrist[0] - 6" :y="sk.rWrist[1] - 3" width="12" height="6" rx="2" />
    </g>
    <g v-if="has('goblet')" class="load">
      <rect :x="mid(sk.rWrist, sk.lWrist)[0] - 5" :y="mid(sk.rWrist, sk.lWrist)[1] - 8" width="10" height="14" rx="3" />
    </g>
    <g v-if="has('bar')" class="load">
      <circle :cx="sk.neck[0] - 3" :cy="sk.neck[1] + 2" r="9" />
      <circle :cx="sk.neck[0] - 3" :cy="sk.neck[1] + 2" r="2.5" class="hub" />
    </g>
    <g v-if="band" class="band">
      <ellipse v-if="band.kind === 'band'" :cx="band.at === 'knees' ? mid(sk.rKnee, sk.lKnee)[0] : mid(sk.rAnkle, sk.lAnkle)[0]"
        :cy="band.at === 'knees' ? mid(sk.rKnee, sk.lKnee)[1] : mid(sk.rAnkle, sk.lAnkle)[1]" rx="9" ry="4" />
    </g>
  </svg>
</template>

<style scoped>
.fig { width: 100%; height: auto; display: block }
.ground { stroke: var(--line); stroke-width: 2; stroke-linecap: round }
.wall { stroke: var(--line); stroke-width: 4 }
.prop-fill { fill: var(--soft); stroke: var(--line); stroke-width: 1.5 }
polyline, .trunk { fill: none; stroke-linecap: round; stroke-linejoin: round }
.body polyline, .body .trunk { stroke: var(--ink); stroke-width: 6 }
.head { fill: var(--ink) }
.far polyline { stroke: var(--muted); stroke-width: 5.5; opacity: .45 }
.load rect, .load circle { fill: var(--acc) }
.load .far-load { opacity: .45 }
.load .hub { fill: var(--surface) }
.band ellipse { fill: none; stroke: var(--sport-ppg); stroke-width: 2.5 }
</style>
