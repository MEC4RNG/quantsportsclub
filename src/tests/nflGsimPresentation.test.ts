import { describe, expect, it } from 'vitest'
import { nflResultsDescription, READY_DECISION_USE } from '@/lib/nflGsimPresentation'

describe('NFL GSIM decision-use presentation', () => {
  it('uses ready wording only for the governed ready value', () => {
    expect(nflResultsDescription(READY_DECISION_USE)).toBe('production model results')
  })

  it('keeps the governed provisional value provisional', () => {
    expect(nflResultsDescription('PRODUCTION_PROVISIONAL_NOT_FINAL_GAME_DAY')).toBe(
      'provisional production model results'
    )
  })

  it('fails closed for an unknown value', () => {
    expect(nflResultsDescription('UNRECOGNIZED')).toBe('provisional production model results')
  })
})
