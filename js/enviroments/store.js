import loaderService from "../utils/loaderService.js";
import gsap from "gsap";


class Store {
    constructor() {
        this.items = [];
        this.sprite = loaderService.createSprite("./resources/images/bedGoblin.png");

    }

    addItem(item) {
        this.items.push(item);
    }

    showSetup(scene) {
        // window.goblin = this.sprite;
        scene.add(this.sprite);
        this.sprite.scale.set(0.8, 0.8, 0.8)
        this.sprite.position.set(3.5, -3.5, -7);
        gsap.to(this.sprite.position, {
            x: 0.8,
            y: -1.9,
            z: -7,
            duration: 1,
            ease: "power2.inOut"
        });
        this.sprite.visible = true;
        console.log("Store setup");
    }

    hideSetup() {
        this.sprite.position.set(0.8, -1.9, -7);
        gsap.to(this.sprite.position, {
            x: 3.5,
            y: -3.5,
            z: -7,
            duration: 1,
            ease: "power2.inOut"
        });
    }
}

const store = new Store();
export default store;