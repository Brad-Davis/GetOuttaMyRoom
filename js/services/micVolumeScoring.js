/**
 * Samples microphone loudness via Web Audio and returns a 0–100 score over a timed window.
 */

const DEFAULT_DURATION_SECONDS = 5;
const SAMPLE_INTERVAL_MS = 50;
/** RMS below this is treated as silence (room noise gate). */
const LOUDNESS_FLOOR = 0.008;
/** RMS at or above this maps to full loudness (normal speech ~0.05–0.15, shouting ~0.25+). */
const LOUDNESS_CEILING = 0.35;

/**
 * @typedef {object} MicVolumeSample
 * @property {number} level Normalized loudness for this tick (0–1).
 * @property {number} rms Raw RMS amplitude (0–1-ish).
 * @property {number} elapsed Seconds elapsed since measurement started.
 */

/**
 * @typedef {object} MicVolumeScoreResult
 * @property {number} score Loudness score (0–100).
 * @property {number} averageLevel Mean normalized level across the window.
 * @property {number} peakLevel Peak normalized level in the window.
 * @property {number} averageRms Mean raw RMS across the window.
 * @property {number} peakRms Peak raw RMS in the window.
 * @property {number} durationSeconds Length of the sampling window.
 * @property {number} sampleCount Number of samples collected.
 */

class MicVolumeScoringService {
    constructor() {
        this.isMeasuring = false;
        this.subscribers = new Set();
        this._stream = null;
        this._audioContext = null;
        this._analyser = null;
        this._source = null;
        this._timeDomainData = null;
        this._sampleTimer = null;
        this._finishTimer = null;
        this._samples = [];
        this._currentLevel = 0;
        this._currentRms = 0;
        this._startedAtMs = 0;
        this._sessionResolve = null;
        this._sessionReject = null;
        this.lastError = null;
    }

    isSupported() {
        return !!(
            navigator.mediaDevices?.getUserMedia &&
            (window.AudioContext || window.webkitAudioContext)
        );
    }

    /** Normalized loudness of the most recent sample (0–1). */
    getCurrentLevel() {
        return this._currentLevel;
    }

    /** Raw RMS of the most recent sample. */
    getCurrentRms() {
        return this._currentRms;
    }

    /**
     * @param {(sample: MicVolumeSample) => void} listener
     * @returns {() => void} unsubscribe
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('micVolumeScoring.subscribe(listener): listener must be a function.');
        }
        this.subscribers.add(listener);
        listener(this._getLiveSample(0));
        return () => this.subscribers.delete(listener);
    }

    _getLiveSample(elapsedSeconds = 0) {
        return {
            level: this._currentLevel,
            rms: this._currentRms,
            elapsed: elapsedSeconds,
        };
    }

    _notifySubscribers(elapsedSeconds = 0) {
        const sample = this._getLiveSample(elapsedSeconds);
        this.subscribers.forEach(listener => {
            try {
                listener(sample);
            } catch (error) {
                console.warn('micVolumeScoring subscriber failed:', error);
            }
        });
    }

    _normalizeLevel(rms) {
        const gated = Math.max(0, rms - LOUDNESS_FLOOR);
        const range = LOUDNESS_CEILING - LOUDNESS_FLOOR;
        if (range <= 0) return 0;
        return Math.min(1, gated / range);
    }

    _readRms() {
        if (!this._analyser || !this._timeDomainData) return 0;

        this._analyser.getByteTimeDomainData(this._timeDomainData);
        let sumSquares = 0;
        for (let i = 0; i < this._timeDomainData.length; i += 1) {
            const centered = (this._timeDomainData[i] - 128) / 128;
            sumSquares += centered * centered;
        }
        return Math.sqrt(sumSquares / this._timeDomainData.length);
    }

    _scoreFromSamples(samples) {
        if (!samples.length) {
            return {
                score: 0,
                averageLevel: 0,
                peakLevel: 0,
                averageRms: 0,
                peakRms: 0,
                sampleCount: 0,
            };
        }

        let rmsSum = 0;
        let peakRms = 0;
        let levelSum = 0;
        let peakLevel = 0;

        samples.forEach(rms => {
            rmsSum += rms;
            peakRms = Math.max(peakRms, rms);
            const level = this._normalizeLevel(rms);
            levelSum += level;
            peakLevel = Math.max(peakLevel, level);
        });

        const averageRms = rmsSum / samples.length;
        const averageLevel = levelSum / samples.length;
        const blended = averageLevel * 0.75 + peakLevel * 0.25;
        const score = Math.round(Math.min(100, Math.max(0, blended * 100)));

        return {
            score,
            averageLevel,
            peakLevel,
            averageRms,
            peakRms,
            sampleCount: samples.length,
        };
    }

    async _startMic(options = {}) {
        if (this._stream) return;

        const audioConstraints = options.audioConstraints ?? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        };

        this._stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false,
        });

        const Ctx = window.AudioContext || window.webkitAudioContext;
        this._audioContext = new Ctx();
        if (this._audioContext.state === 'suspended') {
            await this._audioContext.resume();
        }

        this._analyser = this._audioContext.createAnalyser();
        this._analyser.fftSize = 2048;
        this._analyser.smoothingTimeConstant = 0.35;
        this._timeDomainData = new Uint8Array(this._analyser.fftSize);

        this._source = this._audioContext.createMediaStreamSource(this._stream);
        this._source.connect(this._analyser);
    }

    _stopMic() {
        if (this._sampleTimer != null) {
            clearInterval(this._sampleTimer);
            this._sampleTimer = null;
        }
        if (this._finishTimer != null) {
            clearTimeout(this._finishTimer);
            this._finishTimer = null;
        }

        this._source?.disconnect();
        this._source = null;
        this._analyser = null;
        this._timeDomainData = null;

        this._stream?.getTracks().forEach(track => track.stop());
        this._stream = null;

        if (this._audioContext) {
            this._audioContext.close().catch(() => {});
            this._audioContext = null;
        }
    }

    _finishMeasurement(durationSeconds) {
        if (!this.isMeasuring) return;

        this.isMeasuring = false;
        this._stopMic();

        const result = this._scoreFromSamples(this._samples);
        const payload = {
            ...result,
            durationSeconds,
        };

        this._samples = [];
        this._currentLevel = 0;
        this._currentRms = 0;

        if (this._sessionResolve) {
            const resolve = this._sessionResolve;
            this._sessionResolve = null;
            this._sessionReject = null;
            resolve(payload);
        }

        return payload;
    }

    /**
     * Sample microphone loudness for `durationSeconds` and resolve with a loudness score.
     *
     * @param {number} [durationSeconds=5]
     * @param {{ onSample?: (sample: MicVolumeSample) => void, audioConstraints?: MediaTrackConstraints }} [options]
     * @returns {Promise<MicVolumeScoreResult>}
     */
    async measureLoudness(durationSeconds = DEFAULT_DURATION_SECONDS, options = {}) {
        if (!this.isSupported()) {
            throw new Error('Microphone volume measurement is not supported in this browser.');
        }
        if (this.isMeasuring) {
            throw new Error('Microphone volume measurement is already active.');
        }

        const duration = Math.max(0, Number(durationSeconds) || 0);
        if (duration <= 0) {
            return {
                score: 0,
                averageLevel: 0,
                peakLevel: 0,
                averageRms: 0,
                peakRms: 0,
                durationSeconds: 0,
                sampleCount: 0,
            };
        }

        return new Promise((resolve, reject) => {
            this._sessionResolve = resolve;
            this._sessionReject = reject;
            this.isMeasuring = true;
            this.lastError = null;
            this._samples = [];
            this._currentLevel = 0;
            this._currentRms = 0;
            this._startedAtMs = Date.now();

            this._startMic(options)
                .then(() => {
                    const collectSample = () => {
                        const elapsed = (Date.now() - this._startedAtMs) / 1000;
                        const rms = this._readRms();
                        const level = this._normalizeLevel(rms);

                        this._currentRms = rms;
                        this._currentLevel = level;
                        this._samples.push(rms);

                        const sample = this._getLiveSample(elapsed);
                        this._notifySubscribers(elapsed);
                        if (typeof options.onSample === 'function') {
                            options.onSample(sample);
                        }
                    };

                    collectSample();
                    this._sampleTimer = setInterval(collectSample, SAMPLE_INTERVAL_MS);
                    this._finishTimer = setTimeout(() => {
                        this._finishMeasurement(duration);
                    }, duration * 1000);
                })
                .catch(error => {
                    this.isMeasuring = false;
                    this.lastError = error?.message || 'mic-access-denied';
                    this._stopMic();
                    this._samples = [];

                    const sessionReject = this._sessionReject;
                    this._sessionResolve = null;
                    this._sessionReject = null;
                    sessionReject(error);
                });
        });
    }

    /** Stop an active measurement early and return the score so far. */
    stopMeasuring() {
        if (!this.isMeasuring) return null;
        const elapsedSeconds = (Date.now() - this._startedAtMs) / 1000;
        return this._finishMeasurement(elapsedSeconds);
    }
}

const micVolumeScoring = new MicVolumeScoringService();

export default micVolumeScoring;
