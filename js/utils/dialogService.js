import textOverlay from '../UI/textOverlay.js';
import interactionService from './interactionService.js';
import { DIALOG_SCRIPTS } from '../data/dialogScripts.js';

class DialogService {
    constructor() {
        this.active = false;
        this.liveDialogActive = false;
        this._dialogRunId = 0;
    }

    isActive() {
        return this.active;
    }

    /**
     * Plays a script by id. Disables scene clicks until finished.
     * @returns {Promise<void>}
     */
    async start(scriptId) {
        this.clearDialog();
        const script = DIALOG_SCRIPTS[scriptId];
        if (!script || !Array.isArray(script.lines) || script.lines.length === 0) {
            console.warn(`DialogService: unknown or empty script "${scriptId}"`);
            return;
        }

        const runId = ++this._dialogRunId;
        this.active = true;
        interactionService.disable();

        try {
            for (const line of script.lines) {
                if (runId !== this._dialogRunId) return;
                await textOverlay.runDialogLine({
                    speaker: line.speaker ?? '',
                    text: line.text ?? '',
                });
            }
        } finally {
            if (runId === this._dialogRunId) {
                textOverlay.endDialog();
                interactionService.enable();
                this.active = false;
            }
        }
    }

    /**
     * Plays ad-hoc dialog lines without requiring a script id.
     * @param {Array<{speaker?: string, text?: string}>} lines
     * @returns {Promise<void>}
     */
    async runLines(lines = []) {
        this.clearDialog();
        if (!Array.isArray(lines) || lines.length === 0) {
            return;
        }

        const runId = ++this._dialogRunId;
        this.active = true;
        interactionService.disable();

        try {
            for (const line of lines) {
                if (runId !== this._dialogRunId) return;
                await textOverlay.runDialogLine({
                    speaker: line?.speaker ?? '',
                    text: line?.text ?? '',
                });
            }
        } finally {
            if (runId === this._dialogRunId) {
                textOverlay.endDialog();
                interactionService.enable();
                this.active = false;
            }
        }
    }

    clearDialog() {
        this._dialogRunId += 1;
        textOverlay.endDialog();
        interactionService.enable();
        this.active = false;
        this.liveDialogActive = false;
    }

    /**
     * Opens a non-blocking dialogue box for live updates (e.g. scream meter).
     * @param {{ speaker?: string, text?: string, secondsRemaining?: number }} payload
     * @returns {boolean}
     */
    startLiveDialog(payload = {}) {
        this.clearDialog();
        const speaker = payload.speaker ?? '';
        const text = payload.text ?? '';
        const secondsRemaining = payload.secondsRemaining;

        this.liveDialogActive = true;
        interactionService.disable();
        textOverlay.show('dialogue');
        if (textOverlay.dialogueSpeaker) {
            textOverlay.dialogueSpeaker.textContent = speaker;
        }
        if (textOverlay.dialogueBox) {
            textOverlay.dialogueBox.textContent = text;
        }
        if (textOverlay.dialogueOverlay) {
            textOverlay.dialogueOverlay.style.pointerEvents = 'none';
        }
        textOverlay.showSolidTriangle();
        if (Number.isFinite(secondsRemaining)) {
            textOverlay.showDialogueCountdown(secondsRemaining);
        } else {
            textOverlay.hideDialogueCountdown();
        }
        return true;
    }

    /**
     * Updates the currently active live dialogue content.
     * @param {{ speaker?: string, text?: string, secondsRemaining?: number }} payload
     */
    updateLiveDialog(payload = {}) {
        if (!this.liveDialogActive) return;
        const { speaker, text, secondsRemaining } = payload;
        if (speaker != null && textOverlay.dialogueSpeaker) {
            textOverlay.dialogueSpeaker.textContent = speaker;
        }
        if (text != null && textOverlay.dialogueBox) {
            textOverlay.dialogueBox.textContent = text;
        }
        if (Number.isFinite(secondsRemaining)) {
            textOverlay.showDialogueCountdown(secondsRemaining);
        }
    }

    /**
     * Closes the active live dialogue and restores controls.
     */
    endLiveDialog() {
        if (!this.liveDialogActive) return;
        textOverlay.endDialog();
        interactionService.enable();
        this.liveDialogActive = false;
    }
}

const dialogService = new DialogService();
export default dialogService;
