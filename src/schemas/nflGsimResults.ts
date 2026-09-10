import { z } from 'zod'

const probability = z.number().finite().min(0).max(1)
const nonEmpty = z.string().min(1)
export const nflDecisionUseSchema = z.enum([
  'PRODUCTION_PROVISIONAL_NOT_FINAL_GAME_DAY',
  'PRODUCTION_READY_NOT_FINAL_GAME_DAY',
])
const readyWeatherStatuses = new Set([
  'CURRENT_WEATHER_FORECAST_READY',
  'VALIDATED_ZERO_EFFECT',
  'VERSIONED_POINT_IN_TIME_WEATHER_INPUT',
])

const gameReadinessSchema = z
  .object({
    snapshot_status: nonEmpty,
    weather_status: nonEmpty,
    injury_feed_available: z.boolean(),
    decision_use: nflDecisionUseSchema,
  })
  .strict()

const totalLineSchema = z
  .object({
    threshold: z.number().finite(),
    over_probability: probability,
    under_probability: probability,
    push_probability: probability,
  })
  .strict()

const spreadLineSchema = z
  .object({
    home_handicap: z.number().finite(),
    home_cover_probability: probability,
    away_cover_probability: probability,
    push_probability: probability,
  })
  .strict()

const playerStatisticSchema = z.enum([
  'passing_yards',
  'rushing_yards',
  'receiving_yards',
  'receptions',
  'total_touchdowns',
])

const playerProjectionSchema = z
  .object({
    game_id: nonEmpty,
    player_id: nonEmpty,
    player_name: nonEmpty,
    team: nonEmpty,
    position: z.enum(['QB', 'RB', 'WR', 'TE']),
    trial_count: z.number().int().min(1),
    means: z
      .object({
        passing_yards: z.number().finite(),
        rushing_yards: z.number().finite(),
        receiving_yards: z.number().finite(),
        receptions: z.number().finite(),
        total_touchdowns: z.number().finite(),
      })
      .strict(),
    thresholds: z.array(
      z
        .object({
          statistic: playerStatisticSchema,
          threshold: z.number().finite(),
          over_probability: probability,
          under_probability: probability,
          push_probability: probability,
        })
        .strict(),
    ),
  })
  .strict()

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
    model_total_lines: z.array(totalLineSchema).optional(),
    model_spread_lines: z.array(spreadLineSchema).optional(),
    readiness: gameReadinessSchema.optional(),
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
    blocked_games: z.array(z.object({ source_game_id: nonEmpty, failure: nonEmpty }).strict()),
    games: z.array(gameSchema),
    player_projections: z.array(playerProjectionSchema).optional(),
    publication: z
      .object({
        visibility: z.literal('PRIVATE_QSC'),
        decision_use: nflDecisionUseSchema,
        model_parameters_included: z.literal(false),
      })
      .strict(),
    payload_hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict()
  .superRefine((payload, context) => {
    const gameIds = payload.games.map((game) => game.game_id)
    if (new Set(gameIds).size !== gameIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['games'],
        message: 'game IDs must be unique within a payload',
      })
    }
    if (
      payload.run.simulated_games !== payload.games.length ||
      payload.run.scheduled_games < payload.run.simulated_games
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['run'],
        message: 'run counts must match the payload update scope',
      })
    }
    const gameIdSet = new Set(gameIds)
    if ((payload.player_projections ?? []).some((player) => !gameIdSet.has(player.game_id))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['player_projections'],
        message: 'player projections must belong to a game in the payload update scope',
      })
    }

    for (const [index, game] of payload.games.entries()) {
      if (!game.readiness || game.readiness.decision_use !== 'PRODUCTION_READY_NOT_FINAL_GAME_DAY')
        continue
      if (
        game.provisional ||
        !game.readiness.injury_feed_available ||
        !readyWeatherStatuses.has(game.readiness.weather_status)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['games', index, 'readiness'],
          message: 'ready game classification is inconsistent with game readiness',
        })
      }
    }

    if (payload.publication.decision_use !== 'PRODUCTION_READY_NOT_FINAL_GAME_DAY') return

    const everyGameReady =
      payload.games.length > 0 &&
      payload.games.every(
        (game) =>
          !game.provisional &&
          (!game.readiness ||
            game.readiness.decision_use === 'PRODUCTION_READY_NOT_FINAL_GAME_DAY'),
      )
    const readyInputs =
      everyGameReady &&
      payload.readiness.injury_feed_available &&
      readyWeatherStatuses.has(payload.readiness.weather_status)
    if (!readyInputs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publication', 'decision_use'],
        message: 'ready decision-use classification is inconsistent with payload readiness',
      })
    }
  })

export type NflGsimResults = z.infer<typeof nflGsimResultsSchema>
