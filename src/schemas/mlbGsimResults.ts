import { z } from 'zod'

const probability = z.number().finite().min(0).max(1)
const timestamp = z.string().datetime({ offset: true })
const projection = z.object({
  home_win_probability: probability,
  away_win_probability: probability,
  game_total_mean: z.number().finite().min(0).max(100),
}).strict().refine(p => Math.abs(p.home_win_probability + p.away_win_probability - 1) < 0.00001,
  'Winner probabilities must sum to one')

export const mlbGameSchema = z.object({
  game_id: z.string().regex(/^\d{1,12}$/),
  away_team: z.string().min(1).max(80),
  home_team: z.string().min(1).max(80),
  scheduled_start_utc: timestamp,
  source_state: z.string().regex(/^[A-Z_]{1,40}$/),
  mlb_state: z.string().min(1).max(80),
  context: z.enum(['PREGAME_MODEL', 'PREGAME_REFERENCE', 'UNAVAILABLE']),
  run_id: z.string().regex(/^production_\d+$/).nullable(),
  projection: projection.nullable(),
}).strict().superRefine((game, ctx) => {
  if ((game.context === 'UNAVAILABLE') !== (game.projection === null)) {
    ctx.addIssue({ code: 'custom', message: 'Projection and context disagree' })
  }
  if (game.context === 'PREGAME_MODEL' &&
    (!game.run_id || !['READY', 'REGISTERED'].includes(game.source_state) ||
      !['Scheduled', 'Pre-Game', 'Warmup'].includes(game.mlb_state))) {
    ctx.addIssue({ code: 'custom', message: 'Pregame projection requires a registered pregame run' })
  }
})

export const mlbGsimResultsSchema = z.object({
  schema_version: z.literal('qsc.mlb_gsim.results.v1'),
  sport: z.literal('MLB'),
  slate_date: z.string().date(),
  generated_at_utc: timestamp,
  publication: z.object({
    visibility: z.literal('PRIVATE_QSC'),
    decision_use: z.literal('DESCRIPTIVE_MODEL_OUTPUT_NOT_VALIDATED_EDGE'),
    model_parameters_included: z.literal(false),
  }).strict(),
  games: z.array(mlbGameSchema).max(40),
}).strict().superRefine((payload, ctx) => {
  if (new Set(payload.games.map(g => g.game_id)).size !== payload.games.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate game IDs' })
  }
  for (const game of payload.games) {
    if (game.context === 'PREGAME_MODEL' &&
      Date.parse(game.scheduled_start_utc) <= Date.parse(payload.generated_at_utc)) {
      ctx.addIssue({ code: 'custom', message: 'Started game must be a reference' })
    }
  }
})

export type MlbGsimResults = z.infer<typeof mlbGsimResultsSchema>
export type MlbGame = z.infer<typeof mlbGameSchema>
