/**
 * Blocs structurés tapés sur une ligne : « 10x1000 en 3'05 r1'30 + 5x200 r200m ».
 *
 * Grammaire d'un bloc (séparés par « + », « ; » ou un retour à la ligne) :
 *   [N x] effort [en|@|à temps] [r|récup temps-ou-distance]
 *   - effort : une distance (« 1000 », « 1000m », « 2km ») ou une durée (« 10' », « 30'' », « 45s »),
 *     ou « 30/30 » : 30 s d'effort, 30 s de récup ;
 *   - temps après « en », « @ » ou « à » : le temps d'UNE répétition (« 10x400 en 72'' »),
 *     ou une allure s'il est suivi de « /km » (« 3x2000 @3'20/km ») ;
 *   - un nombre seul vaut des mètres pour l'effort, des secondes pour les temps.
 */
import type { Block, Session } from './types'
import { fmtClock, fmtDistance, parseDistance, parseDuration } from '../lib/time'

export interface ParsedBlocks {
  blocks: Block[]
  /** Morceaux non compris, à signaler sous le champ. */
  errors: string[]
}

const TIME_UNIT = /['"s]|min|mn|''|’/

function parseEffort(raw: string, b: Block): boolean {
  const s = raw.replace(/\s+/g, '')
  const rr = s.match(/^(\d+)(?:''|"|s)?\/(\d+)(?:''|"|s)?$/)
  if (rr) {
    b.duration = +rr[1]
    b.recovery = +rr[2]
    return true
  }
  if (TIME_UNIT.test(s) && !/k?m$/i.test(s)) {
    const d = parseDuration(s, 's')
    if (!(d > 0)) return false
    b.duration = d
    return true
  }
  const m = parseDistance(s, 'm')
  if (!(m > 0)) return false
  b.distance = m
  return true
}

function parseOne(text: string): Block | null {
  let s = text.trim().toLowerCase().replace(/[’`´]/g, "'").replace(/×|\*/g, 'x')
  if (!s) return null
  const b: Block = { reps: 1 }
  const reps = s.match(/^(\d+)\s*x\s*/)
  if (reps) {
    b.reps = +reps[1]
    s = s.slice(reps[0].length)
  }
  // Récup : « r1'30 », « récup 2' », « rec 200m ».
  const rec = s.match(/\s*(?:r[ée]cup(?:[ée]ration)?|rec|r)\s*:?\s*([\d'",.:]+\s*(?:km|m|s|min|mn|'')?)\s*$/)
  if (rec) {
    s = s.slice(0, rec.index)
    const v = rec[1].replace(/\s+/g, '')
    if (/k?m$/.test(v)) b.recoveryDistance = parseDistance(v, 'm')
    else b.recovery = parseDuration(v, 's')
    if (!((b.recovery ?? b.recoveryDistance ?? 0) > 0)) return null
  }
  // Temps : « en 3'05 », « @3'05 », « à 3'20/km ».
  const at = s.match(/\s*(?:@|en|à|a)\s*([\d'",.:hms]+)\s*(\/\s*km)?\s*$/)
  let time: number | undefined
  let isPace = false
  if (at) {
    s = s.slice(0, at.index)
    time = parseDuration(at[1], 's')
    isPace = !!at[2]
    if (!(time > 0)) return null
  }
  if (!parseEffort(s, b)) return null
  if (time) {
    if (b.distance) b.repTime = isPace ? Math.round((time * b.distance) / 1000) : time
    else return null // un temps cible n'a de sens que sur une distance
  }
  return b.reps > 0 ? b : null
}

export function parseBlocks(input: string): ParsedBlocks {
  const blocks: Block[] = []
  const errors: string[] = []
  for (const part of input.split(/\+|;|\n/)) {
    if (!part.trim()) continue
    const b = parseOne(part)
    if (b) blocks.push(b)
    else errors.push(part.trim())
  }
  return { blocks, errors }
}

/** Temps de chaque répétition tapés à la suite : « 3'04 3'05 3'06 » ou « 72 71 73 ». */
export function parseSplits(input: string): number[] {
  return input
    .split(/[\s,;/]+/)
    .filter(Boolean)
    .map((t) => parseDuration(t, 's'))
    .filter((n) => n > 0)
}

/** Temps moyen d'une répétition : la moyenne des temps saisis, sinon le temps annoncé. */
export function avgRepTime(b: Block): number | undefined {
  if (b.splits?.length) return b.splits.reduce((a, x) => a + x, 0) / b.splits.length
  return b.repTime
}

/** Allure moyenne d'un bloc sur distance, en s/km. */
export function blockPace(b: Block): number | undefined {
  const t = avgRepTime(b)
  return t && b.distance ? (t / b.distance) * 1000 : undefined
}

/** « 10x1000 », « 20x30/30 », « 3x10' » : sert à regrouper les séances comparables. */
export function blockSignature(b: Block): string {
  if (b.distance) return `${b.reps}x${b.distance}`
  if (b.duration && b.recovery && b.duration < 120) return `${b.reps}x${b.duration}/${b.recovery}`
  return `${b.reps}x${fmtClock(b.duration ?? 0)}`
}

export const sessionSignature = (s: Session) => (s.blocks ?? []).map(blockSignature).join(' + ')

/** « 10 × 1000 m en 3'05 · r 1'30 ». */
export function formatBlock(b: Block): string {
  let effort: string
  // Les coureurs disent « 1000 m » mais « 2 km ».
  if (b.distance) effort = b.distance <= 1000 ? `${b.distance} m` : fmtDistance(b.distance)
  else if (b.duration && b.recovery && b.duration < 120 && !b.distance) effort = `${b.duration}/${b.recovery}`
  else effort = fmtClock(b.duration ?? 0)
  let out = b.reps > 1 ? `${b.reps} × ${effort}` : effort
  const t = avgRepTime(b)
  if (t) out += ` en ${fmtClock(t)}`
  const isShortRR = b.duration && b.recovery && b.duration < 120 && !b.distance
  if (!isShortRR) {
    if (b.recovery) out += ` · r ${fmtClock(b.recovery)}`
    else if (b.recoveryDistance) out += ` · r ${fmtDistance(b.recoveryDistance)}`
  }
  return out
}

/** Texte de saisie équivalent, pour rouvrir une séance en édition. */
export function blocksToInput(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const reps = b.reps > 1 ? `${b.reps}x` : ''
      if (b.duration && b.recovery && b.duration < 120 && !b.distance) return `${reps}${b.duration}/${b.recovery}`
      let s = reps + (b.distance ? `${b.distance}` : fmtClock(b.duration ?? 0))
      if (b.repTime) s += ` en ${fmtClock(b.repTime)}`
      if (b.recovery) s += ` r${fmtClock(b.recovery)}`
      else if (b.recoveryDistance) s += ` r${b.recoveryDistance}m`
      return s
    })
    .join(' + ')
}

/** Distance totale parcourue sur les répétitions (hors échauffement et récup). */
export const blocksDistance = (blocks: Block[]) => blocks.reduce((a, b) => a + (b.distance ?? 0) * b.reps, 0)
