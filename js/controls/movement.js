import * as THREE from "three";
import iframeControls from '../UI/iframeControls.js';
import SpeedBar from '../UI/speedBar.js';
import cameraService, { CAMERA_PRESETS } from '../utils/cameraPresets.js';
import effectsService from '../utils/effectsService.js';
import gameState from '../gameState.js';
import dialogService from '../utils/dialogService.js';
import voiceRecognition from '../services/voiceRecognition.js';

import {
    FIRST_BATTLE_POSITION,
    SECOND_BATTLE_POSITION,
    scrollBattleZ,
} from '../people/thirties.js';
import { DADS_ROOM_WALL_LOCAL_Z } from '../enviroments/hallway.js';

/** Matches `SceneManager` initial `gameGroup.position.z`. */
const INITIAL_GAME_GROUP_Z = -5;
/** World-Z at the bedroom / interior anchor — start of the speed-bar rail. */
const RAIL_Z_ORIGIN = 0;
/** Stop scroll before Dad's room wall reaches the camera (world Z, translation-only group). */
const DADS_ROOM_SCROLL_MARGIN = 0.35;
/** Max `gameGroup.position.z` before Dad's room wall meets the interior camera. */
const MAX_GAME_GROUP_Z =
    CAMERA_PRESETS.INTERIOR_START.position.z -
    DADS_ROOM_WALL_LOCAL_Z -
    DADS_ROOM_SCROLL_MARGIN;

const FIRST_BATTLE_Z = scrollBattleZ(FIRST_BATTLE_POSITION);
const SECOND_BATTLE_Z = scrollBattleZ(SECOND_BATTLE_POSITION);

const _thirtiesWorldPos = new THREE.Vector3();

const DADDY_IFRAME_URL = 'https://pleasewakeupdaddy.com/';
/** Trigger Dad's room sequence when scroll reaches the wall (small epsilon for float). */
const DADS_ROOM_TRIGGER_EPSILON = 0.05;
const BATTLE_TRIGGER_EPSILON = 0.05;

const MOVEMENT_SPEED = 0.001;
/** Wheel deltaY equivalent needed for 100% fill (higher = harder to max out). */
const REFERENCE_WHEEL_DELTA = 400;
const MAX_DISPLAY_SPEED = MOVEMENT_SPEED * REFERENCE_WHEEL_DELTA;
/** How much each scroll tick blends into the running average (lower = longer memory). */
const SCROLL_EMA_ALPHA = 0.06;
/** Per-frame retention when idle (higher = slower falloff; ~0.99 ≈ several seconds at 60fps). */
const IDLE_DECAY_PER_FRAME = 0.99;

const MOM_ENCOUNTER_Z = 0;

export default class Movement {
    constructor(camera, gameGroup) {
      this.camera = camera;
      this.gameGroup = gameGroup;
      this.enableMovement = false;
      this._dadsRoomSequenceStarted = false;
      this._firstScrollBattleDone = false;
      this._secondScrollBattleDone = false;
      this._firstScrollBattleWon = false;
      this._scrollBattleStarting = false;
      this._caughtByThirties = false;
      this._averageScrollSpeed = 0;
      this._speedBar = null;
      this._lastWheelAt = 0;
      this.kitchenEnabled = false;
      this._momEncounterStarted = false;

      window.addEventListener('wheel', this.handleScroll.bind(this));
    //   this.enable(true); // Start in kitchen mode
    }

    _getScrollIdleMs() {
        if (!this._lastWheelAt) return Infinity;
        return performance.now() - this._lastWheelAt;
    }

    _updateThirtiesChase(scrollBoost = 0) {
        const thirties = window.gameEngine?.getThirties?.();
        if (!thirties?.isChasing?.() || !this.gameGroup) return;

        const idleMs = this._getScrollIdleMs();
        thirties.updateChase(this.gameGroup, scrollBoost, idleMs);

        if (
            this.enableMovement &&
            thirties.checkCaught(this.gameGroup, this._averageScrollSpeed, idleMs)
        ) {
            this._handleCaughtByThirties();
        }
    }

    handleScroll(event) {
        if (!this.enableMovement) return;
        if (!this.gameGroup || !this.camera) return;
        if (event.deltaY <= 0) return;

      this._lastWheelAt = performance.now();

      const deltaZ = MOVEMENT_SPEED * event.deltaY;
      const instantSpeed = Math.abs(deltaZ);

      this._averageScrollSpeed +=
          (instantSpeed - this._averageScrollSpeed) * SCROLL_EMA_ALPHA;

      this.gameGroup.position.z += deltaZ;

      if (this.gameGroup.position.z > MAX_GAME_GROUP_Z) {
          this.gameGroup.position.z = MAX_GAME_GROUP_Z;
      }

      this._updateThirtiesChase(instantSpeed);
      this._updateSpeedBar();
      this._checkScrollBattleTriggers();
      this._maybeTriggerDadsRoomSequence();
    }

    showSpeed() {
        if (this._speedBar) {
            this._speedBar.show();
            this._updateSpeedBar();
            return;
        }

        const rootEl = document.getElementById('speed-bar-overlay');
        if (!rootEl) return;

        this._speedBar = new SpeedBar(rootEl);
        this._speedBar.show();
        this._updateSpeedBar();
    }

    hideSpeed() {
        this._speedBar?.hide();
    }

    /** Smooth the average down when idle; call from the game loop. */
    frameUpdate() {
        const thirties = window.gameEngine?.getThirties?.();
        if (thirties?.isChasing?.()) {
            this._updateThirtiesChase(0);
        }

        if (this.enableMovement) {
            if (this._averageScrollSpeed > 0.00001) {
                this._averageScrollSpeed *= IDLE_DECAY_PER_FRAME;
            } else {
                this._averageScrollSpeed = 0;
            }

            this._updateSpeedBar();
            this._checkScrollBattleTriggers();
            this._maybeTriggerDadsRoomSequence();
        }
    }

    _handleCaughtByThirties() {
        if (this._caughtByThirties || this._scrollBattleStarting) return;

        this._caughtByThirties = true;
        this.disable();

        const thirties = window.gameEngine?.getThirties?.();
        thirties?.stopChase?.();

        cameraService.turnCamera(Math.PI, {
            onComplete: () => {
                gameState.kill('Your Thirties caught you.');
            },
        });
    }

    _maybeTriggerDadsRoomSequence() {
        if (this._dadsRoomSequenceStarted || !this.enableMovement) return;
        if (!this.gameGroup || this.gameGroup.position.z < MAX_GAME_GROUP_Z - DADS_ROOM_TRIGGER_EPSILON) {
            return;
        }

        this._dadsRoomSequenceStarted = true;
        this.gameGroup.position.z = MAX_GAME_GROUP_Z;
        this.disable();

        const interactionManager = window.gameEngine?.getInteractionManager?.();
        interactionManager?.beginProgrammaticCameraMove?.();

        const dadsRoomDoor = window.gameEngine?.getAssetManager?.()?.getGameObject('dadsRoomDoor');

        cameraService.runDadsRoomDoorSequence(this.gameGroup, {
            onEnterComplete: () => {
                effectsService.playSfx('startupEffect');
                if (dadsRoomDoor && !dadsRoomDoor.doorOpen) {
                    dadsRoomDoor.open();
                }
            },
        });

        setTimeout(() => {
            effectsService.playSfx('startupEffect');
            setTimeout(() => {
                iframeControls.openIframe(DADDY_IFRAME_URL, { externalEmbed: true });
            }, 1000);
        }, 3100);
    }

    _getThirtiesPosition() {
        const model = window.gameEngine?.getThirties?.()?.worldSprite;
        if (!model) return null;
        model.getWorldPosition(_thirtiesWorldPos);
        return _thirtiesWorldPos.z - this.gameGroup.position.z - 5;
    }

    /** Fixed scroll extent; rail length uses {@link MAX_GAME_GROUP_Z}, not live camera Z. */
    _getScrollRailBounds() {
        return {
            zMin: RAIL_Z_ORIGIN,
            zMax: MAX_GAME_GROUP_Z - INITIAL_GAME_GROUP_Z,
        };
    }

    _updateSpeedBar() {
        if (!this._speedBar || !this.enableMovement) return;
        const scrollBounds = this._getScrollRailBounds();
        const thirtiesZ = -this._getThirtiesPosition();
        const youZ = this.gameGroup?.position.z;

        this._speedBar.update(this._averageScrollSpeed, MAX_DISPLAY_SPEED, {
            youZ: youZ,
            youBounds: { zMin: RAIL_Z_ORIGIN, zMax: scrollBounds.zMax },
            thirtiesZ: thirtiesZ,
            thirtiesBounds: scrollBounds,
        });
    }

    _checkScrollBattleTriggers() {
        if (this._scrollBattleStarting || !this.enableMovement || !this.gameGroup) return;

        const youZ = this.gameGroup.position.z;
        if (this.kitchenEnabled) {
            if (youZ >= -MOM_ENCOUNTER_Z) {
                this.encounterMom();
            }
            return;
        }

        if (
            !this._firstScrollBattleDone &&
            youZ >= FIRST_BATTLE_Z - BATTLE_TRIGGER_EPSILON
        ) {
            this._beginScrollBattle(1, FIRST_BATTLE_Z);
            return;
        }

        if (
            !this._secondScrollBattleDone &&
            this._firstScrollBattleWon &&
            youZ >= SECOND_BATTLE_Z - BATTLE_TRIGGER_EPSILON
        ) {
            this._beginScrollBattle(2, SECOND_BATTLE_Z);
        }

    }

    async _beginScrollBattle(phase, stopZ) {
        if (this._scrollBattleStarting) return;

        this._scrollBattleStarting = true;
        this.gameGroup.position.z = stopZ;
        this.disable();

        if (phase === 1) {
            this._firstScrollBattleDone = true;
            await dialogService.runLines([
                { speaker: "Your Thirties", text: "YOU MUST FACE ME!!!!" },
            ]);
        } else {
            await dialogService.runLines([
                { speaker: "Your Thirties", text: "LATE 20S MY ASS. LOOK AT ME!!!!!" },
            ]);
            this._secondScrollBattleDone = true;
        }

        const thirties = window.gameEngine?.getThirties?.();
        if (thirties) {
            thirties.scrollBattlePhase = phase;
            thirties.startBattleChase();
        }

        cameraService.turnCamera(Math.PI, {
            onComplete: async () => {
                const enemy = window.gameEngine?.getThirties?.();
                if (enemy && this.gameGroup) {
                    enemy.updateChase(this.gameGroup, 3);
                }
                await gameState.startThirtiesScrollBattle(enemy);
                this._scrollBattleStarting = false;
            },
        });
    }

    encounterMom() {
        if (this._momEncounterStarted) return;
        this._momEncounterStarted = true;

        this.gameGroup.position.z = -MOM_ENCOUNTER_Z;
        // this.disable();

        //REENABLE AFTER TESTING
        const kitchen = window.gameEngine?.getAssetManager?.()?.getGameObject('kitchen');
        kitchen?.activateOutsideBeyondDoorAtmosphere?.();
        // cameraService.lookAtMom({
        //     duration: 1.2,
        //     onComplete: async () => {
        //         await dialogService.runLines([
        //             { speaker: "Mom", text: "Hey honey. Good to see you outside of your room." },
        //             { speaker: "Mom", text: "Thanks for waking up Dad! He just ran out! Think he'll make it in time." },
        //             { speaker: "Mom", text: "You seem like you have something on your mind. What's up?" },
        //             { speaker: "Inner Monologue", text: "Say something to your mom. Anything. It won't be graded, timed or sent to an online database. Just say something." },
        //         ]);
        //         const response = await voiceRecognition.getAndPrintStatement(false);
        //         await dialogService.runLines([
        //             { speaker: "Mom", text: "That's wonderful honey. Why don't you go take a walk it's a wonderful evening."    },
        //         ]);

        //         const door = kitchen?.getKitchenDoor?.();
        //         cameraService.lookAtKitchen({
        //             duration: 1.2,
        //             onComplete: () => {
        //                 if (door && !door.doorOpen) {
        //                     door.open();
        //                 }
        //                 this.enable(true);
        //             },
        //         });
        //     },
        // });
        const door = kitchen?.getKitchenDoor?.();
        door.open();
        this.enable(true);
    }

    resumeAfterScrollBattle() {
        this._scrollBattleStarting = false;
        if (!this._firstScrollBattleWon && this._firstScrollBattleDone) {
            this._firstScrollBattleWon = true;
        }
        cameraService.turnCamera(-Math.PI, {
            onComplete: () => {
                this.enable();
            },
        });
    }

    enable(kitchen = false) {
        this.enableMovement = true;
        this._lastWheelAt = performance.now();
        if (!kitchen) {
            this.showSpeed();
            if (!this._caughtByThirties) {
                window.gameEngine?.getThirties?.()?.startChase?.();
            }
        } else {
            this.kitchenEnabled = true;
        }
        
    }

    disable() {
        this.enableMovement = false;
        this._averageScrollSpeed = 0;
        this.hideSpeed();
    }
}
