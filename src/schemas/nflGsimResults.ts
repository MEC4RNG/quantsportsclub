import { z } from 'zod'

const probability = z.number().finite().min(0).max(1)
const nonEmpty = z.string().min(1)

const gameSchema = z
  .object({
    game_id: nonEmpty,
    scheduled_start_date: z.string().date(),
    away_team: nonEmpty,
    home_team: nonEmpty,
    away_win_probability: probability,
    home_win_probability: probability,
    tie_probability: probability,
    projected_away_score: z.number().finite(),
    projected_home_score: z.number().finite(),
    projected_margin_home: z.number().finite(),
    projected_total_raw: z.number().finite(),
    projected_total_calibrated: z.number().finite(),
    total_p10: z.number().finite(),
    total_p50: z.number().finite(),
    total_p90: z.number().finite(),
    valid_trials: z.number().int().min(0),
    invalid_trials: z.number().int().min(0),
    provisional: z.boolean(),
    model_release: nonEmpty,
    runtime_artifact_hash: nonEmpty,
  })
  .strict()

export const nflGsimResultsSchema = z
  .object({
    schema_version: z.literal('qsc.nfl_gsim.results.v1'),
    generated_at_utc: z.string().datetime({ offset: true }),
    sport: z.literal('NFL'),
    season: z.number().int().min(2000),
    week: z.number().int().min(1).max(25),
    run: z
      .object({
        trials_per_game: z.number().int().min(1),
        master_seed: z.number().int(),
        market_independent: z.boolean(),
        scheduled_games: z.number().int().min(0),
        simulated_games: z.number().int().min(0),
      })
      .strict(),
    readiness: z
      .object({
        snapshot_status: nonEmpty,
        weather_status: nonEmpty,
        injury_feed_available: z.boolean(),
        refresh_artifact_hash: nonEmpty,
      })
      .strict(),
    blocked_games: z
      .array(z.object({ source_game_id: nonEmpty, failure: nonEmpty }).strict()),
    games: z.array(gameSchema),
    publication: z
      .object({
        visibility: z.literal('PRIVATE_QSC'),
        decision_use: nonEmpty,
        model_parameters_included: z.literal(false),
      })
      .strict(),
    payload_hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict()

export type NflGsimResults = z.infer<typeof nflGsimResultsSchema>
