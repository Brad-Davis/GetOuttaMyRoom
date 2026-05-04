class InteractionService {
    constructor() {
        this.interactionManager = null;
        this.enabled = false;
        this.eyesClosed = false;
        /** When true, {@link checkEnabled} is false even if `enabled` is true (e.g. during battle). */
        this.battleBlocking = false;
    }

    setInteractionManager(interactionManager) {
        this.interactionManager = interactionManager;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    setEyesClosed(closed) {
        this.eyesClosed = !!closed;
    }

    /** Block scene interactions while a battle is active (overrides `enable()` from other systems). */
    setBattleBlocking(blocked) {
        this.battleBlocking = !!blocked;
    }

    areEyesClosed() {
        return this.eyesClosed;
    }

    addInteraction(interaction) {
        this.interactionManager.add(interaction);
    }

    getInteractionManager() {
        return this.interactionManager;
    }

    checkEnabled() {
        return this.enabled && !this.eyesClosed && !this.battleBlocking;
    }
}

const interactionService = new InteractionService();
export default interactionService;