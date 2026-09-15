import { z } from 'zod'

const timestamp = z.string().datetime({ offset: true })
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const quote = z.object({
  game_id: z.string().regex(/^\d{1,12}$/),
  event_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  bookmaker: z.string().regex(/^[a-z0-9_]{1,50}$/),
  home_team: z.string().min(1).max(80), away_team: z.string().min(1).max(80),
  scheduled_start_utc: timestamp, book_updated_at: timestamp,
  home_decimal: z.number().finite().gt(1).max(10000),
  away_decimal: z.number().finite().gt(1).max(10000),
}).strict()

export const mlbMarketSchema = z.object({
  schema_version: z.literal('qsc.mlb_market_observations.v1'), sport: z.literal('MLB'),
  slate_date: z.string().date(), generated_at_utc: timestamp, odds_fetched_at_utc: timestamp,
  model_payload_sha256: hash, odds_snapshot_sha256: hash,
  publication: z.object({ visibility: z.literal('PRIVATE_QSC'),
    decision_use: z.literal('RESEARCH_ONLY_SETTLEMENT_RULES_NOT_VERIFIED') }).strict(),
  quotes: z.array(quote).max(400),
}).strict().superRefine((payload, ctx) => {
  const keys = new Set<string>(), gameEvents = new Map<string, string>(), eventGames = new Map<string, string>()
  for (const row of payload.quotes) {
    const key = `${row.game_id}:${row.bookmaker}`
    if (keys.has(key) || (gameEvents.has(row.game_id) && gameEvents.get(row.game_id) !== row.event_id) ||
      (eventGames.has(row.event_id) && eventGames.get(row.event_id) !== row.game_id)) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate or ambiguous event identity' })
    }
    keys.add(key); gameEvents.set(row.game_id, row.event_id); eventGames.set(row.event_id, row.game_id)
  }
})

export type MlbMarket = z.infer<typeof mlbMarketSchema>
export type MlbMarketQuote = MlbMarket['quotes'][number]
