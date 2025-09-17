import { z } from 'zod'

export const BetStatus = z.enum(['pending', 'win', 'loss', 'void'])

export const CreateBet = z.object({
  userId: z.string(),
  sport: z.string(),                 // e.g., "NFL"
  league: z.string().optional(),     // e.g., "NFL", "NBA", "NHL"
  eventId: z.string().optional(),    // book or custom id
  market: z.string().optional(),     // e.g., "Spread", "Moneyline"
  pick: z.string(),                  // e.g., "PHI -3.5"
  stakeUnits: z.number().positive(), // units risked
  oddsAmerican: z.number().int().optional(), // e.g., -110
  oddsDecimal: z.number().positive().optional(),
  notes: z.string().optional(),
})

export const SettleBet = z.object({
  result: z.enum(['win','loss','void']),
  // Optional override of realized units (e.g., partial grades, pushes as 0)
  realizedUnits: z.number().optional(),
})
export type CreateBetInput = z.infer<typeof CreateBet>
export type SettleBetInput = z.infer<typeof SettleBet>
