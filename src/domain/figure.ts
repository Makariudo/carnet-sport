/**
 * Bonhomme articulé, vu de profil et tourné vers la droite, pour les schémas d'exercices.
 * Une pose donne l'angle de chaque segment ; on calcule les articulations, puis on recale
 * la figure sur un point d'appui (cheville, coude, main…) placé dans le repère 200 × 160.
 *
 * Angles en degrés :
 * - membres (cuisse, jambe, pied, bras, avant-bras) : 0 = vers le bas, 90 = vers l'avant (droite),
 *   -90 = vers l'arrière, 180 = vers le haut ;
 * - tronc (bassin → épaules) : 0 = vertical vers le haut, 90 = tête vers l'avant (couché face au sol
 *   ou penché), -90 = tête vers l'arrière (couché sur le dos, tête à gauche).
 * « r » est le côté proche (trait plein), « l » le côté éloigné (trait estompé).
 */

export const GROUND = 150

export const LEN = { trunk: 46, neck: 13, head: 8, thigh: 38, shin: 38, foot: 11, arm: 26, fore: 24 }

export interface Pose {
  t: number
  rt: number; rs: number; rf: number
  lt: number; ls: number; lf: number
  ra: number; rfa: number
  la: number; lfa: number
}

export type Joint =
  | 'hip' | 'neck' | 'head'
  | 'rKnee' | 'rAnkle' | 'rToe' | 'lKnee' | 'lAnkle' | 'lToe'
  | 'rElbow' | 'rWrist' | 'lElbow' | 'lWrist'

export type Pt = [number, number]
export type Skeleton = Record<Joint, Pt>

/** Debout, bras le long du corps. */
export const STAND: Pose = { t: 0, rt: 0, rs: 0, rf: 90, lt: 0, ls: 0, lf: 90, ra: 0, rfa: 0, la: 0, lfa: 0 }

const rad = (d: number) => (d * Math.PI) / 180
/** Segment de membre : 0° vers le bas, 90° vers l'avant. */
const limb = (p: Pt, a: number, l: number): Pt => [p[0] + l * Math.sin(rad(a)), p[1] + l * Math.cos(rad(a))]

/** Articulations d'une pose, recalées pour que `anchor` tombe sur `at`. */
export function solve(p: Pose, anchor: Joint, at: Pt): Skeleton {
  const hip: Pt = [0, 0]
  const neck: Pt = [LEN.trunk * Math.sin(rad(p.t)), -LEN.trunk * Math.cos(rad(p.t))]
  const head: Pt = [neck[0] + LEN.neck * Math.sin(rad(p.t)), neck[1] - LEN.neck * Math.cos(rad(p.t))]
  const rKnee = limb(hip, p.rt, LEN.thigh), rAnkle = limb(rKnee, p.rs, LEN.shin), rToe = limb(rAnkle, p.rf, LEN.foot)
  const lKnee = limb(hip, p.lt, LEN.thigh), lAnkle = limb(lKnee, p.ls, LEN.shin), lToe = limb(lAnkle, p.lf, LEN.foot)
  const rElbow = limb(neck, p.ra, LEN.arm), rWrist = limb(rElbow, p.rfa, LEN.fore)
  const lElbow = limb(neck, p.la, LEN.arm), lWrist = limb(lElbow, p.lfa, LEN.fore)
  const sk: Skeleton = { hip, neck, head, rKnee, rAnkle, rToe, lKnee, lAnkle, lToe, rElbow, rWrist, lElbow, lWrist }
  const a = sk[anchor]
  const dx = at[0] - a[0], dy = at[1] - a[1]
  for (const k of Object.keys(sk) as Joint[]) sk[k] = [sk[k][0] + dx, sk[k][1] + dy]
  return sk
}

/** Pose intermédiaire entre a et b (k de 0 à 1). */
export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const out = { ...a }
  for (const key of Object.keys(a) as (keyof Pose)[]) out[key] = a[key] + (b[key] - a[key]) * k
  return out
}

/** Accessoires dessinés autour du bonhomme. */
export type Prop =
  | { kind: 'box'; x: number; w: number; h: number }
  | { kind: 'wall'; x: number }
  /** Haltère dans chaque main. */
  | { kind: 'dumbbells' }
  /** Haltère dans la main proche seulement. */
  | { kind: 'dumbbell' }
  /** Barre sur les épaules. */
  | { kind: 'bar' }
  /** Haltère tenu contre la poitrine (goblet). */
  | { kind: 'goblet' }
  /** Élastique autour des genoux ou des chevilles. */
  | { kind: 'band'; at: 'knees' | 'ankles' }

export interface Frame {
  pose: Pose
  /** Point d'appui de cette image (par défaut celui de la figure). */
  anchor?: Joint
  at?: Pt
  /** Temps pour arriver à cette pose depuis la précédente (s). */
  move?: number
  /** Temps de maintien dans cette pose (s). */
  hold?: number
}

export interface Figure {
  anchor: Joint
  at: Pt
  frames: Frame[]
  props?: Prop[]
}

/** Raccourci : une pose à partir de la station debout. */
export const pose = (p: Partial<Pose>, base: Pose = STAND): Pose => ({ ...base, ...p })

/** Durée d'un cycle complet (retour à la première pose compris). */
export function cycleLength(f: Figure): number {
  return f.frames.reduce((a, fr) => a + (fr.move ?? 0.8) + (fr.hold ?? 0.25), 0)
}

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)

/**
 * Squelette à l'instant `time` (s) du cycle : on va de la pose i-1 à la pose i en `move` s,
 * puis on la tient `hold` s ; après la dernière, on revient à la première.
 */
export function skeletonAt(f: Figure, time: number): Skeleton {
  const n = f.frames.length
  const total = cycleLength(f)
  let t = ((time % total) + total) % total
  for (let i = 0; i < n; i++) {
    const fr = f.frames[(i + 1) % n]
    const prev = f.frames[i]
    const move = fr.move ?? 0.8, hold = fr.hold ?? 0.25
    if (t < move + hold) {
      const k = t < move ? ease(t / move) : 1
      const anA = prev.anchor ?? f.anchor, atA = prev.at ?? f.at
      const anB = fr.anchor ?? f.anchor, atB = fr.at ?? f.at
      // Même appui : on interpole les angles (les segments gardent leur longueur).
      if (anA === anB) {
        const at: Pt = [atA[0] + (atB[0] - atA[0]) * k, atA[1] + (atB[1] - atA[1]) * k]
        return solve(lerpPose(prev.pose, fr.pose, k), anA, at)
      }
      const a = solve(prev.pose, prev.anchor ?? f.anchor, prev.at ?? f.at)
      const b = solve(fr.pose, fr.anchor ?? f.anchor, fr.at ?? f.at)
      // Interpolation des points : l'appui peut changer d'une image à l'autre (sauts, burpees).
      const out = {} as Skeleton
      for (const key of Object.keys(a) as Joint[]) out[key] = [a[key][0] + (b[key][0] - a[key][0]) * k, a[key][1] + (b[key][1] - a[key][1]) * k]
      return out
    }
    t -= move + hold
  }
  const last = f.frames[0]
  return solve(last.pose, last.anchor ?? f.anchor, last.at ?? f.at)
}

/** Pose figée pour les vignettes : la deuxième image (la plus parlante en général). */
export function keySkeleton(f: Figure): Skeleton {
  const fr = f.frames[Math.min(1, f.frames.length - 1)]
  return solve(fr.pose, fr.anchor ?? f.anchor, fr.at ?? f.at)
}
