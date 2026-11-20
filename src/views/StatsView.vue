<script setup lang="ts">
/** Volume hebdomadaire et mensuel, par sport. */
import { computed, ref, watch } from 'vue'
import { matches, monthlyBuckets, totalsSince, weeklyBuckets, type Bucket, type StatFilter } from '../domain/sessions'
import MultiLineChart from '../components/MultiLineChart.vue'
import type { Series } from '../lib/chart'
import { data } from '../stores/sport'
import { fmtDuration, fmtKm } from '../lib/time'
import { monthLabel, shortDate, todayISO, weekStart } from '../lib/dates'
import LineChart from '../components/LineChart.vue'

const ALL_FILTERS: { id: StatFilter; label: string }[] = [
  { id: 'course', label: 'Course' },
  { id: 'velo', label: 'Vélo' },
  { id: 'natation', label: 'Natation' },
  { id: 'tout', label: 'Tout' },
]
/** Sports facultatifs : leur onglet n'apparaît qu'une fois une séance saisie. */
const OPTIONAL: StatFilter[] = ['natation']
const filters = computed(() =>
  ALL_FILTERS.filter((f) => !OPTIONAL.includes(f.id) || data.sessions.some((s) => matches(s, f.id))),
)
const filter = ref<StatFilter>('course')
const period = ref<'semaine' | 'mois'>('semaine')
const selected = ref<number | null>(null)
watch([filter, period], () => (selected.value = null))

const today = todayISO()
const buckets = computed(() =>
  period.value === 'semaine' ? weeklyBuckets(data.sessions, filter.value, 12) : monthlyBuckets(data.sessions, filter.value, 12),
)
const km = computed(() => buckets.value.map((b) => Math.round(b.distance / 100) / 10))
const sel = computed(() => buckets.value[selected.value ?? buckets.value.length - 1])
const selTitle = computed(() =>
  period.value === 'semaine'
    ? sel.value.key === weekStart(today) ? 'Cette semaine' : `Semaine du ${shortDate(sel.value.key)}`
    : monthLabel(sel.value.key),
)
const avg = computed(() => km.value.reduce((a, v) => a + v, 0) / km.value.length)

const week = computed(() => totalsSince(data.sessions, filter.value, weekStart(today)))
const month = computed(() => totalsSince(data.sessions, filter.value, today.slice(0, 7) + '-01'))
const year = computed(() => totalsSince(data.sessions, filter.value, today.slice(0, 4) + '-01-01'))

/* « Tout » : une courbe de km par sport, et le volume horaire de PPG sur l'axe de droite. */
const PER_SPORT: { id: StatFilter; label: string; color: string; hours?: boolean }[] = [
  { id: 'course', label: 'Course', color: 'var(--sport-course)' },
  { id: 'velo', label: 'Vélo', color: 'var(--sport-velo)' },
  { id: 'natation', label: 'Natation', color: 'var(--sport-natation)' },
  { id: 'ppg', label: 'PPG', color: 'var(--sport-ppg)', hours: true },
]
// Un sport sans aucune séance sur la période affichée n'a ni courbe, ni colonne, ni légende.
const perSport = computed(() =>
  PER_SPORT.map((p) => ({
    ...p,
    buckets: period.value === 'semaine' ? weeklyBuckets(data.sessions, p.id, 12) : monthlyBuckets(data.sessions, p.id, 12),
  })).filter((p) => p.buckets.some((b) => b.count > 0)),
)
const series = computed<Series[]>(() =>
  perSport.value.map((p) => ({
    label: p.label,
    color: p.color,
    axis: p.hours ? 'right' : 'left',
    values: p.buckets.map((b) => (p.hours ? Math.round(b.duration / 360) / 10 : Math.round(b.distance / 100) / 10)),
  })),
)
const idx = computed(() => selected.value ?? buckets.value.length - 1)
const cell = (p: { hours?: boolean }, b: Bucket) => (p.hours ? (b.duration ? fmtDuration(b.duration) : '–') : b.distance ? fmtKm(b.distance) : '–')
</script>

<template>
  <section class="view">
    <div class="seg wide" role="group" aria-label="Sport" :style="{ gridTemplateColumns: `repeat(${filters.length}, 1fr)` }">
      <button v-for="f in filters" :key="f.id" type="button" :aria-pressed="filter === f.id" @click="filter = f.id">{{ f.label }}</button>
    </div>

    <div class="kpis">
      <div class="kpi"><p class="eyebrow">Semaine</p><p class="v">{{ fmtKm(week.distance) }}<small>km</small></p><p class="s">{{ week.count }} séance{{ week.count > 1 ? 's' : '' }}</p></div>
      <div class="kpi"><p class="eyebrow">Mois</p><p class="v">{{ fmtKm(month.distance) }}<small>km</small></p><p class="s">{{ fmtDuration(month.duration) }}</p></div>
      <div class="kpi"><p class="eyebrow">Année</p><p class="v">{{ fmtKm(year.distance) }}<small>km</small></p><p class="s">{{ fmtDuration(year.duration) }}</p></div>
    </div>

    <div class="chart">
      <div class="head">
        <p class="eyebrow">Kilomètres par {{ period }}</p>
        <div class="seg small" role="group" aria-label="Période">
          <button type="button" :aria-pressed="period === 'semaine'" @click="period = 'semaine'">Hebdo</button>
          <button type="button" :aria-pressed="period === 'mois'" @click="period = 'mois'">Mensuel</button>
        </div>
      </div>
      <template v-if="filter === 'tout'">
        <p class="sel"><span>{{ selTitle }}</span></p>
        <p class="sel per">
          <span v-for="p in perSport" :key="p.id" :style="{ '--c': p.color }"><i></i>{{ p.label }} <b class="num">{{ cell(p, p.buckets[idx]) }}</b>{{ !p.hours && p.buckets[idx].distance ? ' km' : '' }}</span>
        </p>
        <MultiLineChart :series="series" :labels="buckets.map((b) => b.label)" unit="km" right-unit="h" :selected="selected"
          :description="`Kilomètres de course, vélo et natation et heures de PPG par ${period}, sur les 12 dernières périodes`"
          @select="selected = $event" />
        <div class="legend">
          <span v-for="p in perSport" :key="p.id" :style="{ '--c': p.color }"><i :class="{ d: p.hours }"></i>{{ p.label }}{{ p.hours ? ' (h, axe de droite)' : ' (km)' }}</span>
        </div>
      </template>
      <template v-else>
        <p class="sel"><b class="num">{{ fmtKm(sel.distance) }} km</b> <span>{{ selTitle }} · {{ fmtDuration(sel.duration) }} · {{ sel.count }} séance{{ sel.count > 1 ? 's' : '' }}</span></p>
        <LineChart :values="km" :labels="buckets.map((b) => b.label)" unit="km" :selected="selected"
          :description="`Kilomètres par ${period} sur les 12 dernières périodes`" @select="selected = $event" />
        <div class="legend">
          <span><i></i>km par {{ period }}</span>
          <span><i class="o"></i>moyenne {{ avg.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) }} km</span>
        </div>
      </template>
    </div>

    <div v-if="filter === 'tout'" class="tbl-wrap">
      <table>
        <thead><tr><th>{{ period === 'semaine' ? 'Semaine du' : 'Mois' }}</th><th v-for="p in perSport" :key="p.id">{{ p.label }}{{ p.hours ? '' : ' km' }}</th></tr></thead>
        <tbody>
          <tr v-for="i in [...buckets.keys()].reverse()" :key="buckets[i].key">
            <td>{{ buckets[i].label }}</td><td v-for="p in perSport" :key="p.id">{{ cell(p, p.buckets[i]) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="tbl-wrap">
      <table>
        <thead><tr><th>{{ period === 'semaine' ? 'Semaine du' : 'Mois' }}</th><th>km</th><th>Durée</th><th>Séances</th></tr></thead>
        <tbody>
          <tr v-for="b in [...buckets].reverse()" :key="b.key">
            <td>{{ b.label }}</td><td>{{ fmtKm(b.distance) }}</td><td>{{ b.duration ? fmtDuration(b.duration) : '–' }}</td><td>{{ b.count }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.seg.wide { display: grid; grid-template-columns: repeat(4, 1fr) }
.seg.small button { padding: 5px 10px; font-size: 12.5px }
.head { margin-bottom: 4px }
.sel { margin: 2px 2px 4px; font-size: 13px; color: var(--muted) }
.sel b { font-size: 18px; color: var(--ink); font-weight: 500 }
.sel.per { display: flex; flex-wrap: wrap; gap: 2px 12px }
.sel.per b { font-size: 15px }
.sel.per i, .legend i { border-top-color: var(--c) }
.sel.per i { display: inline-block; width: 10px; height: 0; border-top: 2px solid var(--c); vertical-align: middle; margin-right: 4px }
.legend i.d { border-top-style: dashed }
</style>
