<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { data, sport } from '../stores/sport'
import { fmtClock } from '../lib/time'
import {
  DISTANCES, FRACTION_METERS, REFERENCE_KEYS, STEPS, estimateVma, findDistance, fmtRaceTime, generatePaces,
  intensityColor, paceIntensity, percentVma, splitLabel, splitsOf, timeAtPace, vmaPace, type RaceDistance,
} from '../domain/pace'

type Mode = 'official' | 'fraction' | 'intermediate'
interface Col { label: string; meters: number; zone?: RaceDistance }

const MODES: { value: Mode; label: string }[] = [
  { value: 'official', label: 'Officielles' },
  { value: 'fraction', label: 'Fractionnés' },
  { value: 'intermediate', label: 'Intermédiaires' },
]

/* Préférences mémorisées dans le navigateur (jamais bloquant). */
const PREFIX = 'mon-sport-calc-'
function load<T>(key: string, fallback: T, ok: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw !== null) {
      const v: unknown = JSON.parse(raw)
      if (ok(v)) return v as T
    }
  } catch { /* stockage indisponible : valeur par défaut */ }
  return fallback
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* ignoré */ }
}
const isInt = (min: number, max: number) => (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max

// Allures en secondes/km : « lente » = borne haute, « rapide » = borne basse.
const slowMin = ref(load('slow-min', 7, isInt(2, 9)))
const slowSec = ref(load('slow-sec', 0, isInt(0, 59)))
const fastMin = ref(load('fast-min', 3, isInt(2, 9)))
const fastSec = ref(load('fast-sec', 0, isInt(0, 59)))
const step = ref(load('step', 15, (v) => STEPS.includes(v as number)))
const mode = ref<Mode>(load('mode', 'official', (v) => MODES.some((m) => m.value === v)))
const interKey = ref(load('inter', '10km', (v) => typeof v === 'string' && !!findDistance(v)))
const colored = ref(load('color', false, (v) => typeof v === 'boolean'))

watch([slowMin, slowSec, fastMin, fastSec, step, mode, interKey, colored], () => {
  save('slow-min', slowMin.value); save('slow-sec', slowSec.value)
  save('fast-min', fastMin.value); save('fast-sec', fastSec.value)
  save('step', step.value); save('mode', mode.value); save('inter', interKey.value); save('color', colored.value)
})

const minuteOptions = [2, 3, 4, 5, 6, 7, 8, 9]
const secondOptions = Array.from({ length: 60 }, (_, i) => i)
const pad = (n: number) => String(n).padStart(2, '0')

/* VMA : saisie libre, enregistrée dans le profil dès qu'elle est valide. */
const vmaText = ref(String(data.settings.vma ?? ''))
watch(() => data.settings.vma, (v) => {
  if (parseVma(vmaText.value) !== v) vmaText.value = v ? String(v) : ''
})
function parseVma(s: string): number {
  return parseFloat(s.replace(',', '.'))
}
function onVma() {
  const v = parseVma(vmaText.value)
  if (v > 0 && v < 40) sport.setVma(v)
}
const vma = computed(() => {
  const v = data.settings.vma
  return v > 0 ? v : NaN
})
const vmaPaceLabel = computed(() => (vma.value > 0 ? `${fmtClock(vmaPace(vma.value))}/km` : ''))

/* Estimation de la VMA depuis une course. */
const open = ref(false)
const refKey = ref(REFERENCE_KEYS[0])
const refH = ref('0')
const refM = ref('25')
const refS = ref('0')
const refError = ref('')
const refResult = ref<number | null>(null)
const refChoices = REFERENCE_KEYS.map((k) => findDistance(k)!)
const toInt = (s: string) => Math.max(0, parseInt(s, 10) || 0)

function estimate() {
  const secs = toInt(refH.value) * 3600 + toInt(refM.value) * 60 + toInt(refS.value)
  const d = findDistance(refKey.value)
  const v = d ? estimateVma(d, secs) : NaN
  if (!(v > 0)) {
    refError.value = 'Renseigne un temps de course valide.'
    refResult.value = null
    return
  }
  refError.value = ''
  const rounded = Math.round(v * 100) / 100
  refResult.value = rounded
  vmaText.value = String(rounded)
  sport.setVma(rounded)
  selected.value = null
}

/* Table. */
const paces = computed(() => generatePaces(slowMin.value * 60 + slowSec.value, fastMin.value * 60 + fastSec.value, step.value))
const interDistance = computed(() => findDistance(interKey.value))

const cols = computed<Col[]>(() => {
  if (mode.value === 'fraction') return FRACTION_METERS.map((m) => ({ label: `${m} m`, meters: m }))
  if (mode.value === 'intermediate') {
    const d = interDistance.value
    return d ? splitsOf(d).map((m) => ({ label: splitLabel(m), meters: m, zone: d })) : []
  }
  return DISTANCES.map((d) => ({ label: d.label, meters: d.meters, zone: d }))
})

// Colonne mise en avant : 0 = allure, 1.. = distances.
const selected = ref<number | null>(null)
const toggle = (i: number) => { selected.value = selected.value === i ? null : i }
watch([mode, interKey], () => { selected.value = null })

/** Fond d'une cellule : zone de la distance en mode officiel/intermédiaire, sinon dégradé continu pour les fractionnés. */
function bg(pace: number, col: Col): string {
  if (!colored.value) return ''
  if (mode.value === 'fraction') return ''
  return intensityColor(paceIntensity(pace, vma.value, col.zone))
}

/* Lignes surlignées en jaune (clic ou Entrée sur l'allure) ; plusieurs possibles. */
const marked = ref<number[]>([])
const isMarked = (pace: number) => marked.value.includes(pace)
function toggleRow(pace: number) {
  marked.value = isMarked(pace) ? marked.value.filter((p) => p !== pace) : [...marked.value, pace]
}

/** Fond d'une cellule : le jaune du surlignage l'emporte sur la couleur de zone. */
const cellBg = (pace: number, col: Col) => (isMarked(pace) ? '' : bg(pace, col))

/* Impression : seul le bloc .calc-print est imprimé, en paysage, avec la configuration en tête. */
const modeLabel = computed(() => {
  const m = MODES.find((x) => x.value === mode.value)!.label
  return mode.value === 'intermediate' && interDistance.value ? `${m} : ${interDistance.value.label}` : m
})
const printSummary = computed(() => [
  vma.value > 0 ? `VMA ${vma.value.toLocaleString('fr-FR')} km/h (${vmaPaceLabel.value})` : '',
  `Allures ${slowMin.value}'${pad(slowSec.value)} à ${fastMin.value}'${pad(fastSec.value)}, pas de ${step.value} s`,
  `Distances : ${modeLabel.value}`,
].filter(Boolean).join(' · '))

function printTable() {
  const root = document.documentElement
  const page = document.createElement('style')
  page.textContent = '@page { size: landscape; margin: 10mm }'
  document.head.appendChild(page)
  root.classList.add('printing-calc')
  const cleanup = () => {
    root.classList.remove('printing-calc')
    page.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

const pctLabel = (pace: number) => {
  const p = percentVma(pace, vma.value)
  return Number.isFinite(p) ? `${Math.round(p)} %` : ''
}
</script>

<template>
  <section class="view">
    <h2>Calculateur d'allure</h2>

    <div class="card form">
      <div class="field">
        <label for="calc-vma">VMA (km/h)</label>
        <input id="calc-vma" class="txt" type="text" inputmode="decimal" placeholder="ex : 15" v-model="vmaText" @input="onVma" />
        <p v-if="vmaPaceLabel" class="note">Allure à 100 % de la VMA : <span class="num">{{ vmaPaceLabel }}</span></p>
      </div>

      <button type="button" class="more" :aria-expanded="open" @click="open = !open">
        {{ open ? 'Masquer l\'estimation' : 'Estimer depuis une course' }}
      </button>

      <div v-if="open" class="est">
        <div class="field">
          <span class="lbl">Course de référence</span>
          <div class="chips">
            <button v-for="d in refChoices" :key="d.key" type="button" class="chip" :aria-pressed="refKey === d.key" @click="refKey = d.key">
              {{ d.label }}
            </button>
          </div>
        </div>
        <div class="field">
          <span class="lbl">Temps réalisé</span>
          <div class="hms">
            <label><input class="txt" type="number" inputmode="numeric" min="0" v-model="refH" aria-label="Heures" /><span>h</span></label>
            <label><input class="txt" type="number" inputmode="numeric" min="0" v-model="refM" aria-label="Minutes" /><span>min</span></label>
            <label><input class="txt" type="number" inputmode="numeric" min="0" v-model="refS" aria-label="Secondes" /><span>s</span></label>
          </div>
        </div>
        <div class="btns"><button type="button" class="btn primary" @click="estimate">Calculer la VMA</button></div>
        <p v-if="refError" class="err">{{ refError }}</p>
        <p v-else-if="refResult !== null" class="note">VMA estimée : <b class="num">{{ refResult.toLocaleString('fr-FR') }} km/h</b>, appliquée ci-dessus.</p>
      </div>
    </div>

    <div class="card form">
      <div class="range">
        <div class="field">
          <span class="lbl">Allure la plus lente</span>
          <div class="pair">
            <select class="txt" v-model.number="slowMin" aria-label="Minutes, allure la plus lente">
              <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}</option>
            </select>
            <span>'</span>
            <select class="txt" v-model.number="slowSec" aria-label="Secondes, allure la plus lente">
              <option v-for="s in secondOptions" :key="s" :value="s">{{ pad(s) }}</option>
            </select>
          </div>
        </div>
        <div class="field">
          <span class="lbl">Allure la plus rapide</span>
          <div class="pair">
            <select class="txt" v-model.number="fastMin" aria-label="Minutes, allure la plus rapide">
              <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}</option>
            </select>
            <span>'</span>
            <select class="txt" v-model.number="fastSec" aria-label="Secondes, allure la plus rapide">
              <option v-for="s in secondOptions" :key="s" :value="s">{{ pad(s) }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <span class="lbl">Pas entre deux allures</span>
        <div class="chips">
          <button v-for="s in STEPS" :key="s" type="button" class="chip" :aria-pressed="step === s" @click="step = s">{{ s }} s</button>
        </div>
      </div>

      <div class="field">
        <span class="lbl">Distances affichées</span>
        <div class="seg" role="group" aria-label="Mode d'affichage">
          <button v-for="m in MODES" :key="m.value" type="button" :aria-pressed="mode === m.value" @click="mode = m.value">{{ m.label }}</button>
        </div>
      </div>

      <div v-if="mode === 'intermediate'" class="field">
        <label for="calc-inter">Distance détaillée</label>
        <select id="calc-inter" class="txt" v-model="interKey">
          <option v-for="d in DISTANCES" :key="d.key" :value="d.key">{{ d.label }}</option>
        </select>
      </div>

    </div>

    <div v-if="paces.length" class="tools">
      <label class="opt">
        <input type="checkbox" v-model="colored" />
        Couleurs VMA
      </label>
      <span class="hint">Touche une ligne pour la surligner</span>
      <button type="button" class="print" @click="printTable">Imprimer</button>
    </div>
    <p v-if="paces.length && colored && !(vma > 0)" class="note small">Renseigne ta VMA pour colorer le tableau.</p>
    <p v-else-if="paces.length && colored && mode === 'fraction'" class="note small">Pas de couleur en fractionnés : une zone de %VMA n'a de sens que sur une distance de course.</p>
    <p v-else-if="paces.length && colored" class="note small">Vert : allure facile pour la distance, rouge : bord haut de la zone. Sans couleur : hors zone.</p>

    <div v-if="paces.length" class="calc-print">
      <div class="print-head">
        <b>Calculateur d'allure</b>
        <span>{{ printSummary }}</span>
      </div>
      <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th class="stick" :class="{ sel: selected === 0 }">
              <button type="button" class="hd" @click="toggle(0)">Allure</button>
            </th>
            <th v-for="(c, i) in cols" :key="c.label" :class="{ sel: selected === i + 1 }">
              <button type="button" class="hd" @click="toggle(i + 1)">{{ c.label }}</button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paces" :key="p" :class="{ hl: isMarked(p) }" @click="toggleRow(p)">
            <td class="stick" :class="{ sel: selected === 0 }">
              <button type="button" class="rowbtn" :aria-pressed="isMarked(p)" :aria-label="`Surligner l'allure ${fmtClock(p)}`">
                <b>{{ fmtClock(p) }}</b>
                <small v-if="pctLabel(p)">{{ pctLabel(p) }}</small>
              </button>
            </td>
            <td v-for="(c, i) in cols" :key="c.label" :class="{ sel: selected === i + 1 }" :style="{ background: cellBg(p, c) }">
              {{ fmtRaceTime(timeAtPace(c.meters, p)) }}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
    <p v-else class="empty">Plage d'allures invalide : l'allure la plus lente doit être au moins aussi lente que la plus rapide, entre 2'00 et 9'00.</p>
  </section>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 14px }
.est { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; border-top: 1px solid var(--line) }
.hms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px }
.hms label { display: flex; align-items: baseline; gap: 6px; min-width: 0 }
.hms span { color: var(--muted); font-size: 14px }
.range { display: grid; grid-template-columns: 1fr 1fr; gap: 12px }
.pair { display: flex; align-items: center; gap: 4px }
.pair span { color: var(--muted); font-family: var(--f-num) }
.pair .txt { padding: 9px 8px; font-size: 16px }
.seg { width: 100%; flex-shrink: 1 }
.seg button { flex: 1; padding: 7px 6px }

/* Tableau : première colonne figée, titres cliquables, colonne mise en avant. */
.hd { all: unset; cursor: pointer; text-transform: inherit; letter-spacing: inherit }
.hd:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px }
.stick { position: sticky; left: 0; z-index: 1; background: var(--surface); box-shadow: 1px 0 0 var(--line) }
td.stick { line-height: 1.15 }
td.stick b { font-weight: 600; display: block }
td.stick small { color: var(--muted); font-size: 11px }
.sel { box-shadow: inset 0 0 0 999px color-mix(in srgb, var(--acc) 14%, transparent) }
.stick.sel { box-shadow: inset 0 0 0 999px color-mix(in srgb, var(--acc) 14%, transparent), 1px 0 0 var(--line) }
th.sel .hd { color: var(--acc) }

/* Ligne surlignée : jaune opaque (la colonne figée doit masquer ce qui défile dessous). */
tbody tr { cursor: pointer }
.rowbtn { all: unset; display: block; cursor: pointer }
.rowbtn:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px }
tr.hl td, tr.hl td.stick { background: color-mix(in srgb, #FACC15 50%, var(--surface)) }
tr.hl td.stick small { color: inherit; opacity: .75 }

/* Outils discrets au-dessus du tableau. */
.tools { display: flex; align-items: center; gap: 12px; margin: 4px 2px 8px; font-size: 13px; color: var(--muted) }
.opt { display: inline-flex; align-items: center; gap: 6px; cursor: pointer }
.opt input { margin: 0; width: 14px; height: 14px; accent-color: var(--muted) }
.hint { flex: 1; text-align: center; font-size: 12px; opacity: .8 }
.print { all: unset; cursor: pointer; font-size: 13px; color: var(--muted); text-decoration: underline; text-underline-offset: 3px }
.print:focus-visible, .opt:focus-within { outline: 2px solid var(--acc); outline-offset: 2px; border-radius: 4px }
.small { font-size: 12px; margin: -4px 2px 8px }
.print-head { display: none }
@media (max-width: 420px) { .hint { display: none } .tools { justify-content: space-between } }
</style>

<!-- Impression : actif seulement pendant printTable() (classe posée sur <html>), donc sans effet sur les autres écrans. -->
<style>
@media print {
  html.printing-calc body * { visibility: hidden }
  html.printing-calc .calc-print, html.printing-calc .calc-print * { visibility: visible }
  html.printing-calc .calc-print {
    position: absolute; left: 0; top: 0; width: 100%;
    --surface: #fff; --ink: #1C1A17; --muted: #555; --line: #CCC; --acc: #D9480F;
    --pos: #17803D; --neg: #C2362B; --warn: #B45309;
    color: var(--ink); background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  html.printing-calc .calc-print .print-head { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; margin-bottom: 6px; font-size: 11px }
  html.printing-calc .calc-print .print-head b { font-size: 14px }
  html.printing-calc .calc-print .tbl-wrap { overflow: visible; border: 0; border-radius: 0 }
  html.printing-calc .calc-print table { font-size: 10px }
  html.printing-calc .calc-print th, html.printing-calc .calc-print td { padding: 3px 5px; border-bottom: 1px solid var(--line) }
  html.printing-calc .calc-print tr { break-inside: avoid }
  html.printing-calc .calc-print .stick { position: static; box-shadow: none }
}
</style>
