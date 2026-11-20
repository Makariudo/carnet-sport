<script setup lang="ts">
/** Volume hebdomadaire et mensuel, par sport. */
import { computed, ref, watch } from 'vue'
import { monthlyBuckets, totalsSince, weeklyBuckets, type StatFilter } from '../domain/sessions'
import { data } from '../stores/sport'
import { fmtDuration, fmtKm } from '../lib/time'
import { monthLabel, shortDate, todayISO, weekStart } from '../lib/dates'
import LineChart from '../components/LineChart.vue'

const filters: { id: StatFilter; label: string }[] = [
  { id: 'course', label: 'Course' },
  { id: 'velo', label: 'Vélo' },
  { id: 'natation', label: 'Natation' },
  { id: 'tout', label: 'Tout' },
]
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
</script>

<template>
  <section class="view">
    <div class="seg wide" role="group" aria-label="Sport">
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
      <p class="sel"><b class="num">{{ fmtKm(sel.distance) }} km</b> <span>{{ selTitle }} · {{ fmtDuration(sel.duration) }} · {{ sel.count }} séance{{ sel.count > 1 ? 's' : '' }}</span></p>
      <LineChart :values="km" :labels="buckets.map((b) => b.label)" unit="km" :selected="selected"
        :description="`Kilomètres par ${period} sur les 12 dernières périodes`" @select="selected = $event" />
      <div class="legend">
        <span><i></i>km par {{ period }}</span>
        <span><i class="o"></i>moyenne {{ avg.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) }} km</span>
      </div>
    </div>

    <div class="tbl-wrap">
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
</style>
