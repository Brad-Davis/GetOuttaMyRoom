import audioService from './audioService.js';

const SFX_LIBRARY = {
    punchLight: './resources/sounds/punch-light.mp3',
    darkBurst: './resources/sounds/dark-burst.mp3',
};

class EffectsService {
    constructor() {
        this.root = document.getElementById('container') || document.body;
        this.flashLayer = document.getElementById('screen-fx-flash');
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
    }

    playSfx(soundKeyOrPath, options = {}) {
        const resolvedPath = SFX_LIBRARY[soundKeyOrPath] || soundKeyOrPath;
        audioService.playSound(resolvedPath, options);
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
}

const effectsService = new EffectsService();
export default effectsService;
