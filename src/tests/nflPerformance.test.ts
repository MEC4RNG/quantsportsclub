import { expect, it } from 'vitest'
import {
  gradeNflForecasts,
  selectNflForecasts,
  type NflScheduleGame,
  type StoredNflResult,
} from '@/lib/nflPerformance'

function result(id = 'a', received = '2026-09-13T14:00:00Z'): StoredNflResult {
  return {
    id,
    payloadHash: id.repeat(64),
    generatedAt: new Date('2026-09-13T13:55:00Z'),
    createdAt: new Date(received),
    season: 2026,
    week: 1,
    trialsPerGame: 1000,
    marketIndependent: true,
    decisionUse: 'PRODUCTION_READY_NOT_FINAL_GAME_DAY',
    games: [
      {
        gameId: '2026_01_A_H',
        awayTeam: 'A',
        homeTeam: 'H',
        awayWinProbability: 0.35,
        homeWinProbability: 0.6,
        tieProbability: 0.05,
        projectedMarginHome: 3,
        projectedTotalCalibrated: 44,
        validTrials: 1000,
        invalidTrials: 0,
        provisional: false,
        decisionUse: 'PRODUCTION_READY_NOT_FINAL_GAME_DAY',
      },
    ],
  }
}

const final: NflScheduleGame = {
  gameId: '2026_01_A_H',
  season: 2026,
  week: 1,
  kickoffUtc: '2026-09-13T17:00:00Z',
  awayTeam: 'A',
  homeTeam: 'H',
  awayScore: 20,
  homeScore: 27,
}

it('selects the first eligible receipt without observing outcomes', () => {
  const selected = selectNflForecasts([result('b', '2026-09-13T14:05:00Z'), result()])
  expect(selected.forecasts).toHaveLength(1)
  expect(selected.forecasts[0]!.resultId).toBe('a')
})

it('rejects provisional, stale, market-dependent and invalid-trial forecasts', () => {
  const provisional = result()
  provisional.games[0]!.provisional = true
  const stale = result()
  stale.createdAt = new Date('2026-09-13T15:30:01Z')
  const market = result()
  market.marketIndependent = false
  const invalid = result()
  invalid.games[0]!.invalidTrials = 1
  expect(selectNflForecasts([provisional]).forecasts).toHaveLength(0)
  expect(selectNflForecasts([stale]).forecasts).toHaveLength(0)
  expect(selectNflForecasts([market]).forecasts).toHaveLength(0)
  expect(selectNflForecasts([invalid]).forecasts).toHaveLength(0)
})

it('grades home, away and tie outcomes with coverage kept separate', () => {
  const forecasts = selectNflForecasts([result()]).forecasts
  const report = gradeNflForecasts(forecasts, new Map([[final.gameId, final]]), 16)
  expect(report.graded).toBe(1)
  expect(report.coverage).toBeCloseTo(1 / 16)
  expect(report.brier).toBeCloseTo(0.35 ** 2 + (0.6 - 1) ** 2 + 0.05 ** 2)
  expect(report.totalMae).toBe(3)
  expect(report.totalBias).toBe(-3)
  expect(report.marginMae).toBe(4)
  expect(report.winnerAccuracy).toBe(1)
  expect(report.comparisonStatus).toBe('DESCRIPTIVE_ONLY_BELOW_MINIMUM_SAMPLE')

  const away = { ...final, awayScore: 30, homeScore: 20 }
  expect(gradeNflForecasts(forecasts, new Map([[away.gameId, away]]), 16).winnerAccuracy).toBe(0)
  const tie = { ...final, awayScore: 24, homeScore: 24 }
  expect(gradeNflForecasts(forecasts, new Map([[tie.gameId, tie]]), 16).brier).toBeCloseTo(
    0.35 ** 2 + 0.6 ** 2 + (0.05 - 1) ** 2,
  )
})

it('compares the model and a chronological baseline on the same graded games', () => {
  const forecasts = selectNflForecasts([result()]).forecasts
  const baseline = {
    seasons: [2023, 2024, 2025],
    sampleGames: 816,
    awayWinProbability: 0.45,
    homeWinProbability: 0.54,
    tieProbability: 0.01,
    meanTotal: 42,
    meanHomeMargin: 2,
  }
  const report = gradeNflForecasts(forecasts, new Map([[final.gameId, final]]), 16, baseline)
  expect(report.baselineBrier).toBeCloseTo(0.45 ** 2 + (0.54 - 1) ** 2 + 0.01 ** 2)
  expect(report.baselineTotalMae).toBe(5)
  expect(report.baselineMarginMae).toBe(5)
  expect(report.brierDelta).toBeCloseTo(report.brier! - report.baselineBrier!)
})

it('withholds missing scores and excludes identity or chronology mismatches', () => {
  const forecasts = selectNflForecasts([result()]).forecasts
  const pending = { ...final, homeScore: null }
  expect(gradeNflForecasts(forecasts, new Map([[pending.gameId, pending]]), 16).pending).toBe(1)
  const changed = { ...final, homeTeam: 'X' }
  expect(gradeNflForecasts(forecasts, new Map([[changed.gameId, changed]]), 16).excluded).toBe(1)
  const early = { ...final, kickoffUtc: '2026-09-13T13:59:59Z' }
  expect(gradeNflForecasts(forecasts, new Map([[early.gameId, early]]), 16).excluded).toBe(1)
})
