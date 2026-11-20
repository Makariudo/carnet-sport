<script setup lang="ts">
/** Toutes les séances, par semaine, avec le total de la semaine. */
import { computed, ref } from 'vue'
import { SPORTS, type Session, type Sport } from '../domain/types'
import { SPORT_LABEL, byDateDesc, sessionDistance } from '../domain/sessions'
import { data } from '../stores/sport'
import { addDays, shortDate, todayISO, weekStart } from '../lib/dates'
import { fmtDuration, fmtKm } from '../lib/time'
import { SPORT_ICON, sportTone } from '../lib/sports'
import SessionRow from '../components/SessionRow.vue'

const filter = ref<Sport | null>(null)
const limit = ref(8)

const weeks = computed(() => {
  const groups = new Map<string, Session[]>()
  for (const s of [...data.sessions].sort(byDateDesc)) {
    if (filter.value && s.sport !== filter.value) continue
    const k = weekStart(s.date)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }
  return [...groups.entries()].map(([start, list]) => ({
    start,
    list,
    km: list.reduce((a, s) => a + (s.sport === 'ppg' ? 0 : sessionDistance(s)), 0),
    time: list.reduce((a, s) => a + (s.duration ?? 0), 0),
  }))
})

const thisWeek = weekStart(todayISO())
const weekTitle = (start: string) =>
  start === thisWeek ? 'Cette semaine' : start === addDays(thisWeek, -7) ? 'Semaine dernière' : `Semaine du ${shortDate(start)}`
</script>

<template>
  <section class="view">
    <div class="chips" role="group" aria-label="Filtrer par sport">
      <button type="button" class="chip" :aria-pressed="filter === null" @click="filter = null">Tout</button>
      <button v-for="s in SPORTS" :key="s" type="button" class="chip" :aria-pressed="filter === s" :style="{ '--tone': sportTone(s) }" @click="filter = filter === s ? null : s">
        <component :is="SPORT_ICON[s]" :size="14" />{{ SPORT_LABEL[s] }}
      </button>
    </div>

    <p v-if="!weeks.length" class="empty">Aucune séance pour l'instant. Commence par en saisir une depuis l'onglet Saisir.</p>

    <div v-for="w in weeks.slice(0, limit)" :key="w.start">
      <p class="group">
        <span>{{ weekTitle(w.start) }}</span>
        <span class="num">{{ w.km ? `${fmtKm(w.km)} km · ` : '' }}{{ fmtDuration(w.time) }}</span>
      </p>
      <ul class="list card tight">
        <li v-for="s in w.list" :key="s.id"><SessionRow :s="s" /></li>
      </ul>
    </div>
    <button v-if="weeks.length > limit" type="button" class="add-btn" @click="limit += 8">Semaines précédentes</button>
  </section>
</template>
