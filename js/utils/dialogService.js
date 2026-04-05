import textOverlay from '../UI/textOverlay.js';
import interactionService from './interactionService.js';
import { DIALOG_SCRIPTS } from '../data/dialogScripts.js';

class DialogService {
    constructor() {
        this.active = false;
    }

    isActive() {
        return this.active;
    }

    /**
     * Plays a script by id. Disables scene clicks until finished.
     * @returns {Promise<void>}
     */
    async start(scriptId) {
        if (this.active) {
            return;
        }
        const script = DIALOG_SCRIPTS[scriptId];
        if (!script || !Array.isArray(script.lines) || script.lines.length === 0) {
            console.warn(`DialogService: unknown or empty script "${scriptId}"`);
            return;
        }

        this.active = true;
        interactionService.disable();

        try {
            for (const line of script.lines) {
                await textOverlay.runDialogLine({
                    speaker: line.speaker ?? '',
                    text: line.text ?? '',
                });
            }
        } finally {
            textOverlay.endDialog();
            interactionService.enable();
            this.active = false;
        }
    }
}

const dialogService = new DialogService();
export default dialogService;
