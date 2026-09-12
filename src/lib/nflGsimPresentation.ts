export const READY_DECISION_USE = 'PRODUCTION_READY_NOT_FINAL_GAME_DAY'

export function nflResultsDescription(decisionUse: string) {
  return decisionUse === READY_DECISION_USE
    ? 'production model results'
    : 'provisional production model results'
}
