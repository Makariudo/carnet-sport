import { describe, expect, it } from 'vitest'
import { blockPace, blockSignature, blocksToInput, formatBlock, parseBlocks, parseSplits } from './blocks'
import { fmtClock, fmtDuration, parseDistance, parseDuration } from '../lib/time'

describe('parseDuration', () => {
  it.each([
    ['45', 'min', 2700],
    ['45:30', 'min', 2730],
    ['1:05:30', 'min', 3930],
    ['1h05', 'min', 3900],
    ['1h', 'min', 3600],
    ["3'05", 's', 185],
    ["3’05", 's', 185],
    ["10'", 's', 600],
    ["72''", 's', 72],
    ['72"', 's', 72],
    ['72s', 's', 72],
    ['72', 's', 72],
    ['45min', 's', 2700],
  ] as const)('%s (%s) → %i s', (input, bare, expected) => {
    expect(parseDuration(input, bare)).toBe(expected)
  })
  it('refuse le texte', () => expect(parseDuration('vite')).toBeNaN())
})

describe('parseDistance', () => {
  it.each([
    ['10', 'km', 10000],
    ['10,5', 'km', 10500],
    ['1000m', 'km', 1000],
    ['1000', 'm', 1000],
    ['2km', 'm', 2000],
  ] as const)('%s (%s) → %i m', (input, bare, expected) => {
    expect(parseDistance(input, bare)).toBe(expected)
  })
})

describe('formats', () => {
  it('fmtClock', () => {
    expect(fmtClock(58)).toBe('58"')
    expect(fmtClock(185)).toBe("3'05")
    expect(fmtClock(3730)).toBe("1h02'10")
  })
  it('fmtDuration', () => {
    expect(fmtDuration(2700)).toBe("45'")
    expect(fmtDuration(3150)).toBe("52'30")
    expect(fmtDuration(3900)).toBe('1h05')
  })
})

describe('parseBlocks', () => {
  it('10x1000 en 3\'05 r1\'30', () => {
    const { blocks, errors } = parseBlocks("10x1000 en 3'05 r1'30")
    expect(errors).toEqual([])
    expect(blocks).toEqual([{ reps: 10, distance: 1000, repTime: 185, recovery: 90 }])
    expect(blockPace(blocks[0])).toBe(185)
    expect(blockSignature(blocks[0])).toBe('10x1000')
    expect(formatBlock(blocks[0])).toBe("10 × 1000 m en 3'05 · r 1'30")
  })
  it('@ et × et récup en mètres', () => {
    const { blocks } = parseBlocks("10 × 400 @ 72'' récup 200m")
    expect(blocks).toEqual([{ reps: 10, distance: 400, repTime: 72, recoveryDistance: 200 }])
    expect(blockPace(blocks[0])).toBe(180)
  })
  it('allure par km', () => {
    const { blocks } = parseBlocks("3x2km à 3'20/km r2'")
    expect(blocks).toEqual([{ reps: 3, distance: 2000, repTime: 400, recovery: 120 }])
  })
  it('30/30 et blocs multiples', () => {
    const { blocks, errors } = parseBlocks("2x10x30/30 + 3x10' r2'")
    // « 2x10x30/30 » n'est pas géré : signalé, le reste est lu
    expect(errors).toEqual(['2x10x30/30'])
    expect(blocks).toEqual([{ reps: 3, duration: 600, recovery: 120 }])
    const rr = parseBlocks('20x30/30').blocks[0]
    expect(rr).toEqual({ reps: 20, duration: 30, recovery: 30 })
    expect(blockSignature(rr)).toBe('20x30/30')
    expect(formatBlock(rr)).toBe('20 × 30/30')
  })
  it('signale les morceaux illisibles', () => {
    expect(parseBlocks('10x1000 + n\'importe quoi').errors).toEqual(["n'importe quoi"])
  })
  it('aller-retour vers le texte de saisie', () => {
    const src = "10x1000 en 3'05 r1'30 + 20x30/30 + 5x200 r200m"
    expect(parseBlocks(blocksToInput(parseBlocks(src).blocks)).blocks).toEqual(parseBlocks(src).blocks)
  })
})

describe('parseSplits', () => {
  it('lit les chronos', () => {
    expect(parseSplits("3'04 3'05, 3'06")).toEqual([184, 185, 186])
    expect(parseSplits('72 71 73')).toEqual([72, 71, 73])
  })
  it('la moyenne des chronos prime sur le temps annoncé', () => {
    const b = { reps: 3, distance: 1000, repTime: 185, splits: [184, 185, 189] }
    expect(blockPace(b)).toBe(186)
  })
})
