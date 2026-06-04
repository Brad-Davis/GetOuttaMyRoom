import { setSkipIntroForNextLoad } from '../config/gameFlow.js';
import { clearPlayerInventorySave } from './inventoryPersistence.js';

const HOLD_DURATION_S = 5;
const COUNT_START_S = 2;

let countdownEl = null;
let active = false;
let startTime = 0;
let rafId = null;
let pointerId = null;

function getCountdownEl() {
    if (!countdownEl) {
        countdownEl = document.getElementById('hold-restart-countdown');
    }
    return countdownEl;
}

function isInteractiveTarget(el) {
    if (!el || el === document.documentElement || el === document.body) return false;
    return Boolean(
        el.closest(
            'button, a, input, textarea, select, #window-overlay, #inventory-button, iframe, #computer, #initial-loading-screen'
        )
    );
}

function showCountdown(value) {
    const el = getCountdownEl();
    if (!el) return;
    el.textContent = String(value);
    el.hidden = false;
}

function hideCountdown() {
    const el = getCountdownEl();
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
}

function cancelHold() {
    active = false;
    pointerId = null;
    startTime = 0;
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    hideCountdown();
}

function completeHoldRestart() {
    cancelHold();
    clearPlayerInventorySave();
    setSkipIntroForNextLoad(false);
    window.location.reload();
}

function tick() {
    if (!active) return;

    const elapsed = (performance.now() - startTime) / 1000;

    if (elapsed >= HOLD_DURATION_S) {
        completeHoldRestart();
        return;
    }

    if (elapsed >= COUNT_START_S) {
        showCountdown(Math.floor(elapsed));
    }

    rafId = requestAnimationFrame(tick);
}

function onPointerDown(event) {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;
    if (active) return;

    active = true;
    pointerId = event.pointerId;
    startTime = performance.now();
    rafId = requestAnimationFrame(tick);
}

function onPointerUp(event) {
    if (!active) return;
    if (pointerId != null && event.pointerId !== pointerId) return;
    cancelHold();
}

export function initHoldToRestart() {
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', cancelHold);
}
