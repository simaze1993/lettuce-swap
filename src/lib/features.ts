// Feature flags. Flip a flag to re-enable a postponed area of the app.

/**
 * Tinder-style swipe "Game" mode (swipe items, auto-match, auto-create offers).
 *
 * Postponed: it overlaps heavily with the separate "Zèya" concept and only
 * becomes fun at critical user mass. The code (routes under /game,
 * components/game/*, and the record_game_like RPC path) is left intact — set
 * this to `true` to bring it back, no other changes required.
 */
export const GAME_MODE_ENABLED = false;
