class InteractionService {
    constructor() {
        this.interactionManager = null;
        this.enabled = false;
        this.eyesClosed = false;
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
        return this.enabled && !this.eyesClosed;
    }
}

const interactionService = new InteractionService();
export default interactionService;