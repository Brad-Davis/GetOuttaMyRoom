import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import items from "../templates/items.js";
import Bedroom from "../enviroments/bedroom.js";

class Thirties extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Thirties", [], hp, level, exp, gold, null, [0, -3, 0], null);
        // this.setSpritePaths(["updatedImages/uncle1.png", "updatedImages/uncle2.png", "updatedImages/uncle3.png", "updatedImages/uncle4.png", "updatedImages/uncle5.png"]);
        this.animations;
        this.worldSprite = null;
        this.surfaceFactory = new Bedroom();
    }

    renderInGame(group) {
        if (!group) return null;
        if (this.worldSprite) return this.worldSprite;

        const surface = this.surfaceFactory.createSurface('THIRTIES', {
            width: 10,
            height: 8,
            x: 0,
            y: 1,
            z: 5,
            rotX: 0,
            rotY: Math.PI,
            rotZ: 0,
            texture: 'thirties.jpg'
        });
        if (surface.material) {
            surface.material.color.setHex(0x000000);
            if (surface.material.emissive) {
                surface.material.emissive.setHex(0x000000);
                surface.material.emissiveIntensity = 0.2;
            }
        }
        surface.renderOrder = 2;
        group.add(surface);

        this.worldSprite = surface;
        this.model = surface;
        return surface;
    }
}

export default Thirties;