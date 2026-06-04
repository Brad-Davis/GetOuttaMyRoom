import * as THREE from "three";
import gsap from 'gsap';
import iframeControls from '../UI/iframeControls.js';
import SpeedBar from '../UI/speedBar.js';
import cameraService, { CAMERA_PRESETS } from '../utils/cameraPresets.js';
import effectsService from '../utils/effectsService.js';
import gameState from '../gameState.js';
import dialogService from '../utils/dialogService.js';
import voiceRecognition from '../services/voiceRecognition.js';
import interactionService from '../utils/interactionService.js';
import backButtonManager from './backButton.js';
import speakButtonManager from './speakButton.js';

import {
    FAST_SCROLL,
    LOG_PLAYER_Z,
    REVERSE_SCROLL,
    SKIP_DADDY_WAKE_IFRAME,
} from '../config/gameFlow.js';
import {
    FIRST_BATTLE_POSITION,
    SECOND_BATTLE_POSITION,
    scrollBattleZ,
} from '../people/thirties.js';
import { DADS_ROOM_WALL_LOCAL_Z } from '../enviroments/hallway.js';
import {
    getKitchenEndingTriggerScrollZ,
    getKitchenMaxGameGroupZ,
} from '../enviroments/kitchenLayout.js';
import audioService from '../utils/audioService.js';

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

const DADDY_IFRAME_URL = '/pleaseDaddyWakeUp/index.html';
/** Trigger Dad's room sequence when scroll reaches the wall (small epsilon for float). */
const DADS_ROOM_TRIGGER_EPSILON = 0.05;
const BATTLE_TRIGGER_EPSILON = 0.05;

const MOVEMENT_SPEED = 0.001;
/** Multiplier applied when {@link FAST_SCROLL} is enabled in gameFlow.js. */
const FAST_SCROLL_MULTIPLIER = 3;
const EFFECTIVE_MOVEMENT_SPEED = MOVEMENT_SPEED * (FAST_SCROLL ? FAST_SCROLL_MULTIPLIER : 1);
const SCROLL_DIRECTION = REVERSE_SCROLL ? -1 : 1;
/** Wheel deltaY equivalent needed for 100% fill (higher = harder to max out). */
const REFERENCE_WHEEL_DELTA = 400;
const MAX_DISPLAY_SPEED = EFFECTIVE_MOVEMENT_SPEED * REFERENCE_WHEEL_DELTA;
/** How much each scroll tick blends into the running average (lower = longer memory). */
const SCROLL_EMA_ALPHA = 0.06;
/** Per-frame retention when idle (higher = slower falloff; ~0.99 ≈ several seconds at 60fps). */
const IDLE_DECAY_PER_FRAME = 0.99;

const MOM_ENCOUNTER_Z = 0;

const OUTSIDE_START_FLYING = 100;
const KITCHEN_ENDING_SCROLL_EPSILON = 0.5;

export default class Movement {
    constructor(camera, gameGroup) {
      this.camera = camera;
      this.gameGroup = gameGroup;
      this.enableMovement = false;
      this._dadsRoomSequenceStarted = false;
      this._firstScrollBattleDone = false;
      this._secondScrollBattleDone = false;
      this._firstScrollBattleWon = false;
      this._secondScrollBattleWon = false;
      this._scrollBattleStarting = false;
      this._caughtByThirties = false;
      this._averageScrollSpeed = 0;
      this._speedBar = null;
      this._lastWheelAt = 0;
      this.kitchenEnabled = false;
      this._momEncounterStarted = false;
      this._daddyKitchenWakeDone = false;
      this._flyingStarted = false;
      this._kitchenEndingStarted = false;

      window.addEventListener('wheel', this.handleScroll.bind(this));
    //   this.enable(true); // Start in kitchen mode
    }

    _getScrollIdleMs() {
        if (!this._lastWheelAt) return Infinity;
        return performance.now() - this._lastWheelAt;
    }

    _getHallway() {
        return window.gameEngine?.getAssetManager?.()?.getGameObject('bedroom')?.hallway ?? null;
    }

    _shouldHallwayShake() {
        return (
            this.enableMovement &&
            !this.kitchenEnabled &&
            this._firstScrollBattleWon &&
            !this._dadsRoomSequenceStarted &&
            !this._scrollBattleStarting
        );
    }

    _syncHallwayShake() {
        const hallway = this._getHallway();
        if (!hallway) return;

        if (!this._shouldHallwayShake()) {
            hallway.stopShake();
            return;
        }

        hallway.setShakeTier(this._secondScrollBattleWon ? 2 : 1);
        hallway.updateShake();
    }

    _updateThirtiesChase(scrollBoost = 0) {
        if (this.kitchenEnabled) return;

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

    _clampGameGroupScrollZ() {
        if (!this.gameGroup) return;

        const maxZ = this.kitchenEnabled
            ? getKitchenMaxGameGroupZ(this.camera?.position?.z)
            : MAX_GAME_GROUP_Z;

        if (this.gameGroup.position.z > maxZ) {
            this.gameGroup.position.z = maxZ;
        }

        if (REVERSE_SCROLL && this.gameGroup.position.z < INITIAL_GAME_GROUP_Z) {
            this.gameGroup.position.z = INITIAL_GAME_GROUP_Z;
        }
    }

    handleScroll(event) {
        if (!this.enableMovement) return;
        if (!this.gameGroup || !this.camera) return;
        if (event.deltaY * SCROLL_DIRECTION <= 0) return;

      this._lastWheelAt = performance.now();

      const deltaZ = EFFECTIVE_MOVEMENT_SPEED * event.deltaY * SCROLL_DIRECTION;
      const instantSpeed = Math.abs(deltaZ);

      this._averageScrollSpeed +=
          (instantSpeed - this._averageScrollSpeed) * SCROLL_EMA_ALPHA;

      this.gameGroup.position.z += deltaZ;
      this._clampGameGroupScrollZ();

      this._updateThirtiesChase(instantSpeed);
      this._updateSpeedBar();
      this._checkScrollBattleTriggers();
      if (this.kitchenEnabled) {
          this._maybeTriggerKitchenEnding();
      } else {
          this._maybeTriggerDadsRoomSequence();
          this._syncHallwayShake();
      }
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
            if (!this.kitchenEnabled) {
                this._maybeTriggerDadsRoomSequence();
            }
        }

        if (!this.kitchenEnabled) {
            this._syncHallwayShake();
        }

        this._logPlayerZ();
    }

    _logPlayerZ() {
        if (!LOG_PLAYER_Z) return;
        const gameGroup = this._getGameGroup();
        if (!gameGroup) return;
        console.log('[gamegroup z]', gameGroup.position.z.toFixed(4));
        console.log('[camera enabled]', cameraService.getCameraPosition().z.toFixed(4));
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

    _maybeTriggerKitchenEnding() {
        if (
            this._kitchenEndingStarted ||
            !this.kitchenEnabled ||
            !this.enableMovement ||
            !this.gameGroup
        ) {
            return;
        }

        const threshold = getKitchenEndingTriggerScrollZ(this.camera?.position?.z);
        if (this.gameGroup.position.z < threshold - KITCHEN_ENDING_SCROLL_EPSILON) {
            return;
        }

        this._kitchenEndingStarted = true;
        audioService.holdMusicDuringEndingFinale();
        this.gameGroup.position.z = Math.max(
            this.gameGroup.position.z,
            threshold
        );
        this.disable();

        const kitchen = window.gameEngine?.getAssetManager?.()?.getGameObject('kitchen');
        kitchen?.playEndingSequence?.();
    }

    _maybeTriggerDadsRoomSequence() {
        if (this._dadsRoomSequenceStarted || !this.enableMovement) return;
        if (!this.gameGroup || this.gameGroup.position.z < MAX_GAME_GROUP_Z - DADS_ROOM_TRIGGER_EPSILON) {
            return;
        }

        this._dadsRoomSequenceStarted = true;
        this.gameGroup.position.z = MAX_GAME_GROUP_Z;
        this._getHallway()?.stopShake();
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
            onWooshComplete: SKIP_DADDY_WAKE_IFRAME
                ? () => this._finishDadsRoomDoorThenKitchen()
                : undefined,
        });

        if (SKIP_DADDY_WAKE_IFRAME) return;

        setTimeout(() => {
            effectsService.playSfx('startupEffect');
            setTimeout(() => {
                cameraService.closeEyesFast();
                iframeControls.openIframe(DADDY_IFRAME_URL);
            }, 1000);
        }, 3100);
    }

    /** Dev flag: after hallway door woosh, skip iframe and run {@link finishDaddyWakeGame}. */
    _finishDadsRoomDoorThenKitchen() {
        effectsService.playSfx('startupEffect');
        this.finishDaddyWakeGame();
    }

    _getGameGroup() {
        const group = window.gameEngine?.sceneManager?.gameGroup ?? this.gameGroup;
        if (group) {
            this.gameGroup = group;
        }
        return group;
    }

    /**
     * Single kitchen entry — rail at SceneManager default (-5); camera via `lookAtKitchen`.
     */
    enterKitchenChapter() {
        window.gameEngine?.getThirties?.()?.stopChase?.();

        const gameGroup = this._getGameGroup();
        if (!gameGroup) return;

        cameraService.clearCameraTweens();
        gameGroup.position.set(0, 0, INITIAL_GAME_GROUP_Z);

        cameraService.lookAtKitchen({ duration: 0 });

        const interactionManager = window.gameEngine?.getInteractionManager?.();
        interactionManager?.syncOrbitToGameGroup?.(gameGroup);

        this.enable(true);
    }

    /** After pleaseDaddyWakeUp (or skip-iframe): same kitchen entry as dev spawn + chapter UI. */
    finishDaddyWakeGame() {
        if (this._daddyKitchenWakeDone) return;
        this._daddyKitchenWakeDone = true;

        this.enterKitchenChapter();

        const gameGroup = this._getGameGroup();
        const interactionManager = window.gameEngine?.getInteractionManager?.();
        interactionManager?.endProgrammaticCameraMove?.(gameGroup);

        interactionService.enable();
        backButtonManager.enable();
        speakButtonManager.enable();

        setTimeout(() => {
            cameraService.openEyes();
        }, 900);
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
            if (youZ > MOM_ENCOUNTER_Z) {
                this.encounterMom();
            }
            if (youZ > OUTSIDE_START_FLYING) {
                this.startFlying();
            }
            return;
        } else {

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
        this.disable();

        //REENABLE AFTER TESTING
        const kitchen = window.gameEngine?.getAssetManager?.()?.getGameObject('kitchen');
        
        cameraService.lookAtMom({
            duration: 1.2,
            onComplete: async () => {
                await dialogService.runLines([
                    { speaker: "Mom", text: "Hey honey. Good to see you outside of your room." },
                    { speaker: "Mom", text: "Thanks for waking up Dad! He just ran out! Think he'll make it in time." },
                    { speaker: "Mom", text: "You seem like you have something on your mind. What's up?" },
                    { speaker: "Inner Monologue", text: "Say something to your mom. Anything. It won't be graded, timed or sent to an online database. Just say something." },
                ]);
                const response = await voiceRecognition.getAndPrintStatement(false);
                await dialogService.runLines([
                    { speaker: "Mom", text: "That's wonderful honey. Why don't you go take a walk it's a wonderful evening."    },
                ]);

                const door = kitchen?.getKitchenDoor?.();
                cameraService.lookAtKitchen({
                    duration: 1.2,
                    onComplete: () => {
                        if (door && !door.doorOpen) {
                            door.open();
                        }
                        kitchen?.activateOutsideBeyondDoorAtmosphere?.();
                        this.enable(true);
                    },
                });
            },
        });
    }

    startFlying() {
        if (this._flyingStarted || !this.camera) return;
        this._flyingStarted = true;

        const targetY = 250;
        const startY = this.camera.position.y;
        const flySpeed = 2;
        const duration = Math.max(0.01, Math.abs(targetY - startY) / flySpeed);

        gsap.killTweensOf(this.camera.position);
        gsap.to(this.camera.position, {
            y: targetY,
            duration,
            ease: 'none',
        });
    }

    resumeAfterScrollBattle() {
        this._scrollBattleStarting = false;
        if (!this._firstScrollBattleWon && this._firstScrollBattleDone) {
            this._firstScrollBattleWon = true;
        } else if (this._secondScrollBattleDone) {
            this._secondScrollBattleWon = true;
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
        this._getHallway()?.stopShake();
    }
}
