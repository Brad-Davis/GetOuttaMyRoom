import * as THREE from "three";
import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import cameraService, { CAMERA_PRESETS } from "../utils/cameraPresets.js";
import dialogService from "../utils/dialogService.js";

const THIRTIES_GLB = "./resources/models/thirties2.glb";
/** Positive Z = behind INTERIOR_START / default camera at the origin. */
const SPAWN_BEHIND_DEFAULT = { x: 0, y: 0, z: 11 };
const TARGET_HEIGHT = 8;

class Thirties extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Thirties", [], hp, level, exp, gold, null, [0, -3, 0], null);
        this.worldSprite = null;
    }

    _fitModelToHeight(model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const height = size.y || 1;
        const scale = TARGET_HEIGHT / height;
        model.scale.setScalar(scale);
    }

    async loadModel() {
        if (this.model) return this.model;

        const gltf = await loaderService.loadGLTF(THIRTIES_GLB);
        const model = gltf.scene;
        this._fitModelToHeight(model);
        model.rotation.y = Math.PI;
        this.model = model;
        return model;
    }

    async renderInGame(group) {
        if (!group) return null;
        if (this.worldSprite) return this.worldSprite;

        const model = await this.loadModel();
        const ref = CAMERA_PRESETS.INTERIOR_START.position;
        model.position.set(
            ref.x + SPAWN_BEHIND_DEFAULT.x,
            ref.y + SPAWN_BEHIND_DEFAULT.y,
            ref.z + SPAWN_BEHIND_DEFAULT.z
        );

        group.add(model);
        this.worldSprite = model;
        return model;
    }

    runAway() {
        this.moveTo([0, 0, 1000])
    }

    returnBack(returnFunction) {
        gsap.to(this.model.position, {
            x: SPAWN_BEHIND_DEFAULT.x,
            y: SPAWN_BEHIND_DEFAULT.y,
            z: SPAWN_BEHIND_DEFAULT.z,
            duration: 1, // 1 second
            ease: "power2.out", // Smooth ease-out curve
            onComplete: () => {
               returnFunction()
            }
        });
    }

    async runThirtiesHello() {
        await setTimeout(() => {}, 1000)
        await dialogService.runLines([
            {speaker: "Your Thirties", text: "Hey I've just been here breathing down your neck."},
            {speaker: "Your Thirties", text: "Oooo wait I have something for you."}
        ])
        this.runAway();
        setTimeout(() => {
            this.returnBack(async () => {
                await dialogService.runLines([
                    {speaker: "Your Thirties", text: "It's a gluten allergy."},
                    {speaker: "Your Thirties", text: "........"},
                    {speaker: "Your Thirties", text: "You don't like it????"},
                ])
                this.shakeWithAnger();
                await dialogService.runLines([
                    {speaker: "Your Thirties", text: "BUT I MADE IT FOR YOU!!!"},
                    {speaker: "Your Thirties", text: "UNGRATFUL SHIT! I'LL SHOW U WHO'S IN CHARGE."},
                    {speaker: "Inner Monologue", text: "HOLY SHIT RUN (SCROLL AS FAST AS YOU CAN)"}
                ])
                this.startRun();

            });
        }, 2000)
    }

    shakeWithAnger() {

    }

    startRun() {
        cameraService.turnCamera(Math.PI);
        window.gameEngine?.getInteractionManager?.()?.movement?.enable();
    }
}

export default Thirties;
