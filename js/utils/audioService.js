import gsap from 'gsap';

const DEFAULT_BGM_VOLUME = 0.7;

class AudioService {
    constructor() {
        this.bgmAudio = new Audio();
        this.bgmAudio.volume = DEFAULT_BGM_VOLUME;
        this.bgmAudio.loop = true;
        this.bgmAudio.src = 'resources/sounds/ambient.mp3';
        this.isPlaying = false;
        /** @type {gsap.core.Tween | null} */
        this._bgmVolumeTween = null;
        /** @type {Set<string>} */
        this._sfxPreloadedUrls = new Set();
        /** @type {Map<string, AudioBuffer>} decoded SFX for low-latency Web Audio playback */
        this._sfxBuffers = new Map();
        /** @type {AudioContext|null} */
        this._sfxCtx = null;
        /** @type {Map<string, Promise<void>>} */
        this._sfxInflight = new Map();
        this._installSfxUnlockOnUserGesture();
    }

    /** Stable key so `./sfx.mp3` and `sfx.mp3` share one buffer. */
    _sfxKey(url) {
        try {
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }

    _createSfxContext() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        return new Ctx();
    }

    /** Browsers start AudioContext suspended until a user gesture; resume ASAP. */
    _installSfxUnlockOnUserGesture() {
        const resume = () => {
            const ctx = this._sfxCtx;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
        };
        const once = { capture: true, passive: true, once: true };
        document.addEventListener('pointerdown', resume, once);
        document.addEventListener('keydown', resume, once);
        document.addEventListener('touchend', resume, once);
    }

    _getSfxContext() {
        if (!this._sfxCtx) {
            this._sfxCtx = this._createSfxContext();
        }
        return this._sfxCtx;
    }

    /**
     * Decode SFX into AudioBuffers so playback does not wait on the HTMLMediaElement pipeline.
     * @param {string[]} urls
     * @returns {Promise<void>}
     */
    preloadSfx(urls = []) {
        const unique = [...new Set(urls.filter(Boolean))];
        return Promise.all(unique.map((url) => this._preloadOneSfx(url))).then(() => undefined);
    }

    /**
     * @param {string} url
     * @returns {Promise<void>}
     */
    async _preloadOneSfx(url) {
        const key = this._sfxKey(url);
        if (this._sfxBuffers.has(key)) {
            this._sfxPreloadedUrls.add(url);
            return;
        }
        let p = this._sfxInflight.get(key);
        if (!p) {
            p = this._decodeSfxUrl(url, key);
            this._sfxInflight.set(key, p);
        }
        await p;
    }

    async _decodeSfxUrl(url, key) {
        const ctx = this._getSfxContext();
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.arrayBuffer();
            const buf = await ctx.decodeAudioData(raw.slice(0));
            this._sfxBuffers.set(key, buf);
            this._sfxPreloadedUrls.add(url);
        } catch (e) {
            console.warn('SFX preload/decode failed:', url, e);
        } finally {
            this._sfxInflight.delete(key);
        }
    }

    /**
     * @param {string} soundUrl
     * @param {{ volume?: number, playbackRate?: number }} options
     */
    playSound(soundUrl, options = {}) {
        if (!soundUrl) return;
        const key = this._sfxKey(soundUrl);
        const buffer = this._sfxBuffers.get(key);
        if (buffer) {
            void this._playSfxBuffer(buffer, options);
            return;
        }
        this._playSoundHtmlFallback(soundUrl, options);
    }

    /**
     * @param {AudioBuffer} buffer
     * @param {{ volume?: number, playbackRate?: number }} options
     */
    async _playSfxBuffer(buffer, options = {}) {
        const { volume = 0.7, playbackRate = 1 } = options;
        const ctx = this._getSfxContext();
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch {
                /* still try to start; may work after gesture */
            }
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const rate = Math.max(0.25, Math.min(4, playbackRate));
        src.playbackRate.value = rate;
        const gain = ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, volume));
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
    }

    /** Last resort for ad-hoc paths not passed through preload. */
    _playSoundHtmlFallback(sound, options = {}) {
        const { volume = 0.7, playbackRate = 1 } = options;
        const sfx = new Audio(sound);
        sfx.volume = Math.max(0, Math.min(1, volume));
        sfx.playbackRate = playbackRate;
        sfx.play().catch((error) => {
            console.warn('Audio play failed:', error);
        });
    }

    startBackgroundMusic() {
        if (!this.isPlaying) {
            this.bgmAudio.play().catch((error) => {
                console.warn('Audio play failed:', error);
            });
            this.isPlaying = true;
        }
    }

    setBackgroundMusic(trackPath) {
        if (!trackPath) return;
        this.bgmAudio.src = trackPath;
    }

    setBackgroundVolume(volume = 0.5) {
        this.bgmAudio.volume = Math.max(0, Math.min(1, volume));
    }

    stopSound() {
        this.bgmAudio.pause();
        this.isPlaying = false;
    }
    fadeOutBackgroundMusic(duration = 1) {
        this._bgmVolumeTween?.kill();
        this._bgmVolumeTween = gsap.to(this.bgmAudio, {
            volume: 0,
            duration,
            ease: 'power2.inOut',
        });
    }

    fadeInBackgroundMusic(volume = DEFAULT_BGM_VOLUME, duration = 1) {
        if (!this.isPlaying) return;

        this._bgmVolumeTween?.kill();
        this._bgmVolumeTween = gsap.to(this.bgmAudio, {
            volume,
            duration,
            ease: 'power2.inOut',
        });
    }
}

const audioService = new AudioService();
export default audioService;
