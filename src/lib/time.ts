/**
 * Lecture et écriture des durées, distances et allures comme on les tape sur un téléphone :
 * « 45 », « 1h05 », « 45:30 », « 3'05 », « 72'' », « 10,5 », « 1000m »…
 */

/** Unité d'un nombre tapé seul : « 45 » vaut 45 minutes pour une séance, 45 secondes pour une répétition. */
export type BareUnit = 'min' | 's'

function num(v: string): number {
  return parseFloat(v.replace(',', '.'))
}

/** Durée en secondes, ou NaN si illisible. */
export function parseDuration(input: string, bare: BareUnit = 'min'): number {
  const s = input.trim().toLowerCase().replace(/[’`´]/g, "'").replace(/''|"|″/g, 's').replace(/′/g, "'").replace(/\s+/g, '')
  if (!s) return NaN
  let m: RegExpMatchArray | null
  // 1:05:30 ou 45:30
  if ((m = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/))) return +m[1] * 3600 + +m[2] * 60 + +m[3]
  if ((m = s.match(/^(\d+):(\d{1,2})$/))) return +m[1] * 60 + +m[2]
  // 1h, 1h05, 1h05'30, 1h05m
  if ((m = s.match(/^(\d+)h(?:(\d{1,2})(?:'|m|min|mn)?(?:(\d{1,2})s?)?)?$/))) return +m[1] * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0)
  // 3'05, 3'05s, 10', 3m05, 3min05
  if ((m = s.match(/^(\d+)(?:'|m|min|mn)(?:(\d{1,2})s?)?$/))) return +m[1] * 60 + +(m[2] ?? 0)
  // 72s, 72 sec
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)(?:s|sec)$/))) return Math.round(num(m[1]))
  // nombre seul
  if ((m = s.match(/^\d+(?:[.,]\d+)?$/))) return Math.round(num(s) * (bare === 'min' ? 60 : 1))
  return NaN
}

/** Unité d'une distance tapée seule : « 10 » vaut 10 km pour une séance, 10 m dans un bloc. */
export type BareDistance = 'km' | 'm'

/** Distance en mètres, ou NaN si illisible. */
export function parseDistance(input: string, bare: BareDistance = 'km'): number {
  const s = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return NaN
  let m: RegExpMatchArray | null
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)km$/))) return Math.round(num(m[1]) * 1000)
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)m$/))) return Math.round(num(m[1]))
  if ((m = s.match(/^\d+(?:[.,]\d+)?$/))) return Math.round(num(s) * (bare === 'km' ? 1000 : 1))
  return NaN
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Chrono de répétition ou allure : 58", 3'05, 1h02'10. */
export function fmtClock(sec: number): string {
  const t = Math.round(sec)
  if (t < 60) return `${t}"`
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return h ? `${h}h${pad(m)}'${pad(s)}` : `${m}'${pad(s)}`
}

/** Durée de séance : 45', 1h05, 52'30. */
export function fmtDuration(sec: number): string {
  const t = Math.round(sec)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  if (h) return `${h}h${pad(m)}`
  return s ? `${m}'${pad(s)}` : `${m}'`
}

/** Distance lisible : 850 m, 10,5 km. */
export function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: m % 1000 === 0 ? 0 : 2 })} km`
}

/** Kilomètres avec une décimale, pour les stats. */
export const fmtKm = (m: number) => (m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })

/** Allure en secondes par km à partir d'une distance (m) et d'un temps (s). */
export const pacePerKm = (meters: number, seconds: number) => (seconds / meters) * 1000

export const fmtPace = (secPerKm: number) => `${fmtClock(secPerKm)}/km`

export const fmtSpeed = (meters: number, seconds: number) =>
  `${((meters / seconds) * 3.6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`

export const fmtSwimPace = (meters: number, seconds: number) => `${fmtClock((seconds / meters) * 100)}/100 m`
