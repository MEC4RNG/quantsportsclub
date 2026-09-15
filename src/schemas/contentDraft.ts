import { z } from 'zod'

const sha256 = z.string().regex(/^[a-f0-9]{64}$/)

export const contentDraftPackageSchema = z
  .object({
    schema_version: z.literal('qsc.content_drafts.v1'),
    template_version: z.literal('1.1'),
    slate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reviewed_at_utc: z.string().datetime({ offset: true }),
    source_generated_at_utc: z.string().datetime({ offset: true }),
    source_payload_sha256: sha256,
    release_status: z.literal('INTERNAL_DRAFT_ONLY'),
    public_release_authorized: z.literal(false),
    posting_enabled: z.literal(false),
    blockers: z.array(z.string().min(1).max(100)).max(20),
    posts: z
      .array(
        z
          .object({
            kind: z.enum(['DAILY_ANCHOR', 'GAME_MODEL']),
            game_id: z.string().min(1).max(100).optional(),
            run_id: z.string().min(1).max(200).optional(),
            text: z.string().min(1).max(1000),
            conservative_length: z.number().int().nonnegative(),
            copy_status: z.enum(['REVIEWABLE', 'BLOCKED_LENGTH']),
          })
          .strict(),
      )
      .max(40),
    games: z
      .array(
        z
          .object({
            game_id: z.string().min(1).max(100),
            status_at_review: z.enum(['PREGAME_MODEL', 'PREGAME_REFERENCE', 'UNAVAILABLE']),
          })
          .strict(),
      )
      .max(40),
    requirements: z.array(z.string().min(1).max(300)).max(20),
    evidence: z
      .object({
        model_fields: z.literal('EXACT_ACKNOWLEDGED_PAYLOAD'),
        prices: z.literal('NOT_APPLICABLE'),
        stakes: z.literal('NOT_APPLICABLE'),
        betting_decisions: z.literal('NOT_APPLICABLE'),
        media: z.literal('NOT_CREATED'),
      })
      .strict(),
  })
  .strict()

export type ContentDraftPackage = z.infer<typeof contentDraftPackageSchema>
