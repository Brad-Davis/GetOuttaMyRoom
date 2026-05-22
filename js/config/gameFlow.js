// Temporary development switches for major flow changes.
// Flip this to false to restore the normal CD -> bed -> iframe intro path.
export const CD_STARTS_BATTLE_IMMEDIATELY = false;

/**
 * When true: skip CD / door / welcome iframe — start in bed and run first-time wake (eyes open,
 * monologue, mission). When false: normal CD → bed → iframe intro.
 */
export const SKIP_INTRO = true;
