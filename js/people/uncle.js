import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";

class Uncle extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Uncle", [], hp, level, exp, gold, null, [0, -3, 0], null);
        this.animations;
    }

    async loadModel() {
        return new Promise(async (resolve, reject) => {
            const gltf = await loaderService.loadGLTF("./resources/models/uncle.glb");
            this.model = gltf.scene;
            this.model.scale.set(1, 1.5, 1);
            this.animations = gltf.animations;
            resolve();
        });
    }

    enterScene() {
        super.enterScene();
    }

    takeDamage(damage) {
        
    }
}

export default Uncle;