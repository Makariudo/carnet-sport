/** Regroupement et comparaison des jalons (séances favorites). */
import type { Block, Session } from './types'
import { avgRepTime, blockPace, blockSignature } from './blocks'
import { SPORT_LABEL, sessionDistance } from './sessions'
import { fmtClock, fmtDistance } from '../lib/time'

/** Forme d'un bloc sans le nombre de répétitions : « 1000 », « 30/30 », « 3'00 ». */
const blockShape = (b: Block) => blockSignature(b).replace(/^\d+x/, '')

/**
 * Forme commune des séances comparables : mêmes blocs (distance ou durée de répétition), quel que soit
 * le nombre de répétitions (un 8×1000 se compare à un 10×1000) ; sans blocs, même sport, type et
 * distance arrondie. La récupération est vérifiée à part, avec une tolérance.
 */
export function compareKey(s: Session): string {
  const sig = (s.blocks ?? []).map(blockShape).join(' + ')
  if (sig) return `${s.sport}|${sig}`
  const d = sessionDistance(s)
  return `${s.sport}|${s.kind ?? ''}|${d ? Math.round(d / 500) * 500 : ''}`
}

/**
 * Écart de récupération (s) toléré entre deux séances pour les comparer : 20 s, ou 25 % de la plus
 * longue si c'est plus (3'00 et 3'40 vont ensemble ; 50" et 1'10 aussi ; 50" et 1'30 non).
 */
export const recoveryTolerance = (a: number, b: number) => Math.max(20, 0.25 * Math.max(a, b))

/** Récupération d'un bloc : en secondes, en mètres (trottinée) ou non saisie. */
const recoveryOf = (b: Block) =>
  b.recovery ? { unit: 's', v: b.recovery } : b.recoveryDistance ? { unit: 'm', v: b.recoveryDistance } : { unit: '', v: 0 }

/**
 * Récupérations compatibles bloc à bloc : proches en temps (voir recoveryTolerance), identiques en
 * distance, absentes des deux côtés sinon. r1'30 et r1'40 : oui ; r50" et r1'30 : non.
 */
export function sameRecoveries(a: Session, b: Session): boolean {
  const ra = (a.blocks ?? []).map(recoveryOf)
  const rb = (b.blocks ?? []).map(recoveryOf)
  if (ra.length !== rb.length) return false
  return ra.every((r, i) => {
    const o = rb[i]
    if (r.unit !== o.unit) return false
    return r.unit === 's' ? Math.abs(r.v - o.v) <= recoveryTolerance(r.v, o.v) : r.v === o.v
  })
}

/** Même séance, à comparer : même forme et récupérations compatibles. */
export const sameWorkout = (a: Session, b: Session) => compareKey(a) === compareKey(b) && sameRecoveries(a, b)

/**
 * « 8 × 1000 m · r 1'30 », ou sans le nombre de répétitions « 1000 m · r 1'30 » (titre d'un groupe).
 * Les 30/30 portent déjà leur récup dans la forme.
 */
function blockLabel(b: Block, withReps = true): string {
  const effort = b.distance ? (b.distance <= 1000 ? `${b.distance} m` : fmtDistance(b.distance)) : blockShape(b)
  const sig = withReps && b.reps > 1 ? `${b.reps} × ${effort}` : effort
  if (effort.includes('/')) return sig
  const r = recoveryOf(b)
  if (r.unit === 's') return `${sig} · r ${fmtClock(r.v)}`
  if (r.unit === 'm') return `${sig} · r ${fmtDistance(r.v)}`
  return sig
}

/** Libellé des blocs d'une séance, récup comprise ; '' sans blocs. */
export const blocksLabel = (s: Session) => (s.blocks ?? []).map((b) => blockLabel(b)).join(' + ')

export function groupLabel(s: Session): string {
  const blocks = (s.blocks ?? []).map((b) => blockLabel(b, false)).join(' + ')
  if (blocks) return blocks
  const d = sessionDistance(s)
  return [SPORT_LABEL[s.sport], s.kind, d ? fmtDistance(Math.round(d / 500) * 500) : null].filter(Boolean).join(' · ')
}

export interface Group { key: string; label: string; sessions: Session[] }

/**
 * Jalons regroupés par séance comparable. Chaque groupe part de son jalon le plus récent :
 * un jalon rejoint le groupe dont ce jalon de référence a la même forme et une récup proche.
 */
export function groupFavorites(sessions: Session[]): Group[] {
  const groups: (Group & { ref: Session })[] = []
  const favs = sessions.filter((s) => s.favorite).sort((a, b) => (a.date < b.date ? 1 : -1))
  for (const s of favs) {
    const g = groups.find((x) => sameWorkout(x.ref, s))
    if (g) g.sessions.push(s)
    else {
      const rec = (s.blocks ?? []).map((b) => { const r = recoveryOf(b); return r.unit + r.v }).join(',')
      groups.push({ key: `${compareKey(s)}|${rec}`, label: groupLabel(s), sessions: [s], ref: s })
    }
  }
  // Les groupes les plus fournis puis les plus récents d'abord.
  return groups
    .map(({ key, label, sessions }) => ({ key, label, sessions }))
    .sort((a, b) => b.sessions.length - a.sessions.length || (a.sessions[0].date < b.sessions[0].date ? 1 : -1))
}

export interface Metrics {
  /** Temps moyen d'une répétition du premier bloc (s). */
  avgRep?: number
  /** Allure moyenne du premier bloc (s/km). */
  pace?: number
  best?: number
  worst?: number
  /** Écart entre la répétition la plus lente et la plus rapide (s). */
  spread?: number
  /** Chronos de chaque répétition du premier bloc. */
  splits?: number[]
  /** Allure de la séance entière pour une séance sans blocs (s/km). */
  sessionPace?: number
}

export function metrics(s: Session): Metrics {
  const b = s.blocks?.[0]
  if (b) {
    const splits = b.splits?.length ? b.splits : undefined
    return {
      avgRep: avgRepTime(b),
      pace: blockPace(b),
      best: splits ? Math.min(...splits) : undefined,
      worst: splits ? Math.max(...splits) : undefined,
      spread: splits ? Math.max(...splits) - Math.min(...splits) : undefined,
      splits,
    }
  }
  const d = sessionDistance(s)
  return { sessionPace: d && s.duration ? (s.duration / d) * 1000 : undefined }
}
