import effectsService from '../utils/effectsService.js';

class DopamineManager {
    constructor() {
        this.dopamine = 0;
        this.dopamineContainer = document.getElementById('dopamine-container');
        this.dopamineCount = document.getElementById('dopamine-count');
        /** Shown count during animation (may lag slightly behind authoritative `dopamine`) */
        this._displayValue = 0;
        this._animId = null;
        /** ms for one count-up burst; longer deltas feel smoother for big jumps */
        this._animDurationMs = 650;

    }

    getDopamine() {
        return this.dopamine;
    }

    /** @param {number} amount */
    canAfford(amount) {
        return amount <= 0 || this.dopamine >= amount;
    }

    /**
     * Spend dopamine if possible. On failure calls {@link notEnoughDopamine}.
     * @param {number} amount
     * @returns {boolean}
     */
    trySpend(amount) {
        if (amount <= 0) return true;
        if (!this.canAfford(amount)) {
            this.notEnoughDopamine();
            return false;
        }
        if (this.dopamineContainer) {
            this.dopamineContainer.style.display = 'flex';
        }
        this.dopamine -= amount;
        this._animateDisplayTo(this.dopamine);
        return true;
    }

    /**
     * Animate the HUD number toward `to` (authoritative balance is already set).
     * @param {number} to
     */
    _animateDisplayTo(to) {
        const from = this._displayValue;

        if (from === to) return;

        if (this._animId !== null) {
            cancelAnimationFrame(this._animId);
            this._animId = null;
        }

        const start = performance.now();
        const easeOutCubic = (t) => 1 - (1 - t) ** 3;

        const tick = (now) => {
            const elapsed = now - start;
            const t = Math.min(1, elapsed / this._animDurationMs);
            const eased = easeOutCubic(t);
            this._displayValue = from + (to - from) * eased;
            if (this.dopamineCount) {
                this.dopamineCount.textContent = Math.round(this._displayValue);
            }

            if (t < 1) {
                this._animId = requestAnimationFrame(tick);
            } else {
                this._displayValue = to;
                if (this.dopamineCount) {
                    this.dopamineCount.textContent = to;
                }
                this._animId = null;
            }
        };

        this._animId = requestAnimationFrame(tick);
    }

    /**
     * @param {number} amount
     */
    giveDopamine(amount) {
        if (this.dopamineContainer) {
            this.dopamineContainer.style.display = 'flex';
        }
        this.dopamine += amount;
        this._animateDisplayTo(this.dopamine);
    }

    notEnoughDopamine() {
        // Get the dopamine container element
        effectsService.playSfx('notEnoughDopamine');
        if (!this.dopamineContainer) return;

        // Add shaking and flashing classes
        this.dopamineContainer.classList.add('dopamine-shake', 'dopamine-flash');

        // Remove the classes after the animation ends
        setTimeout(() => {
            this.dopamineContainer.classList.remove('dopamine-shake', 'dopamine-flash');
        }, 300); // Match to animation duration (ms)
    }
}

const dopamineManager = new DopamineManager();
export default dopamineManager;
