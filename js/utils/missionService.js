/**
 * Drives the #mission-hud UI: one or more objectives, each with a checkbox
 * (unchecked → checked via {@link completeCurrentMission} / {@link completeMissionAtIndex}).
 */
const STRIKING = 'mission-text--striking';
const STRUCK = 'mission-text--struck';
const CHECK_POP = 'mission-checkbox--pop';
const HUD_REWARD = 'mission-hud--reward';

/** @typedef {{ description: string, completed: boolean }} MissionEntry */

class MissionService {
    constructor() {
        this.hud = document.getElementById('mission-hud');
        this.missionListEl = document.getElementById('mission-list');
        /** @type {MissionEntry[]} */
        this.missions = [];
        /** @type {Map<number, (e: AnimationEvent) => void>} */
        this._strikeAnimHandlers = new Map();
    }

    /**
     * @param {string | { description?: string, label?: string, completed?: boolean } | Array<string | { description?: string, label?: string, completed?: boolean }>} mission
     * One string/object sets a single objective. An array sets multiple at once (replaces the list).
     */
    setCurrentMission(mission) {
        const normalized = this._normalizeMissions(mission);
        if (normalized.length === 0) {
            this.clearMission();
            return;
        }
        this._detachStrikeListeners();
        this.missions = normalized;
        this._syncDom();
    }

    /**
     * @param {unknown} mission
     * @returns {MissionEntry[]}
     */
    _normalizeMissions(mission) {
        if (mission == null) return [];
        if (Array.isArray(mission)) {
            return mission.map((m) => this._normalizeOne(m)).filter(Boolean);
        }
        const one = this._normalizeOne(mission);
        return one ? [one] : [];
    }

    /**
     * @param {unknown} entry
     * @returns {MissionEntry | null}
     */
    _normalizeOne(entry) {
        if (typeof entry === 'string') {
            const description = entry.trim();
            return description ? { description, completed: false } : null;
        }
        if (typeof entry === 'object' && entry != null) {
            const description = String(
                /** @type {{ description?: string, label?: string }} */ (entry).description ??
                    /** @type {{ label?: string }} */ (entry).label ??
                    ''
            ).trim();
            if (!description) return null;
            const completed = Boolean(
                /** @type {{ completed?: boolean }} */ (entry).completed
            );
            return { description, completed };
        }
        return null;
    }

    /** @returns {MissionEntry | null} First objective, or null (legacy single-mission shape). */
    getCurrentMission() {
        return this.missions[0] ?? null;
    }

    /** @returns {MissionEntry[]} Copy of all objectives. */
    getMissions() {
        return this.missions.map((m) => ({ ...m }));
    }

    /**
     * @param {string} needle Case-insensitive substring of {@link MissionEntry.description}.
     * @param {{ onlyIncomplete?: boolean }} [options] When true, skip completed rows.
     * @returns {number} Mission index, or -1.
     */
    findMissionIndexContaining(needle, options = {}) {
        const onlyIncomplete = Boolean(options.onlyIncomplete);
        const n = String(needle).trim().toLowerCase();
        if (!n) return -1;
        for (let i = 0; i < this.missions.length; i++) {
            const m = this.missions[i];
            if (onlyIncomplete && m.completed) continue;
            if (m.description.toLowerCase().includes(n)) return i;
        }
        return -1;
    }

    /**
     * @param {string} needle
     * @param {{ onlyIncomplete?: boolean }} [options]
     */
    hasMissionContaining(needle, options = {}) {
        return this.findMissionIndexContaining(needle, options) !== -1;
    }

    /**
     * Completes the first mission whose description contains `phrase` (case-insensitive).
     * @param {string} phrase Substring to match.
     * @param {{ onlyIncomplete?: boolean }} [options] Defaults to only incomplete missions; set `onlyIncomplete: false` to allow re-running completion UI on an already-complete row.
     * @returns {boolean} True if a matching mission was found and {@link completeMissionAtIndex} ran.
     */
    completeMissionContaining(phrase, options = {}) {
        const { onlyIncomplete = true } = options;
        const idx = this.findMissionIndexContaining(phrase, { onlyIncomplete });
        if (idx === -1) return false;
        this.completeMissionAtIndex(idx);
        return true;
    }

    /**
     * Marks the first incomplete mission complete (LinkedIn flow with one row).
     * Use {@link completeMissionAtIndex} when several are active and order matters.
     */
    completeCurrentMission() {
        const i = this.missions.findIndex((m) => !m.completed);
        if (i === -1) return;
        this.completeMissionAtIndex(i);
    }

    /**
     * @param {number} index
     */
    completeMissionAtIndex(index) {
        const m = this.missions[index];
        if (!m) return;
        const wasComplete = m.completed;
        m.completed = true;
        const row = this.missionListEl?.children[index];
        const checkbox = row?.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = true;
        }
        if (wasComplete) {
            this._setStruckVisualsForRow(index);
            return;
        }
        this._playCompletionAnimation(index);
    }

    /** Unchecks all missions without removing text. */
    resetMissionCompletion() {
        if (this.missions.length === 0) return;
        this.missions.forEach((m) => {
            m.completed = false;
        });
        this._syncDom();
    }

    clearMission() {
        this._detachStrikeListeners();
        this.missions = [];
        if (this.missionListEl) {
            this.missionListEl.innerHTML = '';
        }
        if (this.hud) {
            this.hud.classList.remove(HUD_REWARD);
            this.hud.hidden = true;
        }
    }

    _detachStrikeListeners() {
        this._strikeAnimHandlers.forEach((handler, index) => {
            const row = this.missionListEl?.children[index];
            const textEl = row?.querySelector('.mission-text');
            textEl?.removeEventListener('animationend', handler);
        });
        this._strikeAnimHandlers.clear();
    }

    _clearMissionTextClasses() {
        this._detachStrikeListeners();
        if (!this.missionListEl) return;
        this.missionListEl.querySelectorAll('.mission-text').forEach((el) => {
            el.classList.remove(STRIKING, STRUCK);
        });
        this.missionListEl.querySelectorAll('input[type="checkbox"]').forEach((el) => {
            el.classList.remove(CHECK_POP);
        });
    }

    /**
     * @param {number} index
     */
    _setStruckVisualsForRow(index) {
        const row = this.missionListEl?.children[index];
        const textEl = row?.querySelector('.mission-text');
        if (!textEl) return;
        textEl.classList.remove(STRIKING);
        textEl.classList.add(STRUCK);
    }

    /**
     * @param {number} index
     */
    _playCompletionAnimation(index) {
        if (this.hud) {
            this.hud.classList.remove(HUD_REWARD);
            void this.hud.offsetWidth;
            this.hud.classList.add(HUD_REWARD);
            const doneGlow = () => this.hud?.classList.remove(HUD_REWARD);
            this.hud.addEventListener('animationend', doneGlow, { once: true });
        }

        const row = this.missionListEl?.children[index];
        const checkbox = row?.querySelector('input[type="checkbox"]');
        const textEl = row?.querySelector('.mission-text');

        if (checkbox) {
            checkbox.classList.remove(CHECK_POP);
            void checkbox.offsetWidth;
            checkbox.classList.add(CHECK_POP);
        }

        if (!textEl) return;

        const prev = this._strikeAnimHandlers.get(index);
        if (prev) {
            textEl.removeEventListener('animationend', prev);
            this._strikeAnimHandlers.delete(index);
        }
        textEl.classList.remove(STRUCK, STRIKING);
        void textEl.offsetWidth;
        textEl.classList.add(STRIKING);

        const handler = (e) => {
            if (e.animationName !== 'missionStrikeThrough') return;
            textEl.classList.remove(STRIKING);
            textEl.classList.add(STRUCK);
            textEl.removeEventListener('animationend', handler);
            this._strikeAnimHandlers.delete(index);
        };
        this._strikeAnimHandlers.set(index, handler);
        textEl.addEventListener('animationend', handler);
    }

    _syncDom() {
        if (!this.hud || !this.missionListEl) return;

        this._detachStrikeListeners();
        this.missionListEl.innerHTML = '';

        this.missions.forEach((m) => {
            const label = document.createElement('label');
            label.className = 'mission-row';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'mission-checkbox';
            cb.disabled = true;
            cb.tabIndex = -1;
            cb.setAttribute('aria-readonly', 'true');
            cb.checked = m.completed;
            const span = document.createElement('span');
            span.className = 'mission-text';
            span.textContent = m.description;
            label.appendChild(cb);
            label.appendChild(span);
            this.missionListEl.appendChild(label);

            span.classList.remove(STRIKING);
            if (m.completed) {
                span.classList.add(STRUCK);
            } else {
                span.classList.remove(STRUCK);
            }
        });

        if (this.missions.length === 0) {
            this.hud.classList.remove(HUD_REWARD);
            this.hud.hidden = true;
            return;
        }

        this.missionListEl.querySelectorAll('input.mission-checkbox:not(:checked)').forEach((el) => {
            el.classList.remove(CHECK_POP);
        });
        const anyIncomplete = this.missions.some((m) => !m.completed);
        if (anyIncomplete) {
            this.hud.classList.remove(HUD_REWARD);
        }
        this.hud.hidden = false;
    }
}

const missionService = new MissionService();
export default missionService;
