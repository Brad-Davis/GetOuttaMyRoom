import * as THREE from "three";
import gsap from "gsap";
import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import cameraService, { CAMERA_PRESETS } from "../utils/cameraPresets.js";
import dialogService from "../utils/dialogService.js";
import effectsService from "../utils/effectsService.js";
import audioService from "../utils/audioService.js";
import { enemyActiveItems } from "../UI/activeItems.js";

const THIRTIES_GLB = "./resources/models/thirties2.glb";
/** Positive Z = behind INTERIOR_START / default camera at the origin. */
export const SPAWN_BEHIND_DEFAULT = { x: 0, y: 0, z: 11 };
const TARGET_HEIGHT = 8;

/** Milestones along scroll (`gameGroup.position.z`); stored negative, use {@link scrollBattleZ}. */
export const FIRST_BATTLE_POSITION = -50;
export const SECOND_BATTLE_POSITION = -150;

/** `gameGroup.position.z` at which a scroll battle fires. */
export function scrollBattleZ(milestone) {
    return -milestone;
}



class Thirties extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Thirties", [], hp, level, exp, gold, null, [0, -3, 0], null);
        this.worldSprite = null;
        /** @type {1 | 2 | null} */
        this.scrollBattlePhase = null;
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

    modelRun(position, duration = 10) {
        gsap.to(this.model.position, {
            x: position[0],
            y: position[1],
            z: position[2],
            duration: duration,
            ease: "power2.out",
        });
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

        // this.modelRun([ref.x + SPAWN_BEHIND_DEFAULT.x, ref.y + SPAWN_BEHIND_DEFAULT.y, ref.z + SPAWN_BEHIND_DEFAULT.z + FIRST_BATTLE_POSITION], 30);

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
        effectsService.shakeScreen(10, 0.1);
        audioService.playThirtiesMusic();
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

    /** Hallway scroll battle — keep the GLB in `gameGroup`, do not reparent to the scene root. */
    startBattle() {
        this.setHp(this.maxHp);
        this.enemyHealthBar.showHealthBar();
        enemyActiveItems.renderEnemyItems(this);
        if (this.model) {
            this.model.visible = true;
            gsap.to(this.model.position, {
                x: 0,
                y: SPAWN_BEHIND_DEFAULT.y,
                z: 4,
                duration: 0.6,
                ease: "power2.out",
            });
        }
    }

    dieEvent() {
        dialogService.clearDialog();
        const lines =
            this.scrollBattlePhase === 2
                ? [
                      {
                          speaker: "Your Thirties",
                          text: "Fine. Keep running. I'll still be back there.",
                      },
                  ]
                : [
                      {
                          speaker: "Your Thirties",
                          text: "You think scrolling away from me works??",
                      },
                      {
                          speaker: "Your Thirties",
                          text: "Keep going. I'm not done.",
                      },
                  ];
        dialogService.runLines(lines).then(() => {
            this.scrollBattlePhase = null;
            window.gameEngine?.getInteractionManager?.()?.movement?.resumeAfterScrollBattle?.();
        });
    }

    getRandomDialog() {
        const dialogs = [
            [
                { speaker: "Your Thirties", text: "I can smell your fear from back here." },
                { speaker: "Your Thirties", text: "And your laundry." },
            ],
            [
                { speaker: "Your Thirties", text: "You can't out-scroll me." },
                { speaker: "Your Thirties", text: "I AM you." },
            ],
            [
                { speaker: "Your Thirties", text: "Remember the gluten allergy?" },
                { speaker: "Your Thirties", text: "That was a warning shot." },
            ],
        ];
        return dialogs[Math.floor(Math.random() * dialogs.length)];
    }
}

export default Thirties;
