<script setup lang="ts">
/** Programmes types de PPG (création, modification, lancement du minuteur) et journal des séances de PPG. */
import { computed, ref } from 'vue'
import { ChevronDown, Play, Plus, Trash2, X } from 'lucide-vue-next'
import type { PpgItem, Program } from '../domain/types'
import { estimateSeconds } from '../domain/timer'
import { byDateDesc } from '../domain/sessions'
import { data, sport as store } from '../stores/sport'
import { newId } from '../data/seed'
import { fmtClock, fmtDuration, parseDuration } from '../lib/time'
import SessionRow from '../components/SessionRow.vue'

const openId = ref<string | null>(null)
/** Copie de travail du programme ouvert : on n'enregistre qu'au clic. */
const draft = ref<Program | null>(null)
const armed = ref(false)

function open(p: Program) {
  if (openId.value === p.id) return close()
  openId.value = p.id
  draft.value = JSON.parse(JSON.stringify(p))
  armed.value = false
}
function close() {
  openId.value = null
  draft.value = null
}
function create() {
  const p: Program = { id: newId(), name: 'Nouveau programme', rounds: 1, transition: 15, items: [{ exercise: '', sets: 3, reps: 10, rest: 30 }] }
  openId.value = p.id
  draft.value = p
}
function addItem() {
  draft.value?.items.push({ exercise: '', sets: 3, reps: 10, rest: 30 })
}
function setMode(it: PpgItem, mode: 'reps' | 'time') {
  if (mode === 'time') { it.duration = it.duration ?? 30; delete it.reps }
  else { it.reps = it.reps ?? 10; delete it.duration }
}
/** Les durées se tapent « 45 », « 1'30 » ; un nombre seul vaut des secondes. */
const secs = (v: string) => {
  const n = parseDuration(v, 's')
  return Number.isNaN(n) ? undefined : n
}
function saveDraft() {
  const d = draft.value
  if (!d) return
  d.items = d.items.filter((i) => i.exercise.trim())
  if (!d.name.trim() || !d.items.length) return
  store.saveProgram(d)
  close()
}
function remove() {
  if (!draft.value) return
  if (!armed.value) { armed.value = true; return }
  store.deleteProgram(draft.value.id)
  close()
}
const isNew = computed(() => !!draft.value && !data.programs.some((p) => p.id === draft.value!.id))

const journal = computed(() => data.sessions.filter((s) => s.sport === 'ppg').sort(byDateDesc).slice(0, 12))
/** Exercices déjà utilisés, proposés à la saisie. */
const known = computed(() => [...new Set(data.programs.flatMap((p) => p.items.map((i) => i.exercise)))].sort())
</script>

<template>
  <section class="view">
    <h3>Programmes types</h3>
    <ul class="list progs">
      <li v-for="p in [...data.programs, ...(isNew && draft ? [draft] : [])]" :key="p.id" class="card prog">
        <button type="button" class="phead" :aria-expanded="openId === p.id" @click="isNew && draft?.id === p.id ? close() : open(p)">
          <span class="lab">
            <b>{{ p.name }}</b>
            <small>{{ p.items.length }} exercice{{ p.items.length > 1 ? 's' : '' }}{{ p.rounds > 1 ? ` · ${p.rounds} tours` : '' }} · ~{{ fmtDuration(estimateSeconds(p)) }}</small>
          </span>
          <ChevronDown :size="18" :style="{ transform: openId === p.id ? 'rotate(180deg)' : '' }" />
        </button>
        <RouterLink v-if="openId !== p.id" :to="`/minuteur/${p.id}`" class="btn primary go-timer"><Play :size="15" /> Lancer</RouterLink>

        <form v-if="openId === p.id && draft" class="edit" @submit.prevent="saveDraft">
          <label class="f full">Nom<input v-model="draft.name" class="in" /></label>
          <label class="f">Tours<input v-model.number="draft.rounds" class="in" type="number" min="1" /></label>
          <label class="f">Transition (s)<input :value="draft.transition" class="in" inputmode="numeric" @change="draft.transition = secs(($event.target as HTMLInputElement).value) ?? 0" /></label>

          <div v-for="(it, i) in draft.items" :key="i" class="item full">
            <div class="ihead">
              <input v-model="it.exercise" class="in ex" list="exos" placeholder="Exercice" />
              <button type="button" class="del" :aria-label="`Retirer ${it.exercise || 'cet exercice'}`" @click="draft.items.splice(i, 1)"><X :size="16" /></button>
            </div>
            <div class="igrid">
              <label class="f">Séries<input v-model.number="it.sets" class="in" type="number" min="1" /></label>
              <div class="f">
                <div class="seg mini" role="group" aria-label="Compté en">
                  <button type="button" :aria-pressed="it.duration === undefined" @click="setMode(it, 'reps')">Rép.</button>
                  <button type="button" :aria-pressed="it.duration !== undefined" @click="setMode(it, 'time')">Temps</button>
                </div>
                <input v-if="it.duration === undefined" v-model.number="it.reps" class="in" type="number" min="1" aria-label="Répétitions" />
                <input v-else :value="fmtClock(it.duration)" class="in" aria-label="Durée d'effort" @change="it.duration = secs(($event.target as HTMLInputElement).value) ?? it.duration" />
              </div>
              <label class="f">Récup<input :value="it.rest ? fmtClock(it.rest) : ''" class="in" placeholder="–" @change="it.rest = secs(($event.target as HTMLInputElement).value)" /></label>
              <label class="f">Charge kg<input v-model.number="it.load" class="in" type="number" min="0" placeholder="–" /></label>
            </div>
          </div>
          <datalist id="exos"><option v-for="e in known" :key="e" :value="e" /></datalist>
          <button type="button" class="add-btn full" @click="addItem"><Plus :size="15" /> Exercice</button>
          <div class="btns full">
            <button type="submit" class="btn primary">Enregistrer</button>
            <button type="button" class="btn" @click="close">Annuler</button>
            <button v-if="!isNew" type="button" class="btn danger" :class="{ armed }" @click="remove"><Trash2 :size="15" /> {{ armed ? 'Confirmer' : 'Supprimer' }}</button>
          </div>
        </form>
      </li>
    </ul>
    <button v-if="!isNew" type="button" class="add-btn" @click="create"><Plus :size="15" /> Nouveau programme</button>

    <h3>Dernières séances</h3>
    <p v-if="!journal.length" class="empty">Aucune séance de PPG enregistrée.</p>
    <ul v-else class="list card tight">
      <li v-for="s in journal" :key="s.id"><SessionRow :s="s" /></li>
    </ul>
  </section>
</template>

<style scoped>
.progs { gap: 10px }
.prog { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 12px }
.phead { flex: 1; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; text-align: left; cursor: pointer; padding: 0; min-width: 0 }
.phead .lab { flex: 1; display: flex; flex-direction: column; min-width: 0 }
.phead small { color: var(--muted); font-size: 12.5px }
.go-timer { padding: 6px 12px }
.edit { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 10px; border-top: 1px solid var(--line) }
.full { grid-column: 1 / -1 }
.f { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--muted); min-width: 0 }
.in { border: 1px solid var(--line); background: var(--bg); border-radius: 8px; padding: 8px 9px; font-size: 15px; font-weight: 400; color: var(--ink); width: 100%; min-width: 0 }
.item { background: var(--bg); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 8px }
.item .in { background: var(--surface) }
.ihead { display: flex; gap: 6px }
.ex { font-weight: 600 }
.del { border: 0; background: transparent; color: var(--muted); cursor: pointer; display: grid; place-items: center }
.igrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; align-items: end }
.seg.mini { padding: 2px }
.seg.mini button { padding: 2px 6px; font-size: 11px }
.add-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px }
</style>
