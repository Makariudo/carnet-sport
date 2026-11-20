<script setup lang="ts">
/**
 * Les séances marquées comme jalons, regroupées par séance comparable (10x1000, 20x30/30, 10 km…).
 * On en coche jusqu'à 4 dans un groupe pour les comparer côte à côte.
 */
import { computed, ref, watch } from 'vue'
import { Star } from 'lucide-vue-next'
import { groupFavorites, metrics, type Metrics } from '../domain/compare'
import { formatBlock } from '../domain/blocks'
import { data } from '../stores/sport'
import { fmtClock, fmtPace } from '../lib/time'
import { fullDate, shortDate } from '../lib/dates'
import SportIcon from '../components/SportIcon.vue'
import SplitsChart from '../components/SplitsChart.vue'

const COLORS = ['var(--acc)', 'var(--sport-velo)', 'var(--sport-ppg)', 'var(--sport-home-trainer)']
const MAX = 4

const groups = computed(() => groupFavorites(data.sessions))
const groupKey = ref<string | null>(null)
const picked = ref<string[]>([])

const group = computed(() => groups.value.find((g) => g.key === groupKey.value) ?? groups.value[0] ?? null)

// Par défaut : les deux jalons les plus récents du groupe.
watch(group, (g) => (picked.value = g ? g.sessions.slice(0, 2).map((s) => s.id) : []), { immediate: true })

function toggle(id: string) {
  if (picked.value.includes(id)) picked.value = picked.value.filter((x) => x !== id)
  else if (picked.value.length < MAX) picked.value = [...picked.value, id]
}

/** Séances comparées, de la plus ancienne à la plus récente. */
const compared = computed(() =>
  (group.value?.sessions ?? [])
    .filter((s) => picked.value.includes(s.id))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s, i) => ({ s, m: metrics(s), color: COLORS[i] })),
)
const structured = computed(() => compared.value.some((c) => c.m.avgRep !== undefined))
const series = computed(() =>
  compared.value.filter((c) => c.m.splits?.length).map((c) => ({ label: `${shortDate(c.s.date)} · ${c.m.splits!.length} rép.`, color: c.color, values: c.m.splits! })),
)

/** Nombre de répétitions chronométrées commun à toutes les séances comparées (8 pour un 8×1000 face à un 10×1000). */
const withSplits = computed(() => compared.value.filter((c) => c.m.splits?.length))
const lens = computed(() => withSplits.value.map((c) => c.m.splits!.length))
const common = computed(() => (lens.value.length >= 2 ? Math.min(...lens.value) : 0))
const unequal = computed(() => common.value > 0 && lens.value.some((l) => l !== common.value))
const mean = (v: number[]) => v.reduce((a, x) => a + x, 0) / v.length

/** Tableau répétition par répétition : une ligne par rép., la plus rapide en vert. */
const repRows = computed(() => {
  const max = Math.max(0, ...lens.value)
  return Array.from({ length: max }, (_, i) => {
    const vals = compared.value.map((c) => c.m.splits?.[i])
    const shown = vals.filter((v): v is number => v !== undefined).map(Math.round)
    const best = shown.length >= 2 && !shown.every((v) => v === shown[0]) ? Math.min(...shown) : undefined
    return { n: i + 1, vals, best }
  })
})
/** Meilleure valeur d'une ligne du tableau (la plus petite : temps ou allure). */
function best(get: (m: (typeof compared.value)[number]['m']) => number | undefined) {
  // Arrondi à la seconde affichée : deux « 3'05 » sont à égalité, et une égalité générale ne met rien en avant.
  const vals = compared.value.map((c) => get(c.m)).filter((v): v is number => v !== undefined).map(Math.round)
  if (vals.length < 2 || vals.every((v) => v === vals[0])) return undefined
  return Math.min(...vals)
}
const rows = computed(() => {
  const r: { label: string; get: (m: (typeof compared.value)[number]['m']) => number | undefined; fmt: (v: number) => string }[] = structured.value
    ? [
        { label: 'Répétition moyenne', get: (m) => m.avgRep, fmt: fmtClock },
        // 8 face à 10 répétitions : la moyenne des 8 premières compare à effort égal.
        ...(unequal.value
          ? [{ label: `Moyenne des ${common.value} premières`, get: (m: Metrics) => (m.splits ? mean(m.splits.slice(0, common.value)) : undefined), fmt: fmtClock }]
          : []),
        { label: 'Allure moyenne', get: (m) => m.pace, fmt: fmtPace },
        { label: 'Meilleure répétition', get: (m) => m.best, fmt: fmtClock },
        { label: 'Plus lente', get: (m) => m.worst, fmt: fmtClock },
        { label: 'Écart', get: (m) => m.spread, fmt: (v) => `${Math.round(v)}"` },
      ]
    : [{ label: 'Allure', get: (m) => m.sessionPace, fmt: fmtPace }]
  return r.map((row) => ({ ...row, best: best(row.get) }))
})
</script>

<template>
  <section class="view">
    <div v-if="!groups.length" class="card">
      <p class="empty">
        Aucun jalon pour l'instant. Au moment d'enregistrer une séance marquante (un 10x1000 plus rapide, une course…),
        touche <b><Star :size="13" class="star" /> Marquer comme jalon</b> : elle apparaîtra ici pour la comparer aux suivantes.
      </p>
    </div>

    <template v-else>
      <div class="chips" role="group" aria-label="Séances comparables">
        <button v-for="g in groups" :key="g.key" type="button" class="chip" :aria-pressed="group?.key === g.key" @click="groupKey = g.key">
          {{ g.label }} <small>{{ g.sessions.length }}</small>
        </button>
      </div>

      <ul v-if="group" class="list card tight">
        <li v-for="s in group.sessions" :key="s.id">
          <div class="row pick">
            <input :id="`p-${s.id}`" type="checkbox" :checked="picked.includes(s.id)" :disabled="!picked.includes(s.id) && picked.length >= MAX" @change="toggle(s.id)" />
            <label :for="`p-${s.id}`" class="lab">
              <b>{{ s.milestone || formatBlock(s.blocks?.[0] ?? { reps: 1 }) }}</b>
              <small>{{ fullDate(s.date) }}<template v-if="s.blocks?.length"> · {{ formatBlock(s.blocks[0]) }}</template><template v-if="s.rpe"> · ressenti {{ s.rpe }}/10</template></small>
            </label>
            <RouterLink :to="`/seance/${s.id}`" class="open" :aria-label="`Ouvrir la séance du ${fullDate(s.date)}`"><SportIcon :sport="s.sport" size="sm" /></RouterLink>
          </div>
        </li>
      </ul>

      <template v-if="compared.length >= 2">
        <h3>Comparaison</h3>
        <div class="tbl-wrap">
          <table>
            <thead>
              <tr><th></th><th v-for="c in compared" :key="c.s.id" :style="{ color: c.color }">{{ shortDate(c.s.date) }}</th></tr>
            </thead>
            <tbody>
              <tr v-if="structured">
                <td>Répétitions</td>
                <td v-for="c in compared" :key="c.s.id">{{ c.s.blocks?.[0]?.reps ?? '–' }}</td>
              </tr>
              <tr v-for="r in rows" :key="r.label">
                <td>{{ r.label }}</td>
                <td v-for="c in compared" :key="c.s.id" :class="{ best: r.best !== undefined && Math.round(r.get(c.m) ?? -1) === r.best }">
                  {{ r.get(c.m) !== undefined ? r.fmt(r.get(c.m)!) : '–' }}
                </td>
              </tr>
              <tr>
                <td>Ressenti</td>
                <td v-for="c in compared" :key="c.s.id">{{ c.s.rpe ? `${c.s.rpe}/10` : '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <SplitsChart v-if="series.length" :series="series" />
        <template v-if="repRows.length && withSplits.length >= 2">
          <h3>Répétition par répétition</h3>
          <div class="tbl-wrap">
            <table>
              <thead>
                <tr><th>Rép.</th><th v-for="c in compared" :key="c.s.id" :style="{ color: c.color }">{{ shortDate(c.s.date) }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in repRows" :key="r.n">
                  <td>{{ r.n }}</td>
                  <td v-for="(v, i) in r.vals" :key="i" :class="{ best: r.best !== undefined && v !== undefined && Math.round(v) === r.best }">
                    {{ v !== undefined ? fmtClock(v) : '–' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <p v-if="!series.length && structured" class="note">Saisis les chronos de chaque répétition dans la séance pour voir la courbe répétition par répétition.</p>
      </template>
      <p v-else class="note">Coche au moins deux séances pour les comparer.</p>
    </template>
  </section>
</template>

<style scoped>
.chip small { color: var(--muted); font-family: var(--f-num); font-size: 11.5px }
.chip[aria-pressed="true"] small { color: inherit }
.pick { cursor: default }
.pick input { width: 20px; height: 20px; accent-color: var(--acc); flex-shrink: 0 }
.pick label { cursor: pointer }
.open { display: inline-flex }
th { text-transform: none; letter-spacing: 0; font-size: 12.5px }
</style>
