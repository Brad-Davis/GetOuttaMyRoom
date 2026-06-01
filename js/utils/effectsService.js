import audioService from '../utils/audioService.js';
import cameraService from '../utils/cameraPresets.js';
import sceneService from '../utils/sceneService.js';
import CameraSmokeEffect from '../utils/cameraSmokeEffect.js';

const SFX_LIBRARY = {
    punchLight: './resources/sounds/punch-light.mp3',
    darkBurst: './resources/sounds/dark-burst.mp3',
    notEnoughDopamine: './resources/sounds/notEnoughDopamine.mp3',
    dead: './resources/sounds/dead.mp3',
    /** Alias used by gameState.kill */
    death: './resources/sounds/dead.mp3',
    doorOpen: './resources/sounds/doorOpen.mp3',
    startupEffect: './resources/sounds/startupEffect.mp3',
    punchHeavy: './resources/sounds/punch-heavy.mp3',
    lightPunch: './resources/sounds/lightPunch.wav',
    punchHeavy: './resources/sounds/punchHeavy.wav',
    bite: './resources/sounds/bite.wav',
    scream: './resources/sounds/scream.wav',
    bongHit1: './resources/sounds/bong1.mp3',
    bongHit2: './resources/sounds/bong2.mp3',
    bongHit3: './resources/sounds/bong3.mp3',
};

class EffectsService {
    constructor() {
        this.root = document.getElementById('container') || document.body;
        this.flashLayer = document.getElementById('screen-fx-flash');
        this._smokeClock = null;
        /** @type {CameraSmokeEffect | null} */
        this._cameraSmoke = null;
    }

    refreshTargets() {
        this.root = document.getElementById('container') || document.body;
        this.flashLayer = document.getElementById('screen-fx-flash');
    }

    apply(effects = {}) {
        if (!effects) return;
        if (effects.sfx) this.playSfx(effects.sfx, effects.sfxOptions || {});
        if (effects.screenShake) this.shakeScreen(effects.screenShake);
        if (effects.flash) this.flashScreen(effects.flash);
        if (effects.smoke) this.smokeEffect(effects.smoke);
    }

    playSfx(soundKeyOrPath, options = {}) {
        const resolvedPath = SFX_LIBRARY[soundKeyOrPath] || soundKeyOrPath;
        audioService.playSound(resolvedPath, options);
    }

    /** Preload all library SFX (see audioService.preloadSfx). */
    preloadSfxLibrary() {
        return audioService.preloadSfx(Object.values(SFX_LIBRARY));
    }

    shakeScreen(options = {}) {
        this.refreshTargets();
        const { intensity = 8, duration = 180 } = options;
        if (!this.root) return;
        this.root.style.setProperty('--shake-intensity', `${intensity}px`);
        this.root.classList.remove('screen-shake');
        // Force reflow so the animation can retrigger quickly.
        // eslint-disable-next-line no-unused-expressions
        this.root.offsetWidth;
        this.root.classList.add('screen-shake');
        setTimeout(() => this.root?.classList.remove('screen-shake'), duration);
    }

    flashScreen(options = {}) {
        this.refreshTargets();
        if (!this.flashLayer) return;
        const { color = '#ffffff', alpha = 0.2, duration = 120 } = options;
        this.flashLayer.style.backgroundColor = color;
        this.flashLayer.style.opacity = `${alpha}`;
        this.flashLayer.classList.add('screen-flash-active');
        setTimeout(() => {
            this.flashLayer.style.opacity = '0';
            this.flashLayer.classList.remove('screen-flash-active');
        }, duration);
    }

    /**
     * Puff of smoke in front of the active Three.js camera (e.g. bong hit).
     * @param {object} [options] Passed to {@link CameraSmokeEffect} on first create.
     */
    smokeEffect(options = {}) {
        const camera = cameraService.getCamera();
        const scene = sceneService.getScene();
        if (!camera || !scene) return;

        if (!this._cameraSmoke) {
            this._cameraSmoke = new CameraSmokeEffect(camera, scene, options);
        } else {
            this._cameraSmoke.configure(options);
        }

        this._smokeClock = { last: performance.now() };
        this._cameraSmoke.spawn();
    }

    /** Call from the game loop while smoke may be playing. */
    update() {
        if (!this._cameraSmoke?.alive) return;
        if (!this._smokeClock) {
            this._smokeClock = { last: performance.now() };
        }
        const now = performance.now();
        const delta = Math.min((now - this._smokeClock.last) / 1000, 0.05);
        this._smokeClock.last = now;
        this._cameraSmoke.update(delta);
    }

    dispose() {
        this._cameraSmoke?.dispose();
        this._cameraSmoke = null;
        this._smokeClock = null;
    }
}

const effectsService = new EffectsService();
window.effectsService = effectsService;
export default effectsService;
