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
    try {
        const stored = sessionStorage.getItem(SKIP_INTRO_STORAGE_KEY);
        if (stored === 'true') return true;
        if (stored === 'false') return false;
    } catch (_) {
        /* sessionStorage unavailable */
    }
    return null;
}

export const SKIP_INTRO = readSkipIntroOverride() ?? SKIP_INTRO_DEFAULT;

export function setSkipIntroForNextLoad(value) {
    try {
        sessionStorage.setItem(SKIP_INTRO_STORAGE_KEY, value ? 'true' : 'false');
    } catch (_) {
        /* sessionStorage unavailable */
    }
}

/** When true: skip intro/bed flow — spawn in the kitchen with scroll movement enabled. */
export const SPAWN_IN_KITCHEN = false;

/** When true: wheel scroll moves the hallway/kitchen rail much faster (dev / testing). */
export const FAST_SCROLL = true;

/** When true: flip wheel direction (scroll up advances the rail instead of scroll down). */
export const REVERSE_SCROLL = true;

/**
 * When true: Dad's room still plays the hallway door camera sequence, then skips the
 * pleaseDaddyWakeUp iframe and runs the same post-wake flow as completing it (kitchen spawn).
 */
export const SKIP_DADDY_WAKE_IFRAME = false;

/** When true: log `gameGroup.position.z` every frame in the browser console. */
export const LOG_PLAYER_Z = true;

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
 *
 * Dev-only overrides — runtime progress uses {@link saveBattleCheckpoint} and
 * {@link shouldSkipFirstFight} / {@link shouldSkipSecondFight} / {@link shouldSkipThirdFight}.
 */
export const SKIP_FIRST_FIGHT = false;
export const SKIP_SECOND_FIGHT = false;
export const SKIP_THIRD_FIGHT = false;

const BATTLE_CHECKPOINT_STORAGE_KEY = 'gomr_battle_checkpoint_v1';

/** @returns {0 | 1 | 2 | 3} */
function readSavedBattleCheckpoint() {
    try {
        const raw = sessionStorage.getItem(BATTLE_CHECKPOINT_STORAGE_KEY);
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 0 && n <= 3) return /** @type {0 | 1 | 2 | 3} */ (n);
    } catch (_) {
        /* sessionStorage unavailable */
    }
    return 0;
}

/** Persist door-battle progress so death reloads resume at the last victory. */
export function saveBattleCheckpoint(level) {
    const clamped = Math.min(3, Math.max(0, Math.floor(Number(level) || 0)));
    const current = readSavedBattleCheckpoint();
    if (clamped <= current) return;
    try {
        sessionStorage.setItem(BATTLE_CHECKPOINT_STORAGE_KEY, String(clamped));
    } catch (_) {
        /* sessionStorage unavailable */
    }
}

export function clearBattleCheckpoint() {
    try {
        sessionStorage.removeItem(BATTLE_CHECKPOINT_STORAGE_KEY);
    } catch (_) {
        /* sessionStorage unavailable */
    }
}

export function shouldSkipFirstFight() {
    return SKIP_FIRST_FIGHT || readSavedBattleCheckpoint() >= 1;
}

export function shouldSkipSecondFight() {
    return SKIP_SECOND_FIGHT || readSavedBattleCheckpoint() >= 2;
}

export function shouldSkipThirdFight() {
    return SKIP_THIRD_FIGHT || readSavedBattleCheckpoint() >= 3;
}

/** Computer mini-game + wake monologue for the current checkpoint. */
export function getInitialComputerPhase() {
    if (shouldSkipFirstFight() && shouldSkipSecondFight()) return 'youtube';
    if (shouldSkipFirstFight()) return 'tinder';
    return 'linkedin';
}

//-12.5