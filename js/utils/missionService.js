/**
 * Drives the #mission-hud UI: current objective text and a checkbox that
 * reflects completion (unchecked → checked via {@link completeCurrentMission}).
 */
const STRIKING = 'mission-text--striking';
const STRUCK = 'mission-text--struck';
const CHECK_POP = 'mission-checkbox--pop';
const HUD_REWARD = 'mission-hud--reward';

class MissionService {
    constructor() {
        this.hud = document.getElementById('mission-hud');
        this.checkbox = document.getElementById('mission-checkbox');
        this.textEl = document.getElementById('mission-text');
        /** @type {{ description: string, completed: boolean } | null} */
        this.currentMission = null;
        this._strikeAnimHandler = null;
    }

    /**
     * @param {string | { description?: string, label?: string, completed?: boolean }} mission
     */
    setCurrentMission(mission) {
        const description =
            typeof mission === 'string'
                ? mission
                : (mission?.description ?? mission?.label ?? '').trim();

        if (!description) {
            this.clearMission();
            return;
        }

        const completed =
            typeof mission === 'object' && mission != null && Boolean(mission.completed);

        this.currentMission = { description, completed };
        this._syncDom();
    }

    getCurrentMission() {
        return this.currentMission;
    }

    /** Marks the current mission complete in the UI (checkbox checked). */
    completeCurrentMission() {
        if (!this.currentMission) return;
        const wasComplete = this.currentMission.completed;
        this.currentMission.completed = true;
        if (this.checkbox) {
            this.checkbox.checked = true;
        }
        if (wasComplete) {
            this._setStruckVisuals();
            return;
        }
        this._playCompletionAnimation();
    }

    /** Unchecks the box without removing the mission text. */
    resetMissionCompletion() {
        if (!this.currentMission) return;
        this.currentMission.completed = false;
        if (this.checkbox) {
            this.checkbox.checked = false;
        }
        this._clearMissionTextClasses();
    }

    clearMission() {
        this.currentMission = null;
        if (this.checkbox) {
            this.checkbox.checked = false;
        }
        if (this.textEl) {
            this.textEl.textContent = '';
        }
        this._clearMissionTextClasses();
        if (this.hud) {
            this.hud.classList.remove(HUD_REWARD);
            this.hud.hidden = true;
        }
    }

    _clearMissionTextClasses() {
        if (this.textEl) {
            if (this._strikeAnimHandler) {
                this.textEl.removeEventListener('animationend', this._strikeAnimHandler);
                this._strikeAnimHandler = null;
            }
            this.textEl.classList.remove(STRIKING, STRUCK);
        }
        if (this.checkbox) {
            this.checkbox.classList.remove(CHECK_POP);
        }
    }

    _setStruckVisuals() {
        if (!this.textEl) return;
        this.textEl.classList.remove(STRIKING);
        this.textEl.classList.add(STRUCK);
    }

    _playCompletionAnimation() {
        if (this.hud) {
            this.hud.classList.remove(HUD_REWARD);
            void this.hud.offsetWidth;
            this.hud.classList.add(HUD_REWARD);
            const doneGlow = () => this.hud?.classList.remove(HUD_REWARD);
            this.hud.addEventListener('animationend', doneGlow, { once: true });
        }

        if (this.checkbox) {
            this.checkbox.classList.remove(CHECK_POP);
            void this.checkbox.offsetWidth;
            this.checkbox.classList.add(CHECK_POP);
        }

        if (!this.textEl) return;
        if (this._strikeAnimHandler) {
            this.textEl.removeEventListener('animationend', this._strikeAnimHandler);
            this._strikeAnimHandler = null;
        }
        this.textEl.classList.remove(STRUCK, STRIKING);
        void this.textEl.offsetWidth;
        this.textEl.classList.add(STRIKING);

        this._strikeAnimHandler = (e) => {
            if (e.animationName !== 'missionStrikeThrough') return;
            this.textEl?.classList.remove(STRIKING);
            this.textEl?.classList.add(STRUCK);
            this.textEl?.removeEventListener('animationend', this._strikeAnimHandler);
            this._strikeAnimHandler = null;
        };
        this.textEl.addEventListener('animationend', this._strikeAnimHandler);
    }

    _syncDom() {
        if (!this.hud || !this.textEl || !this.checkbox) return;

        if (this._strikeAnimHandler) {
            this.textEl.removeEventListener('animationend', this._strikeAnimHandler);
            this._strikeAnimHandler = null;
        }

        this.textEl.textContent = this.currentMission.description;
        this.checkbox.checked = this.currentMission.completed;
        this.textEl.classList.remove(STRIKING);
        if (this.currentMission.completed) {
            this.textEl.classList.add(STRUCK);
        } else {
            this.textEl.classList.remove(STRUCK);
            this.hud.classList.remove(HUD_REWARD);
            this.checkbox.classList.remove(CHECK_POP);
        }
        this.hud.hidden = false;
    }
}

const missionService = new MissionService();
export default missionService;
