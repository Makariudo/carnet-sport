import { describe, expect, it } from 'vitest'
import { buildSteps, estimateSeconds } from './timer'
import type { Program } from './types'

const prog: Program = {
  id: 'p', name: 'Test', rounds: 2, transition: 10,
  items: [
    { exercise: 'Planche', sets: 1, duration: 30 },
    { exercise: 'Squats', sets: 2, reps: 15, rest: 20 },
  ],
}

describe('buildSteps', () => {
  it('enchaîne efforts, récups entre séries et transitions, sans transition finale', () => {
    const steps = buildSteps(prog)
    expect(steps.map((s) => `${s.kind}:${s.label}`)).toEqual([
      'effort:Planche', 'transition:Transition',
      'effort:Squats', 'recup:Récup', 'effort:Squats', 'transition:Transition',
      'effort:Planche', 'transition:Transition',
      'effort:Squats', 'recup:Récup', 'effort:Squats',
    ])
    expect(steps[2]).toMatchObject({ reps: 15, seconds: undefined, detail: 'Série 1/2 · Tour 1/2' })
    expect(steps[5].detail).toBe('Ensuite : Planche')
  })
  it('estime la durée', () => {
    // 2 tours × (30 + 15×3 + 20 + 15×3) + 3 transitions de 10
    expect(estimateSeconds(prog)).toBe(2 * (30 + 45 + 20 + 45) + 30)
  })
})
