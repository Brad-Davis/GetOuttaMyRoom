import gsap from 'gsap';
import interactionService from './interactionService.js';
import audioService from './audioService.js';
import iframeControls from '../UI/iframeControls.js';
import iframeSites from '../config/iframeSites.js';
import dialogService from './dialogService.js';
import { DADS_ROOM_WALL_LOCAL_Z } from '../enviroments/hallway.js';
import {
    getKitchenCenter,
    getKitchenCameraPosition,
    getMomView,
    KITCHEN_SCROLL_ALIGNED_Z,
} from '../enviroments/kitchenLayout.js';

const KITCHEN_CENTER = getKitchenCenter();
const MOM_VIEW = getMomView();

const DEFAULT_VIEW_EPSILON = 0.12;

function nearlyEqual(a, b, eps = DEFAULT_VIEW_EPSILON) {
    return Math.abs(a - b) < eps;
}

export const CAMERA_PRESETS = {
    DEFAULT: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: Math.PI, z: 0 }
    },
    /** Before clicking the CD — in front of the room. */
    OUTSIDE_INTRO: {
        position: { x: 0, y: -0.5, z: 5 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    /** After the CD intro — same as original default “inside” view. */
    INTERIOR_START: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    BED_VIEW: {
        position: { x: 0, y: -1.5, z: -7 },
        rotation: { x: -Math.PI/2, y: -Math.PI/4, z: -Math.PI/2 }
    },
    DRESSER_VIEW: {
        position: { x: -2, y: -1, z: -7 },
        rotation: { x: 0, y: Math.PI/2, z: 0 }
    },
    COMPUTER_VIEW: {
        position: { x: -3.63, y: -0.8, z: -6.3 },
        rotation: { x: 0.3, y: Math.PI/2 + Math.PI/4, z: -Math.PI/16 - 0.01 }
    },
    SLEEPING_VIEW: {
        position: { x: 4.5, y: -1.5, z: -7 },
        rotation: { x: 0, y: Math.PI/2, z: -Math.PI/2 }
    },
    ENTER_DOOR_VIEW: {
        position: { x: -22, y: 1, z: -6 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    WOOSH_INTO_DOOR: {
        position: { x: -22, y: 1, z: -10.5 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    VOID_VIEW: {
        position: { x: -3.8, y: 4, z: -8.3 },
        rotation: { x: Math.PI/6, y: Math.PI/8, z: 0 }
    },
    /** CRT tape wall on the left (-X) wall, ~aligned with `_addVideoWallScreen` mesh pose. */
    VIDEO_WALL_VIEW: {
        position: { x: -3.35, y: -0.48, z: -3.8 },
        rotation: { x: 0, y: Math.PI / 2, z: 0 }
    },
    /** Right (+X) wall window — looks out at the cityscape GLB. */
    RIGHT_WINDOW_VIEW: {
        position: { x: 3.5, y: 0.2, z: -7.35 },
        rotation: { x: 0, y: -Math.PI / 2, z: 0 }
    },
    /** Grandpa poster on the back wall (`poster2` in bedroom). */
    POSTER2_VIEW: {
        position: { x: 3.1, y: 0.15, z: -7.7 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    /** Editor's note poster on the right wall (`poster5` in bedroom). */
    POSTER5_VIEW: {
        position: { x: 3.4, y: 0.05, z: -4 },
        rotation: { x: 0, y: -Math.PI / 2, z: 0 }
    },
    KITCHEN_VIEW: {
        position: { ...KITCHEN_CENTER },
        rotation: { x: 0, y: 0, z: 0 }
    },
    /** Framed on Mom at the back of the kitchen (`spawnMom` in kitchen.js). */
    MOM_VIEW: {
        position: { ...MOM_VIEW.position },
        rotation: { ...MOM_VIEW.rotation },
    },
};

class CameraService {
    constructor() {
        this.camera = null;
        this.gsap = gsap;
        this.currentPreset = null;
        this.defaultPosition = { x: 0, y: 0, z: 0 };
        this.defaultRotation = { x: 0, y: 0, z: 0 };
        this._wasAtInteriorDefault = true;
        this.grandpaDialogShown = false;
        this.editorsNoteDialogShown = false;
        /** @type {import('three').Mesh | null} */
        this._poster2Mesh = null;
        this._poster2DefaultPose = null;
        this._poster2PivotUp = 1.5;
        this._poster2Tilted = false;
        this.voidIntroShown = false;
        /** True only after VOID_VIEW is framed; next void click may open the iframe. */
        this._voidCanOpenIframe = false;
        this._voidDeepClickRaf = null;
    }

    /** Clears armed deep-click (BACK / leave void). Prevents same-frame multi-mesh double fire. */
    resetVoidDeepClick() {
        this._voidCanOpenIframe = false;
        if (this._voidDeepClickRaf != null) {
            cancelAnimationFrame(this._voidDeepClickRaf);
            this._voidDeepClickRaf = null;
        }
    }

    /** Call once after bedroom build (see AssetManager). */
    setPoster2Mesh(mesh) {
        if (!mesh) return;
        this._poster2Mesh = mesh;
        const h = mesh.geometry?.parameters?.height ?? 3;
        this._poster2PivotUp = h / 2;
        this._poster2DefaultPose = {
            position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
            rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        };
        this._poster2Tilted = false;
    }

    /** Tip the frame ~20° sideways, pivoting near the top edge. */
    tiltPoster2Frame() {
        const mesh = this._poster2Mesh;
        const def = this._poster2DefaultPose;
        if (!mesh || !def || this._poster2Tilted) return;

        this._poster2Tilted = true;
        const tilt = Math.PI / 9;
        const pivotUp = this._poster2PivotUp;

        gsap.killTweensOf(mesh.rotation);
        gsap.killTweensOf(mesh.position);

        gsap.to(mesh.rotation, {
            z: def.rotation.z + tilt,
            duration: 0.9,
            ease: 'power2.inOut',
        });
        gsap.to(mesh.position, {
            x: def.position.x + pivotUp * Math.sin(tilt),
            y: def.position.y + pivotUp * (1 - Math.cos(tilt)),
            duration: 0.9,
            ease: 'power2.inOut',
        });
    }

    resetPoster2Frame() {
        const mesh = this._poster2Mesh;
        const def = this._poster2DefaultPose;
        if (!mesh || !def) return;

        this._poster2Tilted = false;
        gsap.killTweensOf(mesh.rotation);
        gsap.killTweensOf(mesh.position);

        gsap.to(mesh.rotation, {
            x: def.rotation.x,
            y: def.rotation.y,
            z: def.rotation.z,
            duration: 0.6,
            ease: 'power2.inOut',
        });
        gsap.to(mesh.position, {
            x: def.position.x,
            y: def.position.y,
            z: def.position.z,
            duration: 0.6,
            ease: 'power2.inOut',
        });
    }

    initialize(camera) {
        this.camera = camera;
        this.defaultPosition = { ...camera.position };
        this.defaultRotation = { ...camera.rotation };
        console.log('Camera Service initialized');
    }

    // Centralized camera movement methods
    stopDresserMirrorWebcam() {
        window.gameEngine?.getAssetManager?.()?.getGameObject('dresser')?.stopMirrorWebcam?.();
    }

    lookAtBed() {
        if (!this.camera) {
            console.warn('Camera not initialized');
            return;
        }
        applyCameraPreset('BED_VIEW');
    }

    isAtSleepingView(cam = this.camera) {
        return (
            this.currentPreset === 'SLEEPING_VIEW' ||
            this.checkCameraPreset('SLEEPING_VIEW', cam)
        );
    }

    lookAtDresser() {
        if (!this.camera) return;
        
        applyCameraPreset('DRESSER_VIEW');
        // Add rotation animation...
    }

    getCameraPreset() {
        return this.currentPreset;
    }

    lookAtComputer() {
        if (!this.camera) return;
        applyCameraPreset('COMPUTER_VIEW');
    }


    async lookAtVoid() {
        if (!this.camera) return;

        if (this.currentPreset !== 'VOID_VIEW') {
            this.resetVoidDeepClick();
            applyCameraPreset('VOID_VIEW');
            if (!this.voidIntroShown) {
                this.voidIntroShown = true;
                await dialogService.runLines([
                    {
                        speaker: 'Inner Monologue',
                        text: 'You reach into the void and feel Noise Between Static. An old game that will not progress the main story but has it\'s own secrets.',
                    },
                    {
                        speaker: 'Inner Monologue',
                        text: 'Click again to go deeper.',
                    },
                ]);
            }
            this._voidDeepClickRaf = requestAnimationFrame(() => {
                this._voidDeepClickRaf = null;
                if (this.currentPreset === 'VOID_VIEW') {
                    this._voidCanOpenIframe = true;
                }
            });
            return;
        }

        if (!this._voidCanOpenIframe) return;

        this.resetVoidDeepClick();
        const site = iframeSites.noiseBetweenStatic;
        iframeControls.openIframe(site.url, { allow: site.allow });
    }

    lookAtVideoWall() {
        if (!this.camera) return;
        applyCameraPreset('VIDEO_WALL_VIEW');
        audioService.fadeOutBackgroundMusic();
    }

    lookAtRightWindow() {
        if (!this.camera) return;
        applyCameraPreset('RIGHT_WINDOW_VIEW');
        audioService.fadeOutBackgroundMusic();
    }

    lookAtPoster2() {
        if (!this.camera) return;
        if (this.currentPreset === 'POSTER2_VIEW') {

            if (this.grandpaDialogShown) {
                this.tiltPoster2Frame();
                return;
            }
            this.grandpaDialogShown = true;
            
            dialogService.runLines([
                {
                    speaker: 'Inner Monologue',
                    text: 'This is the final photo you have of your grandfather.',
                },
                {
                    speaker: 'Inner Monologue',
                    text: 'You put him into a Snapchat filter while he was in the depths of his dementia.',
                },
                {
                    speaker: 'Inner Monologue',
                    text: 'Doctors theorized this may have led to his passing.',
                },
                {
                    speaker: 'Inner Monologue',
                    text: 'Dad hung it up to teach you a lesson'
                }

            ]);
        } else {
            applyCameraPreset('POSTER2_VIEW');
        }
    }

    lookAtPoster5() {
        if (!this.camera) return;
        if (this.currentPreset === 'POSTER5_VIEW') {
            if (this.editorsNoteDialogShown) return;
            this.editorsNoteDialogShown = true;

            dialogService.runLines([
                {
                    speaker: "Editor's Note",
                    text: "Okay this is maybe self conscious or just honest as I'm writing this at 2:03am on June 4th, but I wanted to share an original intention of this piece that isn't in this current iteration.",
                },
                {
                    speaker: "Editor's Note",
                    text: 'I wanted this game to have two sides.',
                },
                {
                    speaker: "Editor's Note",
                    text: "The player what you are now and a guardian who would be secretly grading you from another location. You wouldn't know it's a grader and you would assume it's AI, as it currently is, but they would be watching you and deciding your fate.",
                },
                {
                    speaker: "Editor's Note",
                    text: 'In order to recreate this feeling to the best of my ability on a tight deadline 1/10 of your graders are replaced with just a random number generator returning your score.',
                },
                {
                    speaker: "Editor's Note",
                    text: "If you have qualms about the AI being in this game you are not alone so just assume you're one of the lucky ones.",
                },
                {
                    speaker: "Editor's Note",
                    text: "In any case this game is very token conscious, genuinely a full playthru is like 0.001 cents of tokens if that makes u feel any better. Next time I'll use human labor instead <3",
                },
            ]);
        } else {
            applyCameraPreset('POSTER5_VIEW');
        }
    }

    turnCamera(direction, options = {}) {
        if (!this.camera) return;
        gsap.to(this.camera.rotation, {
            y: this.camera.rotation.y + direction,
            duration: 1,
            ease: 'power2.inOut',
            onComplete: options.onComplete,
        });
    }

    resetToDefault() {
        if (!this.camera) return;
        this.stopDresserMirrorWebcam();
        this.voidIntroShown = false;
        this.resetVoidDeepClick();
        this.currentPreset = null;
        gsap.to(this.camera.position, {
            ...this.defaultPosition,
            duration: 1,
            ease: 'power2.inOut',
        });
        
        gsap.to(this.camera.rotation, {
            ...this.defaultRotation,
            duration: 1,
            ease: 'power2.inOut',
        });
    }

    sleepInBed(options = {}) {
        const fastEyelids = !!options.fastEyelids;
        if (!this.camera) return;
        applyCameraPreset('SLEEPING_VIEW', { duration: 0.1, ease: 'power2.inOut' });
        if (fastEyelids) this.closeEyesFast();
        else this.closeEyes();
    }

    closeEyes() {
        interactionService.setEyesClosed(true);
        const topEye = document.getElementById('topEye');
        const bottomEye = document.getElementById('bottomEye');
        if (topEye) topEye.style.transform = 'translate(0, -10%)';
        if (bottomEye) bottomEye.style.transform = 'translate(0, -10%)';
    }

    /** Snap lids shut, then restore transition so `openEyes()` still animates. */
    closeEyesFast() {
        interactionService.setEyesClosed(true);
        const topEye = document.getElementById('topEye');
        const bottomEye = document.getElementById('bottomEye');
        const lids = [topEye, bottomEye].filter(Boolean);

        for (const el of lids) {
            el.style.transition = 'none';
        }
        if (topEye) topEye.style.transform = 'translate(0, 0)';
        if (bottomEye) bottomEye.style.transform = 'translate(0, -10%)';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                for (const el of lids) {
                    el.style.transition = '';
                }
            });
        });
    }

    openEyes() {
        const topEye = document.getElementById('topEye');
        const bottomEye = document.getElementById('bottomEye');
        if (topEye) topEye.style.transform = 'translate(0, -100%)';
        if (bottomEye) bottomEye.style.transform = 'translate(0, 100%)';
        interactionService.setEyesClosed(false);
        audioService.startBackgroundMusic();
    }

    enterDoor(options = {}) {
        if (!this.camera) return;
        const { duration = 3, ease = 'power2.inOut', onComplete } = options;
        applyCameraPreset('ENTER_DOOR_VIEW', { duration, ease, onComplete });
    }

    wooshIntoDoor(options = {}) {
        if (!this.camera) return;
        const { duration = 0.5, ease = 'power2.inOut', onComplete } = options;
        applyCameraPreset('WOOSH_INTO_DOOR', { duration, ease, onComplete });
    }

    /**
     * CD-style approach at Dad's room wall — camera targets follow `gameGroup` scroll
     * so the door at {@link DADS_ROOM_WALL_LOCAL_Z} stays framed when the wall is reached.
     */
    runDadsRoomDoorSequence(gameGroup, options = {}) {
        if (!this.camera || !gameGroup) return;

        const { onEnterComplete, onWooshComplete } = options;
        const doorZ = gameGroup.position.z + DADS_ROOM_WALL_LOCAL_Z - 10;
        const rotation = { x: 0, y: 0, z: 0 };
        const enterPosition = { x: 0, y: 0, z: doorZ + 5 };
        const wooshPosition = { x: 0, y: 0, z: doorZ - 1 };

        this.transitionTo(enterPosition, rotation, {
            duration: 3,
            ease: 'power2.inOut',
            onComplete: onEnterComplete,
        });

        setTimeout(() => {
            this.transitionTo(wooshPosition, rotation, {
                duration: 0.5,
                ease: 'power2.inOut',
                onComplete: onWooshComplete,
            });
        }, 3100);
    }

    defaultRoomView() {
        if (!this.camera) return;
        applyCameraPreset('INTERIOR_START');
    }

    // Smooth camera transitions with callbacks
    transitionTo(position, rotation, options = {}) {
        const { duration = 1, ease = 'power2.inOut', onComplete } = options;
        
        const timeline = gsap.timeline();
        
        if (position) {
            timeline.to(this.camera.position, {
                ...position,
                duration,
                ease,
            }, 0);
        }
        
        if (rotation) {
            timeline.to(this.camera.rotation, {
                ...rotation,
                duration,
                ease,
            }, 0);
        }
        
        if (onComplete) {
            timeline.call(onComplete);
        }
        
        return timeline;
    }

    getCamera() {
        return this.camera;
    }

    getPosition() {
        return this.camera ? { ...this.camera.position } : null;
    }

    getRotation() {
        return this.camera ? { ...this.camera.rotation } : null;
    }

    checkCameraPreset(presetName, cam = this.camera) {
        const preset = CAMERA_PRESETS[presetName];
        if (!preset || !cam) return false;
        const p = cam.position;
        const r = cam.rotation;
        const ref = preset;
        return (
            nearlyEqual(p.x, ref.position.x) &&
            nearlyEqual(p.y, ref.position.y) &&
            nearlyEqual(p.z, ref.position.z) &&
            nearlyEqual(r.x, ref.rotation.x) &&
            nearlyEqual(r.y, ref.rotation.y) &&
            nearlyEqual(r.z, ref.rotation.z)
        );
    }

    /**
     * Matches the pose `backButtonManager.returnToDefaultPos` animates to (INTERIOR_START).
     */
    isAtInteriorDefault(cam = this.camera) {
        if (!cam) return true;
        const ref = CAMERA_PRESETS.INTERIOR_START;
        const p = cam.position;
        const r = cam.rotation;
        return (
            nearlyEqual(p.x, ref.position.x) &&
            nearlyEqual(p.y, ref.position.y) &&
            nearlyEqual(p.z, ref.position.z) &&
            nearlyEqual(r.x, ref.rotation.x) &&
            nearlyEqual(r.y, ref.rotation.y) &&
            nearlyEqual(r.z, ref.rotation.z)
        );
    }

    isAtVideoWallView(cam = this.camera) {
        if (!cam) return false;
        const ref = CAMERA_PRESETS.VIDEO_WALL_VIEW;
        const p = cam.position;
        const r = cam.rotation;
        return (
            nearlyEqual(p.x, ref.position.x) &&
            nearlyEqual(p.y, ref.position.y) &&
            nearlyEqual(p.z, ref.position.z) &&
            nearlyEqual(r.x, ref.rotation.x) &&
            nearlyEqual(r.y, ref.rotation.y) &&
            nearlyEqual(r.z, ref.rotation.z)
        );
    }

    isAtRightWindowView(cam = this.camera) {
        if (!cam) return false;
        const ref = CAMERA_PRESETS.RIGHT_WINDOW_VIEW;
        const p = cam.position;
        const r = cam.rotation;
        return (
            nearlyEqual(p.x, ref.position.x) &&
            nearlyEqual(p.y, ref.position.y) &&
            nearlyEqual(p.z, ref.position.z) &&
            nearlyEqual(r.x, ref.rotation.x) &&
            nearlyEqual(r.y, ref.rotation.y) &&
            nearlyEqual(r.z, ref.rotation.z)
        );
    }

    getCameraPosition() {
        return this.camera ? { ...this.camera.position } : null;
    }

    /** Fade ambient BGM back in whenever the camera settles at the room's starting pose. */
    updateInteriorBgm() {
        if (!this.camera) return;

        const atDefault = this.isAtInteriorDefault();
        if (atDefault === this._wasAtInteriorDefault) return;

        this._wasAtInteriorDefault = atDefault;
        if (atDefault) {
            void audioService.ensureDefaultBackgroundMusic();
        }
    }

    /** Kill hallway / Dad's-room camera tweens before kitchen spawn (iframe handoff only). */
    clearCameraTweens() {
        if (!this.camera) return;
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.camera.rotation);
    }

    lookAtKitchen(options = {}) {
        if (!this.camera) return;
        const { duration = 1, ease = 'power2.inOut', onComplete } = options;
        const gameGroup = window.gameEngine?.sceneManager?.gameGroup;
        const scrollZ = gameGroup?.position?.z ?? KITCHEN_SCROLL_ALIGNED_Z;
        const position = getKitchenCameraPosition(scrollZ);
        const rotation = CAMERA_PRESETS.KITCHEN_VIEW.rotation;
        this.currentPreset = 'KITCHEN_VIEW';

        if (duration === 0) {
            this.camera.position.set(position.x, position.y, position.z);
            this.camera.rotation.set(rotation.x, rotation.y, rotation.z);
            onComplete?.();
            return;
        }

        return this.transitionTo(position, rotation, { duration, ease, onComplete });
    }

    lookAtMom(options = {}) {
        if (!this.camera) return;
        applyCameraPreset('MOM_VIEW', options);
    }
}

const cameraService = new CameraService();
export default cameraService;

export function applyCameraPreset(presetName, options = {}) {
    const preset = CAMERA_PRESETS[presetName];
    if (!preset) {
        console.warn(`Camera preset '${presetName}' not found`);
        return;
    }
    const keepDresserMirror =
        presetName === 'DRESSER_VIEW' || presetName === 'COMPUTER_VIEW';
    if (!keepDresserMirror) {
        cameraService.stopDresserMirrorWebcam();
    }
    cameraService.currentPreset = presetName;
    return cameraService.transitionTo(preset.position, preset.rotation, options);
}
