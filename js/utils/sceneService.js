class SceneService {
    constructor() {
        this.scene = null;
    }

    setScene(scene) {
        this.scene = scene;
    }

    getScene() {
        return this.scene;
    }
}

const sceneService = new SceneService();
export default sceneService;