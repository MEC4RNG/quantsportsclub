import { mlbMarketSchema, type MlbMarket, type MlbMarketQuote } from '@/schemas/mlbMarket'
import { mlbGsimResultsSchema, type MlbGsimResults, type MlbGame } from '@/schemas/mlbGsimResults'
import type { OfficialGame } from '@/lib/mlbPerformance'

export function marketGame(payload: MlbMarket, quote: MlbMarketQuote, model: MlbGsimResults, received: number) {
  const generated = Date.parse(payload.generated_at_utc), fetched = Date.parse(payload.odds_fetched_at_utc)
  const updated = Date.parse(quote.book_updated_at), source = Date.parse(model.generated_at_utc)
  const game = model.games.find(g => g.game_id === quote.game_id)
  if (!Number.isFinite(received) || payload.slate_date !== model.slate_date || generated > received || received - generated > 5 * 60_000 ||
    fetched > generated || updated > fetched || source > received || received - source > 90 * 60_000 ||
    received - fetched > 30 * 60_000 || received - updated > 30 * 60_000 ||
    !game || game.context !== 'PREGAME_MODEL' || !game.projection ||
    game.home_team !== quote.home_team || game.away_team !== quote.away_team ||
    Math.abs(Date.parse(game.scheduled_start_utc) - Date.parse(quote.scheduled_start_utc)) > 5 * 60_000 ||
    received >= Math.min(Date.parse(game.scheduled_start_utc), Date.parse(quote.scheduled_start_utc))) return null
  return game
}

type Snapshot = { id: string; payloadHash: string; receivedAt: Date; modelPayloadHash: string; payload: unknown; modelResult: { payload: unknown } }
export type MarketForecast = { quote: MlbMarketQuote; game: MlbGame; date: string; receivedAt: string;
  snapshotId: string; hash: string; modelHash: string; oddsHash: string; fetchedAt: string }

export function selectMarketForecasts(snapshots: Snapshot[]) {
  const selected = new Map<string, MarketForecast>(), seen = new Set<string>()
  let invalidSnapshots = 0
  for (const row of [...snapshots].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime() || a.id.localeCompare(b.id))) {
    const market = mlbMarketSchema.safeParse(row.payload), model = mlbGsimResultsSchema.safeParse(row.modelResult.payload)
    if (!market.success || !model.success || row.modelPayloadHash !== market.data.model_payload_sha256) { invalidSnapshots++; continue }
    for (const quote of market.data.quotes) {
      const key = `${quote.game_id}:${quote.bookmaker}`
      seen.add(key)
      if (selected.has(key)) continue
      const game = marketGame(market.data, quote, model.data, row.receivedAt.getTime())
      if (game) selected.set(key, { quote, game, date: market.data.slate_date, receivedAt: row.receivedAt.toISOString(),
        snapshotId: row.id, hash: row.payloadHash, modelHash: row.modelPayloadHash,
        oddsHash: market.data.odds_snapshot_sha256, fetchedAt: market.data.odds_fetched_at_utc })
    }
  }
  return { forecasts: [...selected.values()], excluded: seen.size - selected.size, invalidSnapshots }
}

export function gradeMarketForecasts(forecasts: MarketForecast[], official: Map<string, OfficialGame>) {
  const rows = forecasts.map(forecast => {
    const final = official.get(forecast.game.game_id)
    const home = 1 / forecast.quote.home_decimal, away = 1 / forecast.quote.away_decimal
    const base = { ...forecast, marketProbability: home / (home + away), status: 'Official result unavailable',
      modelBrier: null as number | null, marketBrier: null as number | null }
    if (!final) return base
    if (final.teams.home.team.name !== forecast.game.home_team || final.teams.away.team.name !== forecast.game.away_team ||
      Date.parse(forecast.receivedAt) >= Date.parse(final.gameDate) ||
      Math.abs(Date.parse(final.gameDate) - Date.parse(forecast.quote.scheduled_start_utc)) > 5 * 60_000) {
      return { ...base, status: 'Excluded: identity or start changed' }
    }
    if (final.status.abstractGameState !== 'Final' || final.status.detailedState !== 'Final') return { ...base, status: 'Pending final' }
    const h = final.teams.home.score, a = final.teams.away.score
    if (h === undefined || a === undefined || h === a) return { ...base, status: 'Final requires review' }
    const outcome = Number(h > a)
    return { ...base, status: 'Graded research', modelBrier: (forecast.game.projection!.home_win_probability - outcome) ** 2,
      marketBrier: (base.marketProbability - outcome) ** 2 }
  })
  const books = [...new Set(rows.map(r => r.quote.bookmaker))].sort().map(bookmaker => {
    const observed = rows.filter(r => r.quote.bookmaker === bookmaker), graded = observed.filter(r => r.modelBrier !== null)
    return { bookmaker, observed: observed.length, graded: graded.length,
      modelBrier: graded.length ? graded.reduce((sum, r) => sum + r.modelBrier!, 0) / graded.length : null,
      marketBrier: graded.length ? graded.reduce((sum, r) => sum + r.marketBrier!, 0) / graded.length : null }
  })
  return { rows, books, uniqueGames: new Set(rows.map(r => r.game.game_id)).size }
}
