/**
 * Event lifecycle phase derived from `startTime` / `endTime` and the current
 * block timestamp. The contract uses the same boundaries on-chain — keep them
 * aligned exactly.
 *
 *   Phase 1 — `sale`     : `createdAt`  → `startTime`    (primary + secondary market)
 *   Phase 2 — `active`   : `startTime`  → `endTime`      (all market ops frozen)
 *   Phase 3 — `completed`: `endTime`    → ∞              (withdrawals unlock)
 */
export type EventPhase = 'sale' | 'active' | 'completed'

export interface EventPhaseSnapshot {
  phase: EventPhase
  /** Seconds until the next phase boundary (`startTime` for `sale`, `endTime` for `active`). 0 when already in `completed`. */
  secondsUntilNext: number
  /** Convenience flags so callers don't have to compare against the enum string. */
  isSale: boolean
  isActive: boolean
  isCompleted: boolean
}
