import interactionService from "../utils/interactionService.js";

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
        const clickHandler = () => {
            this._cancelDialogScroll();
            this.dialogueBox.textContent = message;
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
}

const textOverlay = new TextOverlay();
export default textOverlay;