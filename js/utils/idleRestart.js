import { clearBattleCheckpoint, setSkipIntroForNextLoad } from '../config/gameFlow.js';
import { clearPlayerInventorySave } from './inventoryPersistence.js';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 1000;

let lastActivityAt = Date.now();
let hiddenSince = null;
let checkIntervalId = null;

function noteActivity() {
    lastActivityAt = Date.now();
}

function reloadToIntro() {
    if (checkIntervalId != null) {
        clearInterval(checkIntervalId);
        checkIntervalId = null;
    }
    clearPlayerInventorySave();
    clearBattleCheckpoint();
    setSkipIntroForNextLoad(false);
    window.location.reload();
}

function onVisibilityChange() {
    if (document.hidden) {
        hiddenSince = Date.now();
        return;
    }

    if (hiddenSince != null) {
        lastActivityAt += Date.now() - hiddenSince;
        hiddenSince = null;
    }
}

function checkIdle() {
    if (document.hidden) return;
    if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
        reloadToIntro();
    }
}

export function initIdleRestart() {
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'click'];
    activityEvents.forEach((eventName) => {
        document.addEventListener(eventName, noteActivity, { passive: true, capture: true });
    });

    document.addEventListener('visibilitychange', onVisibilityChange);
    noteActivity();
    checkIntervalId = setInterval(checkIdle, CHECK_INTERVAL_MS);
}
