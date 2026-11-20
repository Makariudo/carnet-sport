<script setup lang="ts">
/** Planning d'une semaine : ce qui est prévu chaque jour, coché quand c'est fait. */
import { computed, ref } from 'vue'
import { Check, ChevronLeft, ChevronRight, Play, Plus, X } from 'lucide-vue-next'
import { SPORTS, type Sport } from '../domain/types'
import { SPORT_LABEL } from '../domain/sessions'
import { data, sport as store } from '../stores/sport'
import { addDays, shortDate, todayISO, weekStart, weekdayShort } from '../lib/dates'
import { SPORT_ICON, sportTone } from '../lib/sports'

const today = todayISO()
const start = ref(weekStart(today))
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(start.value, i)))
const entries = (d: string) => data.plan.filter((p) => p.date === d)
const weekEntries = computed(() => data.plan.filter((p) => p.date >= start.value && p.date <= addDays(start.value, 6)))
const done = computed(() => weekEntries.value.filter((p) => p.done).length)

const adding = ref<string | null>(null)
const newSport = ref<Sport>('course')
const newLabel = ref('')
const newProgram = ref<string | null>(null)

function openAdd(d: string) {
  adding.value = adding.value === d ? null : d
  newLabel.value = ''
  newProgram.value = null
}
function add() {
  if (!adding.value) return
  const prog = data.programs.find((p) => p.id === newProgram.value)
  const label = newLabel.value.trim() || prog?.name || SPORT_LABEL[newSport.value]
  store.savePlan({ date: adding.value, sport: newSport.value, label, programId: newSport.value === 'ppg' ? newProgram.value : null })
  adding.value = null
}

/** Copie la semaine précédente dans celle affichée, sans les coches. */
function copyPrevious() {
  const prev = addDays(start.value, -7)
  for (const p of data.plan.filter((x) => x.date >= prev && x.date < start.value))
    store.savePlan({ date: addDays(p.date, 7), sport: p.sport, label: p.label, programId: p.programId })
}
const prevHasPlan = computed(() => data.plan.some((x) => x.date >= addDays(start.value, -7) && x.date < start.value))
</script>

<template>
  <section class="view">
    <div class="weeknav">
      <button type="button" aria-label="Semaine précédente" @click="start = addDays(start, -7)"><ChevronLeft :size="20" /></button>
      <div>
        <strong>{{ start === weekStart(today) ? 'Cette semaine' : `Semaine du ${shortDate(start)}` }}</strong>
        <small class="note">{{ weekEntries.length ? `${done}/${weekEntries.length} faites` : 'Rien de prévu' }}</small>
      </div>
      <button type="button" aria-label="Semaine suivante" @click="start = addDays(start, 7)"><ChevronRight :size="20" /></button>
    </div>

    <button v-if="!weekEntries.length && prevHasPlan" type="button" class="add-btn" @click="copyPrevious">Reprendre le planning de la semaine précédente</button>

    <div v-for="d in days" :key="d" class="day card" :class="{ today: d === today }">
      <div class="dayhead">
        <b>{{ weekdayShort(d) }} <span class="note">{{ shortDate(d) }}</span></b>
        <button type="button" class="btn icon-only" :aria-label="`Prévoir une séance le ${shortDate(d)}`" @click="openAdd(d)"><Plus :size="16" /></button>
      </div>
      <ul class="list">
        <li v-for="p in entries(d)" :key="p.id" class="entry" :class="{ done: p.done }">
          <button type="button" class="tick" :aria-pressed="p.done" :aria-label="p.done ? 'Marquer comme à faire' : 'Marquer comme fait'" @click="store.togglePlan(p.id)">
            <Check v-if="p.done" :size="15" :stroke-width="3" />
          </button>
          <component :is="SPORT_ICON[p.sport]" :size="16" :style="{ color: sportTone(p.sport) }" />
          <span class="elab">{{ p.label }}</span>
          <RouterLink v-if="p.programId && !p.done" :to="`/minuteur/${p.programId}?plan=${p.id}`" class="btn icon-only" aria-label="Lancer le minuteur"><Play :size="15" /></RouterLink>
          <RouterLink v-else-if="!p.done" :to="`/?plan=${p.id}`" class="btn small">Saisir</RouterLink>
          <RouterLink v-else-if="p.sessionId" :to="`/seance/${p.sessionId}`" class="note">voir</RouterLink>
          <button type="button" class="del" :aria-label="`Retirer ${p.label}`" @click="store.deletePlan(p.id)"><X :size="15" /></button>
        </li>
      </ul>
      <form v-if="adding === d" class="adder" @submit.prevent="add">
        <div class="chips">
          <button v-for="s in SPORTS" :key="s" type="button" class="chip" :aria-pressed="newSport === s" :style="{ '--tone': sportTone(s) }" @click="newSport = s">
            <component :is="SPORT_ICON[s]" :size="14" />{{ SPORT_LABEL[s] }}
          </button>
        </div>
        <div v-if="newSport === 'ppg'" class="chips">
          <button v-for="p in data.programs" :key="p.id" type="button" class="chip" :aria-pressed="newProgram === p.id" @click="newProgram = newProgram === p.id ? null : p.id">{{ p.name }}</button>
        </div>
        <input v-model="newLabel" class="txt" :placeholder="newSport === 'course' ? `Footing 45', 10x1000 r1'30…` : 'Libellé (facultatif)'" />
        <div class="btns">
          <button type="submit" class="btn primary">Ajouter</button>
          <button type="button" class="btn" @click="adding = null">Annuler</button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.weeknav { display: flex; align-items: center; justify-content: space-between; gap: 10px }
.weeknav div { display: flex; flex-direction: column; align-items: center }
.weeknav strong { font-family: var(--f-display); font-size: 19px }
.weeknav button { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; width: 40px; height: 40px; display: grid; place-items: center; cursor: pointer }
.day { padding: 10px 12px; display: flex; flex-direction: column; gap: 6px }
.day.today { border-color: var(--acc) }
.dayhead { display: flex; justify-content: space-between; align-items: center }
.dayhead b { font-family: var(--f-display); font-weight: 500; text-transform: capitalize }
.entry { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px dashed var(--line) }
.entry.done .elab { color: var(--muted); text-decoration: line-through }
.elab { flex: 1; min-width: 0; font-size: 14.5px }
.tick { width: 24px; height: 24px; border-radius: 7px; border: 2px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; padding: 0 }
.tick[aria-pressed="true"] { background: var(--pos); border-color: var(--pos); color: #fff }
.btn.small { padding: 4px 10px; font-size: 13px }
.del { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 4px; display: grid }
.adder { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--line) }
</style>
