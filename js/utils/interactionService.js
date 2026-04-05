class InteractionService {
    constructor() {
        this.interactionManager = null;
        this.enabled = false;
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

    addInteraction(interaction) {
        this.interactionManager.add(interaction);
    }

    getInteractionManager() {
        return this.interactionManager;
    }

    checkEnabled() {
        return this.enabled;
    }
}

const interactionService = new InteractionService();
export default interactionService;