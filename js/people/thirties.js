import * as THREE from "three";
import gsap from "gsap";
import Enemy from "../templates/enemy.js";
import loaderService from "../utils/loaderService.js";
import cameraService, { CAMERA_PRESETS } from "../utils/cameraPresets.js";
import dialogService from "../utils/dialogService.js";
import effectsService from "../utils/effectsService.js";
import audioService from "../utils/audioService.js";
import { enemyActiveItems } from "../UI/activeItems.js";
import backButtonManager from "../controls/backButton.js";
import items from "../templates/items.js";

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

/** Matches {@link Movement} / `SceneManager` initial `gameGroup.position.z`. */
export const PLAYER_SCROLL_ORIGIN_Z = -5;

/** Speed-bar: stay this far behind the player marker while they scroll. */
const SCROLL_STALK_RAIL_GAP = 6;
/** Caught when `playerRail − thirtiesRail` is at or below this. */
const CATCH_RAIL_GAP = 2.5;
/** Ms without a wheel event before catch can count (see Movement). */
const CATCH_IDLE_MS = 280;
/** Ms that close + idle must hold before death fires. */
const CATCH_HOLD_MS = 350;
/** Battle: stay near the player during fights. */
const BATTLE_CHASE_GAP_Z = 8;
/** Rail Z per second toward the player when not keeping up. */
const SCROLL_RAIL_CHASE_PER_SEC = 14;
/** Extra rail chase per second while the hall is moving under you. */
const SCROLL_RAIL_SCROLL_KICK = 220;
const SCROLL_CHASE_LERP = 0.12;
const BATTLE_CHASE_LERP = 0.14;
/** Scroll chase cannot catch the player until this many ms after {@link startChase}. */
const CHASE_CATCH_GRACE_MS = 3000;

const _thirtiesWorldPos = new THREE.Vector3();



class Thirties extends Enemy {
    constructor(hp, level, exp, gold) {
        super("Thirties", [items["existentialDread_001"]], hp, level, exp, gold, null, [0, -3, 0], null);
        this.worldSprite = null;
        /** @type {1 | 2 | null} */
        this.scrollBattlePhase = null;
        /** @type {'idle' | 'scroll' | 'battle'} */
        this.chaseMode = 'idle';
        this._chaseGapZ = BATTLE_CHASE_GAP_Z;
        this._lastChaseTime = performance.now();
        this._catchGraceEndsAt = 0;
        /** @type {number | null} */
        this._catchHoldStartedAt = null;
    }

    isChasing() {
        return this.chaseMode === 'scroll' || this.chaseMode === 'battle';
    }

    startChase() {
        this.chaseMode = 'scroll';
        this._lastChaseTime = performance.now();
        this._catchHoldStartedAt = null;
        this._catchGraceEndsAt = performance.now() + CHASE_CATCH_GRACE_MS;
        if (this.model) {
            gsap.killTweensOf(this.model.position);
        }
    }

    isCatchGraceActive() {
        return performance.now() < this._catchGraceEndsAt;
    }

    stopChase() {
        this.chaseMode = 'idle';
        if (this.model) {
            gsap.killTweensOf(this.model.position);
        }
    }

    startBattleChase() {
        this.chaseMode = 'battle';
        this._chaseGapZ = BATTLE_CHASE_GAP_Z;
        this._lastChaseTime = performance.now();
        if (this.model) {
            gsap.killTweensOf(this.model.position);
        }
    }

    _getCameraWorldZ() {
        const cam = window.gameEngine?.sceneManager?.camera;
        return cam?.position?.z ?? CAMERA_PRESETS.INTERIOR_START.position.z;
    }

    /**
     * Local Z so Thirties stays `_chaseGapZ` behind the fixed camera as the hall scrolls.
     * worldZ = gameGroup.z + localZ ≈ camera.z + gap (not SPAWN + scroll progress).
     */
    _getChaseTargetZ(gameGroup) {
        if (!gameGroup) return SPAWN_BEHIND_DEFAULT.z;
        return this._getCameraWorldZ() + this._chaseGapZ - gameGroup.position.z;
    }

    /** Same axis as the speed bar Thirties marker (see Movement._getThirtiesPosition). */
    _getThirtiesRailZ(gameGroup) {
        if (!this.model || !gameGroup) return null;
        this.model.getWorldPosition(_thirtiesWorldPos);
        return -(_thirtiesWorldPos.z - gameGroup.position.z - 5);
    }

    _getPlayerRailZ(gameGroup) {
        return gameGroup?.position.z ?? null;
    }

    /** `thirtiesRail = -(world − group − 5)` → `localZ = 5 − thirtiesRail`. */
    _setThirtiesRailZ(gameGroup, railZ) {
        if (!this.model || !gameGroup) return;
        this.model.position.z = 5 - railZ;
    }

    /**
     * @param {THREE.Group | null} gameGroup
     * @param {number} [scrollBoost] — recent wheel delta (world units / tick)
     * @param {number} [idleMs] — ms since last wheel (Movement)
     */
    updateChase(gameGroup, scrollBoost = 0, idleMs = 0) {
        if (!this.isChasing() || !this.model || !gameGroup) return;

        const now = performance.now();
        if (this.chaseMode === 'scroll' && this.isCatchGraceActive()) {
            this._lastChaseTime = now;
            return;
        }

        const dt = Math.min((now - this._lastChaseTime) / 1000, 0.05);
        this._lastChaseTime = now;

        if (this.chaseMode === 'battle') {
            const targetZ = this._getChaseTargetZ(gameGroup);
            const step = Math.min(1, BATTLE_CHASE_LERP * (dt * 60));
            this.model.position.z += (targetZ - this.model.position.z) * step;
            this.model.position.x = THREE.MathUtils.lerp(this.model.position.x, 0, step);
            return;
        }

        const playerRail = this._getPlayerRailZ(gameGroup);
        let thirtiesRail = this._getThirtiesRailZ(gameGroup);
        if (playerRail == null || thirtiesRail == null) return;

        const targetRail = playerRail - SCROLL_STALK_RAIL_GAP;
        const scrollKick = scrollBoost * SCROLL_RAIL_SCROLL_KICK * dt;

        if (thirtiesRail < targetRail) {
            thirtiesRail = Math.min(
                targetRail,
                thirtiesRail + SCROLL_RAIL_CHASE_PER_SEC * dt + scrollKick
            );
        }

        const railGap = playerRail - thirtiesRail;
        if (railGap > CATCH_RAIL_GAP) {
            const closeRate =
                idleMs >= CATCH_IDLE_MS
                    ? SCROLL_RAIL_CHASE_PER_SEC * 1.8
                    : SCROLL_RAIL_CHASE_PER_SEC * 0.45;
            const closeRail = playerRail - CATCH_RAIL_GAP + 0.05;
            thirtiesRail = Math.min(closeRail, thirtiesRail + closeRate * dt);
        }

        this._setThirtiesRailZ(gameGroup, thirtiesRail);

        const xStep = Math.min(1, SCROLL_CHASE_LERP * (dt * 60));
        this.model.position.x = THREE.MathUtils.lerp(this.model.position.x, 0, xStep);
    }

    /**
     * Caught when speed-bar markers overlap and you have not scrolled recently.
     * @param {number} _scrollSpeed — unused; idle time drives catch
     * @param {number} idleMs — ms since last wheel (Movement)
     */
    checkCaught(gameGroup, _scrollSpeed = 0, idleMs = 0) {
        if (this.chaseMode !== 'scroll' || !this.model || !gameGroup) return false;
        if (this.isCatchGraceActive()) return false;

        const railGap = this.getRailGap(gameGroup);
        if (railGap == null || railGap > CATCH_RAIL_GAP) {
            this._catchHoldStartedAt = null;
            return false;
        }

        if (idleMs < CATCH_IDLE_MS) {
            this._catchHoldStartedAt = null;
            return false;
        }

        const now = performance.now();
        if (this._catchHoldStartedAt == null) {
            this._catchHoldStartedAt = now;
        }
        return now - this._catchHoldStartedAt >= CATCH_HOLD_MS;
    }

    /** World-Z gap along the hall (for debug / chase tuning). */
    getChaseSeparation(gameGroup) {
        if (!this.model || !gameGroup) return Infinity;
        this.model.getWorldPosition(_thirtiesWorldPos);
        return _thirtiesWorldPos.z - this._getCameraWorldZ();
    }

    /** Same gap as the speed bar: player rail Z minus Thirties rail Z. */
    getRailGap(gameGroup) {
        const you = this._getPlayerRailZ(gameGroup);
        const thirties = this._getThirtiesRailZ(gameGroup);
        if (you == null || thirties == null) return null;
        return you - thirties;
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
        backButtonManager.disablePermanently();
        await setTimeout(async () => {
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
                    this.shakeWithAnger(1000, 0.5);
                    await dialogService.runLines([
                        {speaker: "Your Thirties", text: "BUT I MADE IT FOR YOU!!!"},
                        {speaker: "Your Thirties", text: "UNGRATFUL SHIT! I'LL SHOW U WHO'S IN CHARGE."},
                        {speaker: "Inner Monologue", text: "HOLY SHIT RUN (SCROLL AS FAST AS YOU CAN)"}
                    ])
                    this.shakeWithAnger(1000, 2);
                    this.startRun();

                });
            }, 2000)
        }, 1000)
    }

    shakeWithAnger(duration = 1000, severity = 1) {
        if (!this.model) return;

        const model = this.model;
        const originalPosition = {
            x: model.position.x,
            y: model.position.y,
            z: model.position.z,
        };

        let shaking = true;
        const startTime = performance.now();

        const shakeFrame = () => {
            if (!shaking) return;
            const now = performance.now();
            const elapsed = now - startTime;
            if (elapsed >= duration) {
                // Restore position
                model.position.x = originalPosition.x;
                model.position.y = originalPosition.y;
                model.position.z = originalPosition.z;
                shaking = false;
                return;
            }
            // Random displacement per axis
            model.position.x = originalPosition.x + (Math.random() - 0.5) * 0.1 * severity;
            model.position.y = originalPosition.y + (Math.random() - 0.5) * 0.1 * severity;
            model.position.z = originalPosition.z + (Math.random() - 0.5) * 0.1 * severity;
            requestAnimationFrame(shakeFrame);
        };

        shakeFrame();
    }

    startRun() {
        cameraService.turnCamera(Math.PI);
        this.startChase();
        window.gameEngine?.getInteractionManager?.()?.movement?.enable();
    }

    /** Hallway scroll battle — keep the GLB in `gameGroup`, do not reparent to the scene root. */
    startBattle() {
        this.startBattleChase();
        this.setHp(this.maxHp);
        this.enemyHealthBar.showHealthBar();
        enemyActiveItems.renderEnemyItems(this);
        if (this.model) {
            this.model.visible = true;
            const gameGroup = window.gameEngine?.sceneManager?.gameGroup;
            if (gameGroup) {
                this.updateChase(gameGroup, 2);
            }
        }
    }

    tick(timeAmount = 0.1) {
        super.tick(timeAmount);
        if (this.chaseMode !== 'battle') return;
        const gameGroup = window.gameEngine?.sceneManager?.gameGroup;
        this.updateChase(gameGroup, 0);
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
            this.startChase();
            window.gameEngine?.getInteractionManager?.()?.movement?.resumeAfterScrollBattle?.();
        });
    }

    getRandomDialog() {
        const dialogs = [
            [
                { speaker: "Your Thirties", text: "You'd be a great dad." },
                { speaker: "Your Thirties", text: "(threat)" },
            ],
            [
                { speaker: "Your Thirties", text: "You can't escape me." },
                { speaker: "Your Thirties", text: "I AM you." },
            ],
            [
                { speaker: "Your Thirties", text: "Remember the gluten allergy?" },
                { speaker: "Your Thirties", text: "Just wait until fuckin lower back pain." },
            ],
        ];
        return dialogs[Math.floor(Math.random() * dialogs.length)];
    }
}

export default Thirties;
