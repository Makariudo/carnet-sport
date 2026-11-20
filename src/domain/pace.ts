/**
 * Calculateur d'allure : table des distances, allures à afficher, temps de passage,
 * estimation de la VMA depuis une course et intensité (pour colorer le tableau).
 * Une « allure » est toujours en secondes par km.
 */

export interface RaceDistance {
  /** Clé stable (utilisée dans les préférences). */
  key: string
  label: string
  meters: number
  /** Fourchette de %VMA soutenable sur cette distance. */
  minSoutien: number
  maxSoutien: number
  /** Points de passage proposés en mode « intermédiaires » (m). */
  splits: number[]
}

/** Multiples de `step` jusqu'à `to` inclus. */
const every = (step: number, to: number): number[] => {
  const out: number[] = []
  for (let m = step; m <= to; m += step) out.push(m)
  return out
}

export const DISTANCES: RaceDistance[] = [
  { key: '1000m', label: '1000 m', meters: 1000, minSoutien: 115, maxSoutien: 121, splits: every(100, 1000) },
  { key: '1500m', label: '1500 m', meters: 1500, minSoutien: 104, maxSoutien: 110, splits: every(100, 1500) },
  { key: '2000m', label: '2000 m', meters: 2000, minSoutien: 94, maxSoutien: 101, splits: every(200, 2000) },
  { key: '3000m', label: '3000 m', meters: 3000, minSoutien: 92, maxSoutien: 99, splits: every(200, 3000) },
  { key: '5000m', label: '5 km', meters: 5000, minSoutien: 89, maxSoutien: 96, splits: every(200, 5000) },
  { key: '10km', label: '10 km', meters: 10000, minSoutien: 84, maxSoutien: 91, splits: every(1000, 10000) },
  { key: '15km', label: '15 km', meters: 15000, minSoutien: 81, maxSoutien: 88, splits: every(1000, 15000) },
  { key: '20km', label: '20 km', meters: 20000, minSoutien: 79, maxSoutien: 86, splits: every(1000, 20000) },
  { key: 'semi', label: 'Semi', meters: 21097.5, minSoutien: 79, maxSoutien: 86, splits: [...every(1000, 21000), 21097] },
  { key: '30km', label: '30 km', meters: 30000, minSoutien: 76, maxSoutien: 83, splits: every(5000, 30000) },
  { key: 'marathon', label: 'Marathon', meters: 42195, minSoutien: 74, maxSoutien: 81, splits: [...every(5000, 40000), 42195] },
  { key: '50km', label: '50 km', meters: 50000, minSoutien: 73, maxSoutien: 80, splits: every(5000, 50000) },
  { key: '100km', label: '100 km', meters: 100000, minSoutien: 59, maxSoutien: 66, splits: every(10000, 100000) },
]

/** Courses de référence proposées pour estimer la VMA. */
export const REFERENCE_KEYS = ['5000m', '10km', 'semi']

/** Distances du mode « fractionnés » (m). */
export const FRACTION_METERS = [100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1600, 2000, 2500, 3000, 4000, 5000]

/** Pas proposés entre deux allures (s). */
export const STEPS = [1, 5, 10, 15, 20, 25, 30]

/** Bornes absolues des allures affichables (s/km). */
export const PACE_FASTEST = 2 * 60
export const PACE_SLOWEST = 9 * 60

export const findDistance = (key: string): RaceDistance | undefined => DISTANCES.find((d) => d.key === key)

/** Libellé d'un point de passage : 400 m, 5 km, 21,1 km. */
export function splitLabel(meters: number): string {
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`
}

/** Points de passage d'une distance, sans doublon. */
export const splitsOf = (d: RaceDistance): number[] => [...new Set(d.splits)]

/**
 * Allures à afficher, de la plus lente à la plus rapide, par pas de `step` s.
 * Les bornes sont ramenées entre 2'00 et 9'00 ; la plus rapide est toujours incluse.
 * Renvoie [] si la plage est incohérente.
 */
export function generatePaces(slowest: number, fastest: number, step: number): number[] {
  if (step <= 0 || slowest < fastest || slowest < PACE_FASTEST || fastest > PACE_SLOWEST) return []
  const start = Math.min(slowest, PACE_SLOWEST)
  const end = Math.max(fastest, PACE_FASTEST)
  const out: number[] = []
  for (let p = start; p >= end; p -= step) out.push(p)
  if (out[out.length - 1] !== end) out.push(end)
  return out
}

/** Temps (s) pour couvrir `meters` à l'allure `pace` (s/km) ; NaN si l'allure est invalide. */
export function timeAtPace(meters: number, pace: number): number {
  return pace > 0 ? (meters * pace) / 1000 : NaN
}

/** Temps de passage : 04:05, 1:02:10 ; « --:-- » si invalide. */
export function fmtRaceTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '--:--'
  const t = Math.round(totalSeconds)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}

/** Allure à 100 % de la VMA (s/km). */
export const vmaPace = (vma: number): number => (vma > 0 ? 3600 / vma : NaN)

/** %VMA correspondant à une allure ; NaN si la VMA ou l'allure est invalide. */
export function percentVma(pace: number, vma: number): number {
  if (!(pace > 0) || !(vma > 0)) return NaN
  return (vmaPace(vma) / pace) * 100
}

/**
 * VMA estimée (km/h) depuis une course : vitesse moyenne ÷ milieu de la fourchette de soutien.
 * NaN si le temps est invalide.
 */
export function estimateVma(d: RaceDistance, seconds: number): number {
  const ratio = (d.minSoutien + d.maxSoutien) / 2 / 100
  if (!(seconds > 0) || !(ratio > 0)) return NaN
  const v = d.meters / 1000 / (seconds / 3600)
  return Number.isFinite(v) ? v / ratio : NaN
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

/**
 * Intensité d'une allure, de 0 (facile) à 1 (dur), pour la couleur.
 * Avec une distance : seulement dans sa fourchette de %VMA (null en dehors), 1 = bord rapide.
 * Sans distance : dégradé continu de ~62 % à ~125 % de la VMA.
 * null si la VMA ou l'allure est invalide.
 */
export function paceIntensity(pace: number, vma: number, d?: RaceDistance): number | null {
  if (!(vma > 0) || !(pace > 0)) return null
  const v = vmaPace(vma)
  if (!d) return 1 - clamp01((pace / v - 0.75) / (1.6 - 0.75))
  const fast = v / (d.maxSoutien / 100)
  const slow = v / (d.minSoutien / 100)
  if (pace < fast || pace > slow) return null
  return 1 - (pace - fast) / (slow - fast)
}

/** Fond CSS d'une intensité (vert, orange, rouge selon le thème), ou '' sans couleur. */
export function intensityColor(i: number | null): string {
  if (i === null) return ''
  const base = i < 0.5
    ? `color-mix(in srgb, var(--warn) ${Math.round(i * 200)}%, var(--pos))`
    : `color-mix(in srgb, var(--neg) ${Math.round((i - 0.5) * 200)}%, var(--warn))`
  return `color-mix(in srgb, ${base} 32%, transparent)`
}
