<script setup lang="ts">
/**
 * Saisie rapide d'une séance, et modification d'une séance existante (/seance/:id).
 * Le minimum : un sport, une distance, une durée. Le reste (type, blocs, ressenti, jalon) est facultatif.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, Play, Star, Trash2 } from 'lucide-vue-next'
import { KINDS, SPORTS, STRUCTURED_KINDS, type Block, type Session, type Sport } from '../domain/types'
import { blockPace, blocksToInput, formatBlock, parseBlocks, parseSplits, sessionSignature } from '../domain/blocks'
import { SPORT_LABEL, byDateDesc, sessionDistance } from '../domain/sessions'
import { data, sport as store } from '../stores/sport'
import { fmtClock, fmtDistance, fmtDuration, fmtKm, fmtPace, fmtSpeed, fmtSwimPace, pacePerKm, parseDistance, parseDuration } from '../lib/time'
import { todayISO, shortDate } from '../lib/dates'
import { SPORT_ICON, sportTone } from '../lib/sports'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const { show } = useToast()

const LAST_SPORT = 'mon-sport-last'
function lastSport(): Sport {
  try {
    const s = localStorage.getItem(LAST_SPORT) as Sport | null
    return s && SPORTS.includes(s) ? s : 'course'
  } catch { return 'course' }
}

const editId = computed(() => (route.params.id as string | undefined) ?? null)
const editing = computed(() => (editId.value ? data.sessions.find((s) => s.id === editId.value) ?? null : null))

const sport = ref<Sport>(lastSport())
const kind = ref<string | null>(null)
const distance = ref('')
const duration = ref('')
const blocksText = ref('')
const splitsText = ref<string[]>([])
const rpe = ref<number | null>(null)
const date = ref(todayISO())
const title = ref('')
const elevation = ref('')
const notes = ref('')
const programId = ref<string | null>(null)
const favorite = ref(false)
const milestone = ref('')
const showMore = ref(false)
const error = ref('')
const armed = ref(false)
/** Entrée du planning que cette saisie viendra cocher. */
const planId = ref<string | null>((route.query.plan as string | undefined) ?? null)

const distInput = ref<HTMLInputElement | null>(null)

/** Unité tapée par défaut : des km, sauf en natation où l'on compte en mètres. */
const distUnit = computed(() => (sport.value === 'natation' ? 'm' : 'km'))
const hasDistance = computed(() => sport.value !== 'ppg')
const structured = computed(() => !!kind.value && STRUCTURED_KINDS.includes(kind.value) && sport.value !== 'ppg')

const distM = computed(() => (distance.value.trim() ? parseDistance(distance.value, distUnit.value) : null))
const durS = computed(() => (duration.value.trim() ? parseDuration(duration.value, 'min') : null))

const parsed = computed(() => parseBlocks(blocksText.value))
/** Blocs lus, avec les chronos saisis pour chacun. */
const blocks = computed<Block[]>(() =>
  parsed.value.blocks.map((b, i) => {
    const splits = parseSplits(splitsText.value[i] ?? '')
    return splits.length ? { ...b, splits } : b
  }),
)

const derived = computed(() => {
  const d = distM.value, t = durS.value
  if (!d || !t || Number.isNaN(d) || Number.isNaN(t)) return ''
  if (sport.value === 'course') return fmtPace(pacePerKm(d, t))
  if (sport.value === 'natation') return fmtSwimPace(d, t)
  return fmtSpeed(d, t)
})

/** Les dernières séances différentes de ce sport, à refaire en un geste. */
const recents = computed(() => {
  const seen = new Set<string>()
  const out: Session[] = []
  for (const s of [...data.sessions].sort(byDateDesc)) {
    if (s.sport !== sport.value) continue
    const key = `${s.kind}|${sessionSignature(s)}|${Math.round(sessionDistance(s) / 1000)}|${s.programId ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length === 4) break
  }
  return out
})
const recentLabel = (s: Session) => {
  if (s.sport === 'ppg') return data.programs.find((p) => p.id === s.programId)?.name ?? s.kind ?? 'PPG'
  const sig = sessionSignature(s)
  if (sig) return sig
  const d = sessionDistance(s)
  return [s.kind, d ? (d < 1000 ? fmtDistance(d) : `${fmtKm(d)} km`) : null].filter(Boolean).join(' · ')
}

/** Ce qui est prévu aujourd'hui et pas encore fait. */
const todayPlan = computed(() => data.plan.filter((p) => p.date === todayISO() && !p.done))

function fill(s: Session, keepDate = false) {
  sport.value = s.sport
  kind.value = s.kind ?? null
  distance.value = s.distance ? (s.sport === 'natation' ? String(s.distance) : String(s.distance / 1000).replace('.', ',')) : ''
  duration.value = s.duration ? fmtDuration(s.duration) : ''
  blocksText.value = s.blocks?.length ? blocksToInput(s.blocks.map(({ splits: _s, ...b }) => b)) : ''
  splitsText.value = []
  programId.value = s.programId ?? null
  elevation.value = s.elevation ? String(s.elevation) : ''
  if (!keepDate) date.value = s.date
}

function reset() {
  kind.value = null
  distance.value = ''
  duration.value = ''
  blocksText.value = ''
  splitsText.value = []
  rpe.value = null
  date.value = todayISO()
  title.value = ''
  elevation.value = ''
  notes.value = ''
  programId.value = null
  favorite.value = false
  milestone.value = ''
  showMore.value = false
  error.value = ''
  planId.value = null
}

function loadEditing() {
  const s = editing.value
  if (!s) return
  fill(s)
  splitsText.value = (s.blocks ?? []).map((b) => (b.splits ?? []).map(fmtClock).join(' '))
  rpe.value = s.rpe ?? null
  title.value = s.title ?? ''
  notes.value = s.notes ?? ''
  favorite.value = !!s.favorite
  milestone.value = s.milestone ?? ''
  showMore.value = !!(s.title || s.notes || s.elevation)
}

function pickRecent(s: Session) {
  fill(s, true)
  void nextTick(() => (structured.value ? null : distInput.value?.focus()))
}

function pickPlan(id: string) {
  const p = data.plan.find((x) => x.id === id)
  if (!p) return
  planId.value = p.id
  sport.value = p.sport
  if (p.programId) {
    programId.value = p.programId
    kind.value = 'Renfo'
  } else {
    // Un libellé de plan qui ressemble à des blocs (« 10x1000 r1'30 ») préremplit le fractionné.
    const b = parseBlocks(p.label)
    if (b.blocks.length && !b.errors.length) {
      kind.value = sport.value === 'course' ? 'Fractionné' : 'Intervalles'
      blocksText.value = p.label
    }
  }
  title.value = p.label
}

watch(sport, (s, old) => {
  if (old && !editing.value) {
    if (kind.value && !KINDS[s].includes(kind.value)) kind.value = null
  }
  try { localStorage.setItem(LAST_SPORT, s) } catch { /* ignoré */ }
})
watch([distance, duration, blocksText], () => (error.value = ''))

function selectProgram(id: string) {
  programId.value = programId.value === id ? null : id
  if (programId.value && !kind.value) kind.value = 'Renfo'
}

function submit() {
  const d = distM.value, t = durS.value
  if (d !== null && Number.isNaN(d)) return void (error.value = `Distance illisible : tape par exemple ${distUnit.value === 'km' ? '10 ou 10,5' : '1500'}.`)
  if (t !== null && Number.isNaN(t)) return void (error.value = 'Durée illisible : tape par exemple 45, 1h05 ou 52:30.')
  if (structured.value && parsed.value.errors.length) return void (error.value = `Bloc non compris : « ${parsed.value.errors[0]} ».`)
  const prog = data.programs.find((p) => p.id === programId.value)
  if (!d && !t && !blocks.value.length && !prog) return void (error.value = 'Indique au moins une distance ou une durée.')

  const s = {
    id: editing.value?.id,
    source: editing.value?.source,
    externalId: editing.value?.externalId,
    date: date.value || todayISO(),
    sport: sport.value,
    kind: kind.value,
    title: title.value.trim() || null,
    distance: hasDistance.value ? d || null : null,
    duration: t || null,
    elevation: elevation.value.trim() ? parseInt(elevation.value, 10) || null : null,
    rpe: rpe.value,
    notes: notes.value.trim() || null,
    blocks: structured.value && blocks.value.length ? blocks.value : undefined,
    ppg: sport.value === 'ppg' && prog ? prog.items : undefined,
    programId: sport.value === 'ppg' ? programId.value : null,
    favorite: favorite.value,
    milestone: favorite.value ? milestone.value.trim() || null : null,
  }
  const id = store.saveSession(s)
  if (planId.value) store.togglePlan(planId.value, id)

  if (editing.value) {
    show('Séance mise à jour')
    void router.push('/journal')
    return
  }
  const what = [SPORT_LABEL[s.sport], s.distance ? fmtDistance(s.distance) : null, s.duration ? fmtDuration(s.duration) : null].filter(Boolean).join(' · ')
  show(favorite.value ? `Jalon enregistré : ${what}` : `Séance enregistrée : ${what}`, favorite.value ? 'win' : 'info')
  reset()
}

function remove() {
  if (!editing.value) return
  if (!armed.value) {
    armed.value = true
    setTimeout(() => (armed.value = false), 3000)
    return
  }
  store.deleteSession(editing.value.id)
  show('Séance supprimée')
  void router.push('/journal')
}

watch(editing, () => (editing.value ? loadEditing() : reset()))
onMounted(() => {
  if (editing.value) loadEditing()
  else if (planId.value) pickPlan(planId.value)
})
</script>

<template>
  <section class="view">
    <p v-if="editId && !editing" class="empty">Cette séance n'existe plus.</p>

    <form v-else class="add" novalidate @submit.prevent="submit">
      <div v-if="!editing && todayPlan.length" class="plan-hint">
        <span class="eyebrow">Prévu aujourd'hui</span>
        <div class="chips">
          <button v-for="p in todayPlan" :key="p.id" type="button" class="chip" :aria-pressed="planId === p.id"
            :style="{ '--tone': sportTone(p.sport) }" @click="pickPlan(p.id)">
            <component :is="SPORT_ICON[p.sport]" :size="15" />{{ p.label }}
          </button>
        </div>
      </div>

      <div class="sports" role="group" aria-label="Sport">
        <button v-for="s in SPORTS" :key="s" type="button" :aria-pressed="sport === s" :style="{ '--tone': sportTone(s) }" @click="sport = s">
          <component :is="SPORT_ICON[s]" :size="22" :stroke-width="1.9" />{{ SPORT_LABEL[s] }}
        </button>
      </div>

      <div v-if="!editing && recents.length" class="field">
        <span class="lbl">Refaire</span>
        <div class="chips scroll">
          <button v-for="r in recents" :key="r.id" type="button" class="chip" @click="pickRecent(r)">
            {{ recentLabel(r) }} <small>{{ shortDate(r.date) }}</small>
          </button>
        </div>
      </div>

      <div class="field">
        <span class="lbl">Type de séance</span>
        <div class="chips">
          <button v-for="k in KINDS[sport]" :key="k" type="button" class="chip" :aria-pressed="kind === k" @click="kind = kind === k ? null : k">{{ k }}</button>
        </div>
      </div>

      <div v-if="sport === 'ppg'" class="field">
        <span class="lbl">Programme</span>
        <div class="chips">
          <button v-for="p in data.programs" :key="p.id" type="button" class="chip" :aria-pressed="programId === p.id" @click="selectProgram(p.id)">{{ p.name }}</button>
          <RouterLink to="/ppg" class="chip">Gérer…</RouterLink>
        </div>
        <RouterLink v-if="programId && !editing" :to="`/minuteur/${programId}`" class="btn primary start">
          <Play :size="16" /> Lancer le minuteur
        </RouterLink>
      </div>

      <div v-if="structured" class="field">
        <label for="blk">Blocs</label>
        <input id="blk" v-model="blocksText" class="txt mono" placeholder="10x1000 en 3'05 r1'30" autocomplete="off" autocapitalize="off" spellcheck="false" />
        <p class="note">Plusieurs blocs : sépare-les par « + ». Exemples : 10x400 en 72'' r200m · 20x30/30 · 3x2km à 3'20/km r2'</p>
        <ul v-if="blocks.length" class="blocks-preview">
          <li v-for="(b, i) in blocks" :key="i" class="bp">
            <div class="bp-head"><b>{{ formatBlock(b) }}</b><span v-if="blockPace(b)">{{ fmtPace(blockPace(b)!) }}</span></div>
            <input v-if="b.distance" v-model="splitsText[i]" class="splits" inputmode="text" :placeholder="`Chronos des ${b.reps} répétitions (facultatif) : ${b.repTime ? fmtClock(b.repTime) : '3\'05'} …`" autocomplete="off" spellcheck="false" />
          </li>
        </ul>
      </div>

      <div class="big-inputs" :class="{ single: !hasDistance }">
        <div v-if="hasDistance" class="big-in">
          <label for="dist">Distance{{ structured ? ' totale' : '' }}</label>
          <div class="in">
            <input id="dist" ref="distInput" v-model="distance" inputmode="decimal" :placeholder="distUnit === 'km' ? '0' : '0'" autocomplete="off" enterkeyhint="next" />
            <span>{{ distUnit }}</span>
          </div>
        </div>
        <div class="big-in">
          <label for="dur">Durée</label>
          <div class="in">
            <input id="dur" v-model="duration" inputmode="text" placeholder="0" autocomplete="off" enterkeyhint="done" />
            <span>min</span>
          </div>
        </div>
      </div>
      <p class="derived">{{ derived }}</p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <div class="field">
        <span class="lbl">Ressenti · facultatif</span>
        <div class="rpe" role="group" aria-label="Ressenti de 1 à 10">
          <button v-for="n in 10" :key="n" type="button" :aria-pressed="rpe === n" @click="rpe = rpe === n ? null : n">{{ n }}</button>
        </div>
      </div>

      <div class="fav" :class="{ on: favorite }">
        <button type="button" class="fav-btn" :aria-pressed="favorite" @click="favorite = !favorite">
          <Star :size="20" :fill="favorite ? 'currentColor' : 'none'" /> {{ favorite ? 'Jalon' : 'Marquer comme jalon' }}
        </button>
        <input v-if="favorite" v-model="milestone" class="txt" placeholder="Ce qu'elle marque : premier 10x1000 en 3'05…" />
      </div>

      <button type="button" class="more" :aria-expanded="showMore" @click="showMore = !showMore">
        <ChevronDown :size="16" :style="{ transform: showMore ? 'rotate(180deg)' : '' }" /> Plus de détails
      </button>
      <template v-if="showMore">
        <div class="field">
          <label for="ttl">Titre</label>
          <input id="ttl" v-model="title" class="txt" placeholder="Facultatif" />
        </div>
        <div v-if="hasDistance && sport !== 'natation'" class="field">
          <label for="dplus">Dénivelé positif (m)</label>
          <input id="dplus" v-model="elevation" class="txt" inputmode="numeric" />
        </div>
        <div class="field">
          <label for="nts">Notes</label>
          <textarea id="nts" v-model="notes" class="txt" rows="2" />
        </div>
      </template>

      <div class="daterow">
        <label for="dt" class="note">Date</label>
        <input id="dt" v-model="date" type="date" />
      </div>

      <button type="submit" class="go">{{ editing ? 'Enregistrer les modifications' : 'Enregistrer la séance' }}</button>
      <button v-if="editing" type="button" class="btn danger" :class="{ armed }" @click="remove">
        <Trash2 :size="16" /> {{ armed ? 'Confirmer la suppression' : 'Supprimer la séance' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.plan-hint { display: flex; flex-direction: column; gap: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px }
.plan-hint .chip[aria-pressed="false"] { color: var(--tone) }
.chips.scroll { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none }
.chip small { color: var(--muted); font-size: 11.5px }
.chip[aria-pressed="true"] small { color: inherit; opacity: .8 }
a.chip { text-decoration: none; color: var(--acc) }
.start { align-self: flex-start; margin-top: 4px }
.mono { font-family: var(--f-num); font-size: 16px }
.big-inputs.single { grid-template-columns: 1fr }
.bp { flex-direction: column; align-items: stretch }
.bp-head { display: flex; justify-content: space-between; gap: 8px }
.bp-head b { font-weight: 500 }
.splits { border: 1px dashed var(--line); background: var(--surface); border-radius: 6px; padding: 6px 8px; font-family: var(--f-num); font-size: 13px; margin-top: 6px; width: 100% }
.fav { display: flex; flex-direction: column; gap: 8px }
.fav-btn { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); background: var(--surface); border-radius: 999px; padding: 7px 14px; font-weight: 600; font-size: 14px; color: var(--muted); cursor: pointer }
.fav.on .fav-btn { color: var(--star); border-color: var(--star); background: color-mix(in srgb, var(--star) 12%, var(--surface)) }
.btn.danger { align-self: center }
</style>
