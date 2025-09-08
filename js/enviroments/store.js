import loaderService from "../utils/loaderService.js";
import gsap from "gsap";


class Store {
    constructor() {
        this.items = [];
        this.sprite = loaderService.createSprite("./resources/images/bedGoblin.png");
        this.shop = document.getElementById('shop');
        this.shop.style.pointerEvents = 'none';
        this.shop.style.opacity = '0';
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
        this.shop.style.pointerEvents = 'auto';
        this.shop.style.opacity = '1';
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
        this.shop.style.pointerEvents = 'none';
        this.shop.style.opacity = '0';
    }
}

const store = new Store();
export default store;