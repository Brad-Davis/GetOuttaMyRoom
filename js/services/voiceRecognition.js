import textOverlay from '../UI/textOverlay.js';

class VoiceRecognitionService {
    constructor() {
        this.RecognitionClass =
            window.SpeechRecognition || window.webkitSpeechRecognition || null;
        this.recognition = null;
        this.isListening = false;
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.subscribers = new Set();
        this.lastError = null;
        this.sessionResolve = null;
        this.sessionReject = null;
    }

    isSupported() {
        return !!this.RecognitionClass;
    }

    getTranscript() {
        return {
            final: this.finalTranscript.trim(),
            interim: this.interimTranscript.trim(),
            combined: `${this.finalTranscript} ${this.interimTranscript}`.trim(),
        };
    }

    resetTranscript() {
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.notifySubscribers();
    }

    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('voiceRecognition.subscribe(listener): listener must be a function.');
        }
        this.subscribers.add(listener);
        listener(this.getTranscript());
        return () => this.subscribers.delete(listener);
    }

    notifySubscribers() {
        const transcript = this.getTranscript();
        this.subscribers.forEach(listener => {
            try {
                listener(transcript);
            } catch (error) {
                console.warn('voiceRecognition subscriber failed:', error);
            }
        });
    }

    createRecognitionInstance(options = {}) {
        if (!this.isSupported()) {
            throw new Error('Speech recognition is not supported in this browser.');
        }

        if (this.recognition) {
            this.recognition.onstart = null;
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onend = null;
        }

        const recognition = new this.RecognitionClass();
        recognition.lang = options.lang || 'en-US';
        recognition.continuous = options.continuous ?? true;
        recognition.interimResults = options.interimResults ?? true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            this.isListening = true;
            this.lastError = null;
            if (typeof options.onStart === 'function') options.onStart();
        };

        recognition.onresult = event => {
            let interimChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const text = event.results[i][0]?.transcript || '';
                if (!text) continue;
                if (event.results[i].isFinal) {
                    this.finalTranscript = `${this.finalTranscript} ${text}`.trim();
                } else {
                    interimChunk += text;
                }
            }

            this.interimTranscript = interimChunk.trim();
            const transcript = this.getTranscript();
            this.notifySubscribers();
            if (typeof options.onResult === 'function') options.onResult(transcript, event);
        };

        recognition.onerror = event => {
            this.lastError = event?.error || 'unknown-error';
            if (typeof options.onError === 'function') options.onError(event);
            if (this.sessionReject) {
                const reject = this.sessionReject;
                this.sessionResolve = null;
                this.sessionReject = null;
                reject(new Error(`Voice recognition error: ${this.lastError}`));
            }
        };

        recognition.onend = () => {
            this.isListening = false;
            if (typeof options.onEnd === 'function') options.onEnd(this.getTranscript());
            if (this.sessionResolve) {
                const resolve = this.sessionResolve;
                const transcript = this.getTranscript().combined;
                this.sessionResolve = null;
                this.sessionReject = null;
                resolve(transcript);
            }
        };

        this.recognition = recognition;
    }

    startListening(options = {}) {
        if (!this.isSupported()) {
            throw new Error('Speech recognition is not supported in this browser.');
        }
        if (this.isListening) {
            return this.getTranscript();
        }
        if (!options.keepPreviousText) {
            this.resetTranscript();
        }
        this.createRecognitionInstance(options);
        this.recognition.start();
        return this.getTranscript();
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;
        this.recognition.stop();
    }

    abortListening() {
        if (!this.recognition) return;
        this.recognition.abort();
        this.isListening = false;
    }

    listenOnce(options = {}) {
        if (this.isListening) {
            return Promise.reject(new Error('Voice recognition is already active.'));
        }

        return new Promise((resolve, reject) => {
            this.sessionResolve = resolve;
            this.sessionReject = reject;
            try {
                this.startListening({
                    ...options,
                    continuous: false,
                    interimResults: options.interimResults ?? false,
                });
            } catch (error) {
                this.sessionResolve = null;
                this.sessionReject = null;
                reject(error);
            }
        });
    }

    getAndPrintStatement(lengthOfTime = 10, onResult) {
        return new Promise((resolve, reject) => {
            if (!this.isSupported()) {
                reject(new Error('Speech recognition is not supported in this browser.'));
                return;
            }

            if (this.isListening) {
                this.stopListening();
            }

            const durationMs = Math.max(0, Number(lengthOfTime) || 0) * 1000;
            const durationSeconds = Math.max(0, Number(lengthOfTime) || 0);
            let resolved = false;
            let countdownInterval = null;

            if (textOverlay?.dialogueSpeaker) {
                textOverlay.dialogueSpeaker.textContent = 'YOU';
            }
            textOverlay.show('dialogue');
            textOverlay.dialogueBox.textContent = '';
            textOverlay.showFlashingTriangle();
            textOverlay.showDialogueCountdown(durationSeconds);

            const clearCountdown = () => {
                if (countdownInterval != null) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                textOverlay.hideDialogueCountdown();
            };

            const finish = () => {
                if (resolved) return;
                resolved = true;
                clearCountdown();
                const finalText = this.getTranscript().combined;
                textOverlay.dialogueBox.textContent = finalText || '...';
                textOverlay.showSolidTriangle();
                resolve(finalText);
            };

            try {
                this.startListening({
                    continuous: true,
                    interimResults: true,
                    onResult: transcript => {
                        const liveText = transcript.combined || '...';
                        textOverlay.dialogueBox.textContent = liveText;
                        if (typeof onResult === 'function') {
                            onResult(transcript);
                        }
                    },
                    onError: event => {
                        if (resolved) return;
                        resolved = true;
                        clearCountdown();
                        textOverlay.dialogueBox.textContent = '';
                        textOverlay.showSolidTriangle();
                        reject(
                            new Error(
                                `Voice recognition error: ${event?.error || 'unknown-error'}`
                            )
                        );
                    },
                });
            } catch (error) {
                reject(error);
                return;
            }

            const startTimeMs = Date.now();
            countdownInterval = setInterval(() => {
                const elapsedSeconds = (Date.now() - startTimeMs) / 1000;
                const secondsLeft = Math.max(0, durationSeconds - elapsedSeconds);
                textOverlay.showDialogueCountdown(secondsLeft);
            }, 250);

            setTimeout(() => {
                this.stopListening();
                finish();
            }, durationMs);
        });
    }
}

const voiceRecognition = new VoiceRecognitionService();

export default voiceRecognition;
