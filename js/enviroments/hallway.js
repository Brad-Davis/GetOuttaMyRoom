class Hallway {
    constructor(gameGroup, camera) {
        this.gameGroup = gameGroup;
        this.camera = camera;
    }

    createHallway() {
        const hallway = new THREE.Group();
        this.gameGroup.add(hallway);

        const wall = this.createSurface('wall', {
            width: 10,
            height: 10,
            x: 0,
        });
    }
}