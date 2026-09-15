export const READY_DECISION_USE = 'PRODUCTION_READY_NOT_FINAL_GAME_DAY'
export const MINIMUM_COMPARISON_GAMES = 50

export type StoredNflGame = {
  gameId: string
  awayTeam: string
  homeTeam: string
  awayWinProbability: number
  homeWinProbability: number
  tieProbability: number
  projectedMarginHome: number
  projectedTotalCalibrated: number
  validTrials: number
  invalidTrials: number
  provisional: boolean
  decisionUse: string | null
}

export type StoredNflResult = {
  id: string
  payloadHash: string
  generatedAt: Date
  createdAt: Date
  season: number
  week: number
  trialsPerGame: number
  marketIndependent: boolean
  decisionUse: string
  games: StoredNflGame[]
}

export type NflForecast = {
  game: StoredNflGame
  resultId: string
  hash: string
  season: number
  week: number
  receivedAt: string
  generatedAt: string
}

export type NflScheduleGame = {
  gameId: string
  season: number
  week: number
  kickoffUtc: string
  awayTeam: string
  homeTeam: string
  awayScore: number | null
  homeScore: number | null
}

export type NflLeagueBaseline = {
  seasons: number[]
  sampleGames: number
  awayWinProbability: number
  homeWinProbability: number
  tieProbability: number
  meanTotal: number
  meanHomeMargin: number
}

function finiteProbability(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

// First eligible QSC receipt per game. Selection never observes outcomes.
export function selectNflForecasts(results: StoredNflResult[]) {
  const selected = new Map<string, NflForecast>()
  const seen = new Set<string>()
  for (const result of [...results].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  )) {
    const received = result.createdAt.getTime()
    const generated = result.generatedAt.getTime()
    for (const game of result.games) {
      seen.add(game.gameId)
      const probabilities = [game.awayWinProbability, game.homeWinProbability, game.tieProbability]
      if (
        selected.has(game.gameId) ||
        game.provisional ||
        (game.decisionUse ?? result.decisionUse) !== READY_DECISION_USE ||
        !result.marketIndependent ||
        result.trialsPerGame !== 1000 ||
        game.validTrials !== 1000 ||
        game.invalidTrials !== 0 ||
        !probabilities.every(finiteProbability) ||
        Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) > 0.001 ||
        !Number.isFinite(received) ||
        !Number.isFinite(generated) ||
        generated > received ||
        received - generated > 90 * 60_000
      )
        continue
      selected.set(game.gameId, {
        game,
        resultId: result.id,
        hash: result.payloadHash,
        season: result.season,
        week: result.week,
        receivedAt: result.createdAt.toISOString(),
        generatedAt: result.generatedAt.toISOString(),
      })
    }
  }
  return { forecasts: [...selected.values()], excluded: seen.size - selected.size }
}

export function gradeNflForecasts(
  forecasts: NflForecast[],
  schedule: Map<string, NflScheduleGame>,
  scheduledGames: number,
  baseline: NflLeagueBaseline | null = null,
) {
  const rows = forecasts.map((forecast) => {
    const official = schedule.get(forecast.game.gameId)
    const base = {
      ...forecast,
      status: 'Pending final' as string,
      awayScore: null as number | null,
      homeScore: null as number | null,
      brier: null as number | null,
      totalError: null as number | null,
      marginError: null as number | null,
      correctWinner: null as boolean | null,
      baselineBrier: null as number | null,
      baselineTotalError: null as number | null,
      baselineMarginError: null as number | null,
    }
    if (!official) return { ...base, status: 'Result source unavailable' }
    if (
      official.season !== forecast.season ||
      official.week !== forecast.week ||
      official.awayTeam !== forecast.game.awayTeam ||
      official.homeTeam !== forecast.game.homeTeam ||
      Date.parse(forecast.receivedAt) >= Date.parse(official.kickoffUtc)
    )
      return { ...base, status: 'Excluded: identity or start-time mismatch' }
    if (official.awayScore === null || official.homeScore === null) return base

    const awayWon = Number(official.awayScore > official.homeScore)
    const homeWon = Number(official.homeScore > official.awayScore)
    const tied = Number(official.homeScore === official.awayScore)
    const probabilities = [
      forecast.game.awayWinProbability,
      forecast.game.homeWinProbability,
      forecast.game.tieProbability,
    ]
    const outcome = [awayWon, homeWon, tied]
    const predicted = probabilities.indexOf(Math.max(...probabilities))
    const actual = outcome.indexOf(1)
    const baselineProbabilities = baseline
      ? [baseline.awayWinProbability, baseline.homeWinProbability, baseline.tieProbability]
      : null
    return {
      ...base,
      status: 'Graded',
      awayScore: official.awayScore,
      homeScore: official.homeScore,
      brier: probabilities.reduce(
        (sum, probability, index) => sum + (probability - outcome[index]!) ** 2,
        0,
      ),
      totalError:
        forecast.game.projectedTotalCalibrated - (official.awayScore + official.homeScore),
      marginError: forecast.game.projectedMarginHome - (official.homeScore - official.awayScore),
      correctWinner: predicted === actual,
      baselineBrier: baselineProbabilities
        ? baselineProbabilities.reduce(
            (sum, probability, index) => sum + (probability - outcome[index]!) ** 2,
            0,
          )
        : null,
      baselineTotalError: baseline
        ? baseline.meanTotal - (official.awayScore + official.homeScore)
        : null,
      baselineMarginError: baseline
        ? baseline.meanHomeMargin - (official.homeScore - official.awayScore)
        : null,
    }
  })
  const graded = rows.filter((row) => row.status === 'Graded')
  const excluded = rows.filter((row) => row.status.startsWith('Excluded:')).length
  const mean = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  const modelBrier = mean(graded.map((row) => row.brier!))
  const modelTotalMae = mean(graded.map((row) => Math.abs(row.totalError!)))
  const modelMarginMae = mean(graded.map((row) => Math.abs(row.marginError!)))
  const baselineBrier = mean(
    graded.flatMap((row) => (row.baselineBrier === null ? [] : [row.baselineBrier])),
  )
  const baselineTotalMae = mean(
    graded.flatMap((row) =>
      row.baselineTotalError === null ? [] : [Math.abs(row.baselineTotalError)],
    ),
  )
  const baselineMarginMae = mean(
    graded.flatMap((row) =>
      row.baselineMarginError === null ? [] : [Math.abs(row.baselineMarginError)],
    ),
  )
  return {
    rows,
    scheduled: scheduledGames,
    eligible: forecasts.length,
    graded: graded.length,
    pending: rows.length - graded.length - excluded,
    excluded,
    coverage: scheduledGames ? forecasts.length / scheduledGames : null,
    gradedCoverage: scheduledGames ? graded.length / scheduledGames : null,
    comparisonStatus:
      graded.length >= MINIMUM_COMPARISON_GAMES
        ? 'MINIMUM_SAMPLE_REACHED'
        : 'DESCRIPTIVE_ONLY_BELOW_MINIMUM_SAMPLE',
    minimumComparisonGames: MINIMUM_COMPARISON_GAMES,
    brier: modelBrier,
    totalMae: modelTotalMae,
    totalBias: mean(graded.map((row) => row.totalError!)),
    marginMae: modelMarginMae,
    winnerAccuracy: mean(graded.map((row) => Number(row.correctWinner))),
    baselineBrier,
    baselineTotalMae,
    baselineMarginMae,
    brierDelta: modelBrier === null || baselineBrier === null ? null : modelBrier - baselineBrier,
    totalMaeDelta:
      modelTotalMae === null || baselineTotalMae === null ? null : modelTotalMae - baselineTotalMae,
    marginMaeDelta:
      modelMarginMae === null || baselineMarginMae === null
        ? null
        : modelMarginMae - baselineMarginMae,
  }
}
