<script setup lang="ts">
/**
 * Minuteur plein écran d'un programme de PPG.
 * Les efforts minutés et les récups défilent seuls (bips sur les 3 dernières secondes) ;
 * un effort compté en répétitions attend « Fait ». À la fin, on enregistre la séance.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Pause, Play, SkipForward, X } from 'lucide-vue-next'
import { buildSteps } from '../domain/timer'
import { data, sport as store } from '../stores/sport'
import { fmtClock, fmtDuration } from '../lib/time'
import { todayISO } from '../lib/dates'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const { show } = useToast()

const program = computed(() => data.programs.find((p) => p.id === route.params.id))
const steps = computed(() => (program.value ? buildSteps(program.value) : []))
const planId = (route.query.plan as string | undefined) ?? null

const index = ref(-1) // -1 : écran de départ
const remaining = ref(0)
const running = ref(false)
const finished = ref(false)
const elapsed = ref(0)
const rpe = ref<number | null>(null)

const step = computed(() => steps.value[index.value])
const next = computed(() => steps.value[index.value + 1])
const progress = computed(() => (steps.value.length ? Math.max(0, index.value) / steps.value.length : 0))

let timer: ReturnType<typeof setInterval> | undefined
let last = 0
let wakeLock: { release(): Promise<void> } | null = null

// ---------------------------------------------------------------- Bips et vibrations
let audio: AudioContext | null = null
function beep(freq = 880, ms = 120) {
  try {
    audio ??= new AudioContext()
    const o = audio.createOscillator(), g = audio.createGain()
    o.frequency.value = freq
    g.gain.value = 0.15
    o.connect(g).connect(audio.destination)
    o.start()
    o.stop(audio.currentTime + ms / 1000)
  } catch { /* pas de son disponible */ }
}
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p) } catch { /* ignoré */ } }

async function keepAwake() {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }
    wakeLock = (await nav.wakeLock?.request('screen')) ?? null
  } catch { /* refusé ou non supporté */ }
}

function enter(i: number) {
  if (i >= steps.value.length) return finish()
  index.value = i
  remaining.value = steps.value[i].seconds ?? 0
  if (steps.value[i].kind === 'effort') { beep(1046, 220); buzz([120, 60, 120]) }
  else { beep(660, 160); buzz(150) }
}

function tick() {
  const now = Date.now()
  const dt = (now - last) / 1000
  last = now
  if (!running.value) return
  elapsed.value += dt
  if (!step.value?.seconds) return // effort en répétitions : on attend « Fait »
  const before = Math.ceil(remaining.value)
  remaining.value -= dt
  const after = Math.ceil(remaining.value)
  if (after !== before && after > 0 && after <= 3) beep(880, 90)
  if (remaining.value <= 0) enter(index.value + 1)
}

function start() {
  void keepAwake()
  running.value = true
  last = Date.now()
  timer ??= setInterval(tick, 200)
  enter(0)
}
function toggle() {
  running.value = !running.value
  last = Date.now()
}
function skip() {
  enter(index.value + 1)
}
function finish() {
  running.value = false
  finished.value = true
  clearInterval(timer)
  timer = undefined
  beep(1318, 400)
  buzz([200, 100, 200, 100, 300])
  void wakeLock?.release().catch(() => {})
}
function quit() {
  if (index.value >= 0 && !finished.value && !confirm('Arrêter le minuteur ?')) return
  void router.back()
}
function save() {
  const p = program.value
  if (!p) return
  const id = store.saveSession({
    date: todayISO(), sport: 'ppg', kind: 'Renfo', duration: Math.round(elapsed.value / 60) * 60 || null,
    rpe: rpe.value, programId: p.id, ppg: p.items, title: null,
  })
  if (planId) store.togglePlan(planId, id)
  show(`PPG enregistrée : ${p.name} · ${fmtDuration(elapsed.value)}`, 'win')
  void router.replace('/ppg')
}

onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
  void wakeLock?.release().catch(() => {})
  void audio?.close().catch(() => {})
})
/** Le verrou d'écran saute quand l'app passe en arrière-plan : on le reprend au retour. */
function onVisible() {
  if (document.visibilityState === 'visible' && running.value) void keepAwake()
}
</script>

<template>
  <div class="timer" :class="step?.kind ?? 'idle'">
    <header>
      <button type="button" class="icon-btn" aria-label="Quitter le minuteur" @click="quit"><X :size="22" /></button>
      <span>{{ program?.name }}</span>
      <span class="num">{{ fmtClock(elapsed) }}</span>
    </header>
    <div class="bar"><span :style="{ width: `${progress * 100}%` }" /></div>

    <p v-if="!program" class="center">Programme introuvable.</p>

    <div v-else-if="finished" class="center">
      <p class="eyebrow">Terminé</p>
      <p class="big">{{ fmtDuration(elapsed) }}</p>
      <p>{{ program.name }}</p>
      <div class="field">
        <span class="lbl">Ressenti</span>
        <div class="rpe">
          <button v-for="n in 10" :key="n" type="button" :aria-pressed="rpe === n" @click="rpe = n">{{ n }}</button>
        </div>
      </div>
      <button type="button" class="go" @click="save">Enregistrer la séance</button>
    </div>

    <div v-else-if="index < 0" class="center">
      <p class="eyebrow">{{ steps.length }} étapes</p>
      <ol class="preview">
        <li v-for="it in program.items" :key="it.exercise">
          <b>{{ it.exercise }}</b>
          <span class="num">{{ it.sets > 1 ? `${it.sets} × ` : '' }}{{ it.duration ? fmtClock(it.duration) : `${it.reps} rép.` }}</span>
        </li>
      </ol>
      <p v-if="program.rounds > 1" class="note">{{ program.rounds }} tours</p>
      <button type="button" class="go" @click="start"><Play :size="18" /> C'est parti</button>
    </div>

    <div v-else-if="step" class="center">
      <p class="eyebrow">{{ step.kind === 'effort' ? 'Effort' : step.kind === 'recup' ? 'Récupération' : 'Transition' }}</p>
      <p class="name">{{ step.label }}</p>
      <p class="big num">{{ step.seconds ? fmtClock(Math.max(0, Math.ceil(remaining))) : `${step.reps} rép.` }}</p>
      <p class="detail">{{ step.detail }}</p>
      <p v-if="next && step.kind === 'effort'" class="next">Ensuite : {{ next.kind === 'effort' ? next.label : `${next.label} ${next.seconds ? fmtClock(next.seconds) : ''}` }}</p>
    </div>

    <footer v-if="program && index >= 0 && !finished">
      <button v-if="step?.seconds" type="button" class="ctl" :aria-label="running ? 'Pause' : 'Reprendre'" @click="toggle">
        <Pause v-if="running" :size="28" /><Play v-else :size="28" />
      </button>
      <button v-else type="button" class="ctl done" aria-label="Série faite" @click="skip"><Check :size="30" :stroke-width="3" /></button>
      <button type="button" class="ctl ghost" aria-label="Étape suivante" @click="skip"><SkipForward :size="24" /></button>
    </footer>
  </div>
</template>

<style scoped>
.timer { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; padding: env(safe-area-inset-top, 0px) 16px env(safe-area-inset-bottom, 0px); max-width: 480px; margin: 0 auto; --tone: var(--muted) }
.timer.effort { --tone: var(--acc) }
.timer.recup, .timer.transition { --tone: var(--sport-natation) }
header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 0; font-weight: 600 }
.icon-btn { border: 0; background: var(--soft); border-radius: 50%; width: 40px; height: 40px; display: grid; place-items: center; cursor: pointer }
.bar { height: 4px; background: var(--soft); border-radius: 2px; overflow: hidden }
.bar span { display: block; height: 100%; background: var(--tone); transition: width .3s }
.center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center }
.eyebrow { color: var(--tone); font-weight: 600 }
.name { font-family: var(--f-display); font-size: 30px; font-weight: 700; margin: 0; letter-spacing: -.01em }
.big { font-family: var(--f-num); font-size: 96px; font-weight: 500; margin: 0; line-height: 1; color: var(--tone); letter-spacing: -.04em }
.detail { margin: 0; color: var(--muted) }
.next { margin: 12px 0 0; font-size: 15px; background: var(--soft); border-radius: 999px; padding: 6px 14px }
.preview { list-style: none; padding: 0; margin: 0; width: 100%; display: flex; flex-direction: column; gap: 6px }
.preview li { display: flex; justify-content: space-between; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px }
.go { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 12px }
.field { width: 100% }
footer { display: flex; justify-content: center; align-items: center; gap: 20px; padding: 20px 0 28px }
.ctl { width: 84px; height: 84px; border-radius: 50%; border: 0; background: var(--tone); color: #fff; display: grid; place-items: center; cursor: pointer }
.ctl.done { background: var(--pos) }
.ctl.ghost { width: 60px; height: 60px; background: var(--soft); color: var(--ink) }
</style>
