// Temporary development switches for major flow changes.
// Flip this to false to restore the normal CD -> bed -> iframe intro path.
export const CD_STARTS_BATTLE_IMMEDIATELY = false;

/**
 * When true: skip CD / door / welcome iframe — start in bed and run first-time wake (eyes open,
 * monologue, mission). When false: normal CD → bed → iframe intro.
 * Overridden at runtime via sessionStorage when the player holds mouse to restart from the beginning.
 */
export const SKIP_INTRO_DEFAULT = true;

const SKIP_INTRO_STORAGE_KEY = 'skip_intro';

function readSkipIntroOverride() {
    // try {
    //     const stored = sessionStorage.getItem(SKIP_INTRO_STORAGE_KEY);
    //     if (stored === 'true') return true;
    //     if (stored === 'false') return false;
    // } catch (_) {
    //     /* sessionStorage unavailable */
    // }
    // return null;
}

export const SKIP_INTRO = readSkipIntroOverride() ?? SKIP_INTRO_DEFAULT;

export function setSkipIntroForNextLoad(value) {
    // try {
    //     sessionStorage.setItem(SKIP_INTRO_STORAGE_KEY, value ? 'true' : 'false');
    // } catch (_) {
    //     /* sessionStorage unavailable */
    // }
}

/** When true: skip intro/bed flow — spawn in the kitchen with scroll movement enabled. */
export const SPAWN_IN_KITCHEN = false;

/** When true: wheel scroll moves the hallway/kitchen rail much faster (dev / testing). */
export const FAST_SCROLL = false;

/**
 * When true: Dad's room still plays the hallway door camera sequence, then skips the
 * pleaseDaddyWakeUp iframe and runs the same post-wake flow as completing it (kitchen spawn).
 */
export const SKIP_DADDY_WAKE_IFRAME = false;

/** When true: log `gameGroup.position.z` every frame in the browser console. */
export const LOG_PLAYER_Z = false;

/**
 * When true: skip Thirties hello dialog, run-away / return beats, anger shakes, and the
 * intro `turnCamera` — jump straight to hallway scroll chase.
 */
export const SKIP_THIRTIES_DIALOG = false;

/**
 * Door battles (Uncle → Cousin → Grandma). When true, that fight is not played;
 * checkpoint prep still runs (fight 1 → {@link prepareForSecondBattle}, fight 2 →
 * {@link prepareForThirdBattle}). Skip Grandma also jumps to the Thirties chapter
 * (default room camera + {@link startThirtiesChapter} on load / door skip).
 */
export const SKIP_FIRST_FIGHT = true;
export const SKIP_SECOND_FIGHT = true;
export const SKIP_THIRD_FIGHT = false;

/** Computer mini-game + wake monologue for the current dev skip checkpoint. */
export function getInitialComputerPhase() {
    if (SKIP_FIRST_FIGHT && SKIP_SECOND_FIGHT) return 'youtube';
    if (SKIP_FIRST_FIGHT) return 'tinder';
    return 'linkedin';
}

//-12.5