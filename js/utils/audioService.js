import gsap from 'gsap';

const DEFAULT_BGM_VOLUME = 0.7;
const DEFAULT_CROSSFADE_DURATION = 2;

class AudioService {
    constructor() {
        this.bgmAudio = this._createBgmElement('resources/sounds/ambient.mp3');
        this._bgmAlt = this._createBgmElement();
        this.bgmAudio.volume = DEFAULT_BGM_VOLUME;
        this._bgmTargetVolume = DEFAULT_BGM_VOLUME;
        this._currentTrackUrl = this._trackKey('resources/sounds/ambient.mp3');
        this.isPlaying = false;
        /** @type {gsap.core.Tween | null} */
        this._bgmVolumeTween = null;
        /** @type {gsap.core.Tween[]} */
        this._bgmCrossfadeTweens = [];
        /** Incremented to cancel in-flight crossfades when switching again. */
        this._bgmSwitchId = 0;
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

    _createBgmElement(src = '') {
        const audio = new Audio();
        audio.loop = true;
        audio.volume = 0;
        if (src) audio.src = src;
        return audio;
    }

    _trackKey(url) {
        if (!url) return '';
        try {
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }

    _killBgmTweens() {
        this._bgmVolumeTween?.kill();
        this._bgmVolumeTween = null;
        this._bgmCrossfadeTweens.forEach(tween => tween.kill());
        this._bgmCrossfadeTweens = [];
    }

    /** Stable key so `./sfx.mp3` and `sfx.mp3` share one buffer. */
    _sfxKey(url) {
        return this._trackKey(url);
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

    playBattleMusic() {
        return this.switchBackgroundMusic('./resources/sounds/battle.mp3');
    }

    playDefaultBackgroundMusic() {
        return this.switchBackgroundMusic('resources/sounds/ambient.mp3');
    }

    /**
     * Crossfade from the current BGM track to a new one.
     *
     * @param {string} trackPath
     * @param {{
     *   duration?: number,
     *   volume?: number,
     *   loop?: boolean,
     *   play?: boolean,
     *   force?: boolean,
     * }} [options]
     * @returns {Promise<void>}
     */
    async switchBackgroundMusic(trackPath, options = {}) {
        if (!trackPath) return;

        const duration = Math.max(0, options.duration ?? DEFAULT_CROSSFADE_DURATION);
        const volume = Math.max(0, Math.min(1, options.volume ?? this._bgmTargetVolume));
        const loop = options.loop ?? true;
        const shouldPlay = options.play ?? true;
        const trackKey = this._trackKey(trackPath);

        this._bgmTargetVolume = volume;

        if (!options.force && trackKey === this._currentTrackUrl) {
            this.bgmAudio.loop = loop;
            if (shouldPlay) {
                await this._ensureBgmPlaying(this.bgmAudio);
                if (this.bgmAudio.volume < volume && duration > 0) {
                    this.fadeInBackgroundMusic(volume, duration);
                } else {
                    this.bgmAudio.volume = volume;
                }
            }
            return;
        }

        const switchId = ++this._bgmSwitchId;
        this._killBgmTweens();

        const outgoing = this.bgmAudio;
        const incoming = this._bgmAlt;

        incoming.loop = loop;
        incoming.src = trackPath;
        incoming.currentTime = 0;
        incoming.volume = 0;

        if (shouldPlay) {
            await this._ensureBgmPlaying(incoming);
        }

        if (switchId !== this._bgmSwitchId) return;

        this._currentTrackUrl = trackKey;

        const finishSwap = () => {
            if (switchId !== this._bgmSwitchId) return;
            outgoing.pause();
            outgoing.volume = 0;
            this.bgmAudio = incoming;
            this._bgmAlt = outgoing;
        };

        if (duration <= 0) {
            outgoing.pause();
            outgoing.volume = 0;
            incoming.volume = volume;
            finishSwap();
            return;
        }

        const fadeOut = gsap.to(outgoing, {
            volume: 0,
            duration,
            ease: 'power2.inOut',
            onComplete: () => {
                if (switchId !== this._bgmSwitchId) return;
                outgoing.pause();
            },
        });
        const fadeIn = gsap.to(incoming, {
            volume,
            duration,
            ease: 'power2.inOut',
            onComplete: finishSwap,
        });

        this._bgmCrossfadeTweens = [fadeOut, fadeIn];
    }

    async _ensureBgmPlaying(audio) {
        if (!audio) return;
        try {
            await audio.play();
            this.isPlaying = true;
        } catch (error) {
            console.warn('Audio play failed:', error);
        }
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
            this._ensureBgmPlaying(this.bgmAudio);
        }
    }

    /** @deprecated Prefer switchBackgroundMusic for crossfades. */
    setBackgroundMusic(trackPath, options = {}) {
        return this.switchBackgroundMusic(trackPath, { ...options, duration: 0 });
    }

    setBackgroundVolume(volume = 0.5) {
        this._bgmTargetVolume = Math.max(0, Math.min(1, volume));
        this.bgmAudio.volume = this._bgmTargetVolume;
    }

    stopSound() {
        this._bgmSwitchId += 1;
        this._killBgmTweens();
        this.bgmAudio.pause();
        this._bgmAlt.pause();
        this.bgmAudio.volume = 0;
        this._bgmAlt.volume = 0;
        this.isPlaying = false;
    }

    fadeOutBackgroundMusic(duration = 1) {
        this._killBgmTweens();
        this._bgmVolumeTween = gsap.to(this.bgmAudio, {
            volume: 0,
            duration,
            ease: 'power2.inOut',
        });
    }

    fadeInBackgroundMusic(volume = DEFAULT_BGM_VOLUME, duration = 1) {
        this._bgmTargetVolume = Math.max(0, Math.min(1, volume));
        if (!this.isPlaying) {
            void this._ensureBgmPlaying(this.bgmAudio);
        }

        this._killBgmTweens();
        this._bgmVolumeTween = gsap.to(this.bgmAudio, {
            volume: this._bgmTargetVolume,
            duration,
            ease: 'power2.inOut',
        });
    }
}

const audioService = new AudioService();
export default audioService;
