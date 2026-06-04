import interactionService from '../utils/interactionService.js';
import cameraService from '../utils/cameraPresets.js';
import dialogService from '../utils/dialogService.js';
import voiceRecognition from '../services/voiceRecognition.js';

/** Set true when the speak UI should appear again. */
const SPEAK_BUTTON_ENABLED = false;

class SpeakButtonManager {
  constructor() {
    this.camera = null;
    this.speakButtonEl = document.getElementById('speakButton');
    this.disabled = true;
    this._listenersAttached = false;
    this._onSpeak = null;
    this._handleClick = () => this.onClick();
    if (this.speakButtonEl) {
      this.hideSpeakButton();
    }
    this.atWindow = false;
    /** While true, per-frame updateVisibility keeps the button hidden (e.g. during mic listen). */
    this._listening = false;
  }

  /**
   * Wire camera + optional click handler. Safe to call again after `dispose()`.
   */
  init(camera, onSpeak) {
    this.camera = camera;

    if (this.speakButtonEl && !this._listenersAttached) {
      this.speakButtonEl.addEventListener('click', this._handleClick);
      this._listenersAttached = true;
    }
    this.hideSpeakButton();
  }

  setOnSpeak(onSpeak) {
    this._onSpeak = typeof onSpeak === 'function' ? onSpeak : null;
  }

  dispose() {
    if (this.speakButtonEl && this._listenersAttached) {
      this.speakButtonEl.removeEventListener('click', this._handleClick);
      this._listenersAttached = false;
    }
    this.camera = null;
    this._onSpeak = null;
    this._listening = false;
    this.hideSpeakButton();
  }

  /** Call each frame — speak control at default room view or RIGHT_WINDOW_VIEW. */
  updateVisibility() {
    if (!SPEAK_BUTTON_ENABLED) {
      this.hideSpeakButton();
      return;
    }
    if (!this.speakButtonEl || !this.camera) return;
    if (this.disabled || this._listening) {
      this.hideSpeakButton();
      return;
    }
    this.atWindow = cameraService.isAtRightWindowView(this.camera);
    const show =
      interactionService.checkEnabled() &&
      (cameraService.isAtInteriorDefault(this.camera) || this.atWindow);
    if (show) {
      this.showSpeakButton();
    } else {
      this.hideSpeakButton();
    }
  }

  showSpeakButton() {
    if (!SPEAK_BUTTON_ENABLED || !this.speakButtonEl) return;
    this.speakButtonEl.style.display = 'inline-flex';
  }

  hideSpeakButton() {
    if (!this.speakButtonEl) return;
    this.speakButtonEl.style.display = 'none';
  }

  enable() {
    if (!SPEAK_BUTTON_ENABLED) return;
    this.disabled = false;
    this.updateVisibility();
  }

  disable() {
    this.disabled = true;
    this.updateVisibility();
  }

  async onClick() {
    if (this.disabled || this._listening) return;

    this._listening = true;
    this.hideSpeakButton();

    try {
        this.startThirties();
        return;

        let statement = await voiceRecognition.getAndPrintStatement(5);
        statement = statement.toLowerCase();

        if (!this.atWindow) {
            if (statement === "turn left" || statement === "look left") {
                cameraService.turnCamera(Math.PI);
                dialogService.clearDialog();
                window.gameEngine?.getThirties?.()?.runThirtiesHello();
            } else if (statement === "turn right" || statement === "look right") {
                cameraService.turnCamera(-Math.PI);
                dialogService.clearDialog();
                window.gameEngine?.getThirties?.()?.runThirtiesHello();
            } else {
                dialogService.runLines([{
                    speaker: 'Inner Monologue',
                    text: `You speak to the void of your room and it ignores you.`,
                }]);
            }
        } else {
            //AT WINDOW!!
        }
    } catch (error) {
        console.warn('[Speak button] failed:', error);
    } finally {
        this._listening = false;
        this.updateVisibility();
    }
  }

  startThirties() {
    cameraService.turnCamera(Math.PI);
    dialogService.clearDialog();
    setTimeout(() => {
        const thirties = window.gameEngine?.getThirties?.();
        thirties?.runThirtiesHello();
    }, 1000)
  }
}

const speakButtonManager = new SpeakButtonManager();
export default speakButtonManager;
