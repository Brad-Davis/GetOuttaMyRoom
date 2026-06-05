import gsap from 'gsap';
import interactionService from "../utils/interactionService.js";
import effectsService from '../utils/effectsService.js';
import { restartGameFromBeginning } from '../utils/holdToRestart.js';
import audioService from '../utils/audioService.js';
import inventoryManager from '../utils/inventoryManager.js';

class TextOverlay {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.fullOverlay = document.getElementById('full-overlay');
        this.bottomOverlay = document.getElementById('bottom-overlay');
        this.windowOverlay = document.getElementById('window-overlay');
        this.dialogueOverlay = document.getElementById('dialogue-overlay');
        this.dialogueSpeaker = document.getElementById('dialogue-speaker');
        this.dialogueCountdown = document.getElementById('dialogue-countdown');
        this.dialogueBox = document.getElementById('dialogue-box');
        this.dialogueTriangle = document.getElementById('dialogue-triangle');
        this._dialogScrollTimeout = null;
        this._dialogLineClickHandler = null;
        this._dialogLineResolver = null;
        this._dialogMissClickBound = false;
        this._lastDialogShakeAt = 0;
        this._onDialogMissClick = this._handleDialogMissClick.bind(this);
        this.bottomText = '[Click on the CD to start]';
        this.fullText = '';
        this.isVisible = true;
        this._stopBlinkLoop = false;
        if (this.bottomOverlay) {
            this.bottomOverlay.textContent = this.bottomText;
        }
        this.blink('1');
        this.show("bottom");
        // this.showTextBox("HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX HELLO THIS IS MY FIRST TEXT BOX");
    }

    show(element) {
        this.isVisible = true;
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = '1';
        if (element === 'bottom') {
            this.bottomOverlay.style.display = 'block';
            this.windowOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
            this.dialogueOverlay.style.display = 'none';
        } else if (element === 'full') {
            this.fullOverlay.style.display = 'block';
            this.windowOverlay.style.display = 'none';
            this.bottomOverlay.style.display = 'none';
            this.dialogueOverlay.style.display = 'none';
        } else if (element === 'window') {
            this.windowOverlay.style.display = 'block';
            this.bottomOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
            this.dialogueOverlay.style.display = 'none';
        } else if (element === 'dialogue') {
            this.dialogueOverlay.style.display = 'block';
            this.bottomOverlay.style.display = 'none';
            this.fullOverlay.style.display = 'none';
            this.windowOverlay.style.display = 'none';
        }
    }

    hide() {
        this.isVisible = false;
        this.overlay.style.display = 'none';
        this.stopBlink();
    }

    stopBlink() {
        this._stopBlinkLoop = true;
    }

    blink(opacity) {
        if (this._stopBlinkLoop) return;
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = opacity;
        setTimeout(() => {
            if (!this.isVisible || this._stopBlinkLoop) return;
            this.overlay.style.opacity = opacity === '1' ? '0' : '1';
            this.blink(opacity === '1' ? '0' : '1');
        }, 1000);
    }

    showWindowOverlay(message, title, buttons, buttonFunctions) {
        interactionService.disable();
        this.windowOverlay.querySelector('#window-message').textContent = message;
        this.windowOverlay.querySelector('#window-title').textContent = title;
        this.windowOverlay.querySelector('#window-buttons').innerHTML = buttons.map(button => `<button>${button}</button>`).join('');
        setTimeout(() => {
            this.windowOverlay.querySelectorAll('#window-buttons button').forEach((button, index) => {
                button.addEventListener('click', () => buttonFunctions[index]());
            });
            this.show("window");
        }, 10);
        
    }
    
    closeWindowOverlay() {
        this.windowOverlay.style.display = 'none';
        interactionService.enable();
        // Restore bottom HUD; do not call hide() — that hides the entire #overlay and makes the UI look broken next to inventory.
        this.show('bottom');
    }

    showTextBox(message) {
        this.show('dialogue');
        this.dialogueBox.textContent = '';
        this.startTextScroll(message);
        this.dialogueOverlay.style.pointerEvents = 'auto';
        this._bindDialogMissClicks();
        const clickHandler = () => {
            this._cancelDialogScroll();
            this.dialogueBox.textContent = message;
            this._playDialogRevealSfx();
            this.dialogueOverlay.removeEventListener('click', clickHandler);
            this.showSolidTriangle();
        };
        this.dialogueOverlay.addEventListener('click', clickHandler);
    }

    startTextScroll(message) {
        this._cancelDialogScroll();
        let textLength = this.dialogueBox.textContent.length;
        this.showFlashingTriangle();
        if (textLength < message.length) {
            this.dialogueBox.textContent = message.substring(0, textLength + 1);
            this._dialogScrollTimeout = setTimeout(() => {
                this.startTextScroll(message);
            }, 20);
        } else {
            this.showSolidTriangle();
        }
    }

    _cancelDialogScroll() {
        if (this._dialogScrollTimeout != null) {
            clearTimeout(this._dialogScrollTimeout);
            this._dialogScrollTimeout = null;
        }
    }

    clearBottomOverlay() {
        this.bottomOverlay.textContent = '';
    }

    /** Blinking bottom HUD hint (same element as the opening CD prompt). */
    showBottomHint(message) {
        this._stopBlinkLoop = false;
        this.isVisible = true;
        if (this.bottomOverlay) {
            this.bottomOverlay.textContent = message;
        }
        this.show('bottom');
        this.blink('1');
    }

    hideBottomHint() {
        this.clearBottomOverlay();
        this.hide();
    }

    _playDialogRevealSfx() {
        effectsService.playSfx('dialogReveal', { volume: 0.55 });
    }

    _isDialogueAwaitingClick() {
        if (!this.dialogueOverlay || this.dialogueOverlay.style.display === 'none') {
            return false;
        }
        return this.dialogueOverlay.style.pointerEvents === 'auto';
    }

    _bindDialogMissClicks() {
        if (this._dialogMissClickBound) return;
        this._dialogMissClickBound = true;
        document.addEventListener('pointerdown', this._onDialogMissClick, true);
    }

    _unbindDialogMissClicks() {
        if (!this._dialogMissClickBound) return;
        this._dialogMissClickBound = false;
        document.removeEventListener('pointerdown', this._onDialogMissClick, true);
    }

    _handleDialogMissClick(event) {
        if (!this._isDialogueAwaitingClick()) return;
        if (this.dialogueOverlay.contains(event.target)) return;
        this._shakeDialogueBox();
    }

    _shakeDialogueBox() {
        const el = this.dialogueOverlay;
        if (!el) return;
        const now = performance.now();
        if (now - this._lastDialogShakeAt < 280) return;
        this._lastDialogShakeAt = now;
        el.classList.remove('dialogue-nudge');
        void el.offsetWidth;
        el.classList.add('dialogue-nudge');
    }

    /**
     * One dialog line: typewriter, click to skip typing, click again to continue.
     * @returns {Promise<void>}
     */
    runDialogLine({ speaker = '', text = '' }) {
        return new Promise((resolve) => {
            this._dialogLineResolver = resolve;
            this.show('dialogue');
            if (this.dialogueSpeaker) {
                this.dialogueSpeaker.textContent = speaker;
            }
            this._cancelDialogScroll();
            this.dialogueBox.textContent = '';

            if (this._dialogLineClickHandler) {
                this.dialogueOverlay.removeEventListener('click', this._dialogLineClickHandler);
                this._dialogLineClickHandler = null;
            }

            let fullTextVisible = false;
            const onClick = () => {
                if (!fullTextVisible) {
                    this._cancelDialogScroll();
                    this.dialogueBox.textContent = text;
                    this._playDialogRevealSfx();
                    this.showSolidTriangle();
                    fullTextVisible = true;
                    return;
                }
                this.dialogueOverlay.removeEventListener('click', onClick);
                this._dialogLineClickHandler = null;
                this._dialogLineResolver = null;
                resolve();
            };

            this._dialogLineClickHandler = onClick;
            this.dialogueOverlay.addEventListener('click', onClick);
            this.dialogueOverlay.style.pointerEvents = 'auto';
            this._bindDialogMissClicks();

            const onTypingComplete = () => {
                fullTextVisible = true;
                this.showSolidTriangle();
            };

            if (!text) {
                onTypingComplete();
                return;
            }

            this._startDialogTypewriter(text, onTypingComplete);
        });
    }

    _startDialogTypewriter(fullText, onComplete) {
        let visible = 0;
        const step = () => {
            visible += 1;
            if (visible > fullText.length) {
                onComplete();
                return;
            }
            this.dialogueBox.textContent = fullText.substring(0, visible);
            this.showFlashingTriangle();
            this._dialogScrollTimeout = setTimeout(step, 20);
        };
        step();
    }

    endDialog() {
        this._unbindDialogMissClicks();
        if (this.dialogueOverlay) {
            this.dialogueOverlay.classList.remove('dialogue-nudge');
        }
        this._cancelDialogScroll();
        if (this._dialogLineClickHandler) {
            this.dialogueOverlay.removeEventListener('click', this._dialogLineClickHandler);
            this._dialogLineClickHandler = null;
        }
        if (this._dialogLineResolver) {
            const resolve = this._dialogLineResolver;
            this._dialogLineResolver = null;
            resolve();
        }
        if (this.dialogueSpeaker) {
            this.dialogueSpeaker.textContent = '';
        }
        this.hideDialogueCountdown();
        this.dialogueBox.textContent = '';
        this.show('bottom');
    }

    showDialogueCountdown(secondsRemaining) {
        if (!this.dialogueCountdown) return;
        const safeSeconds = Math.max(0, Math.ceil(Number(secondsRemaining) || 0));
        this.dialogueCountdown.textContent = `Time left: ${safeSeconds}s`;
        this.dialogueCountdown.style.display = 'block';
    }

    hideDialogueCountdown() {
        if (!this.dialogueCountdown) return;
        this.dialogueCountdown.style.display = 'none';
        this.dialogueCountdown.textContent = '';
    }

    showFlashingTriangle() {
        this.dialogueTriangle.classList.add('flashing');
    }

    showSolidTriangle() {
        this.dialogueTriangle.classList.remove('flashing');
    }

    /**
     * Full-screen end message (kitchen finale).
     * @param {string} [message]
     * @param {{ duration?: number }} [options]
     */
    showEndCredits(message = 'Thank you for playing.', options = {}) {
        const el = document.getElementById('end-credits-overlay');
        if (!el) return;

        const duration = options.duration ?? 2.8;
        el.textContent = message;
        el.hidden = false;
        el.style.opacity = '0';
        gsap.killTweensOf(el);
        gsap.to(el, {
            opacity: 1,
            duration,
            ease: 'power2.inOut',
        });
    }

    /**
     * Kitchen finale: slow fade to black, thank-you text only, then full game restart.
     * @param {string} [message]
     * @param {{ fadeDuration?: number, holdBeforeRestartS?: number, creditsFadeDelay?: number }} [options]
     */
    playKitchenEndingFinale(
        message = 'Thank you for playing.',
        {
            fadeDuration = 5.5,
            holdBeforeRestartS = 30,
            creditsFadeDelay = 1.8,
        } = {}
    ) {
        if (this._kitchenEndingFinaleActive) return;
        this._kitchenEndingFinaleActive = true;
        audioService.holdMusicDuringEndingFinale();
        inventoryManager.hideGameplayHud();

        const fadeEl = document.getElementById('end-fade-overlay');
        const creditsEl = document.getElementById('end-credits-overlay');
        if (!fadeEl || !creditsEl) return;

        fadeEl.hidden = false;
        fadeEl.style.opacity = '0';
        gsap.killTweensOf(fadeEl);
        gsap.to(fadeEl, {
            opacity: 1,
            duration: fadeDuration,
            ease: 'power2.inOut',
        });

        creditsEl.textContent = message;
        creditsEl.hidden = false;
        creditsEl.style.opacity = '0';
        gsap.killTweensOf(creditsEl);
        gsap.to(creditsEl, {
            opacity: 1,
            duration: Math.max(0.5, fadeDuration - creditsFadeDelay),
            delay: creditsFadeDelay,
            ease: 'power2.inOut',
        });

        gsap.delayedCall(fadeDuration + holdBeforeRestartS, () => {
            restartGameFromBeginning();
        });
    }
}

const textOverlay = new TextOverlay();
export default textOverlay;