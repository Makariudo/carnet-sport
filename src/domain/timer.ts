/** Déroulé d'un programme de PPG pour le minuteur : efforts, récups et transitions dans l'ordre. */
import type { PpgItem, Program } from './types'

export interface Step {
  kind: 'effort' | 'recup' | 'transition'
  /** Libellé affiché en grand. */
  label: string
  /** Durée en secondes ; absente pour un effort compté en répétitions (on passe à la main). */
  seconds?: number
  reps?: number
  /** « Série 2/3 · Tour 1/2 ». */
  detail: string
}

export function buildSteps(p: Program): Step[] {
  const steps: Step[] = []
  for (let r = 1; r <= p.rounds; r++) {
    p.items.forEach((it: PpgItem, i) => {
      for (let s = 1; s <= it.sets; s++) {
        const detail = [it.sets > 1 ? `Série ${s}/${it.sets}` : null, p.rounds > 1 ? `Tour ${r}/${p.rounds}` : null].filter(Boolean).join(' · ')
        steps.push({ kind: 'effort', label: it.exercise, seconds: it.duration, reps: it.reps, detail })
        if (s < it.sets && it.rest) steps.push({ kind: 'recup', label: 'Récup', seconds: it.rest, detail: `Ensuite : ${it.exercise}` })
      }
      const last = r === p.rounds && i === p.items.length - 1
      if (!last && p.transition) {
        const next = p.items[(i + 1) % p.items.length]
        steps.push({ kind: 'transition', label: 'Transition', seconds: p.transition, detail: `Ensuite : ${next.exercise}` })
      }
    })
  }
  return steps
}

/** Durée estimée du programme, en comptant 3 s par répétition pour les exercices comptés. */
export function estimateSeconds(p: Program): number {
  return buildSteps(p).reduce((a, s) => a + (s.seconds ?? (s.reps ?? 10) * 3), 0)
}
