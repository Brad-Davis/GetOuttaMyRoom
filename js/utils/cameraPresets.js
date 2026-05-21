import gsap from 'gsap';
import interactionService from './interactionService.js';
import audioService from './audioService.js';
import iframeControls from '../UI/iframeControls.js';

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
    }
};

class CameraService {
    constructor() {
        this.camera = null;
        this.gsap = gsap;
        this.currentPreset = null;
        this.defaultPosition = { x: 0, y: 0, z: 0 };
        this.defaultRotation = { x: 0, y: 0, z: 0 };
        this._wasAtInteriorDefault = true;
    }

    initialize(camera) {
        this.camera = camera;
        this.defaultPosition = { ...camera.position };
        this.defaultRotation = { ...camera.rotation };
        console.log('Camera Service initialized');
    }

    // Centralized camera movement methods
    lookAtBed() {
        console.log('Looking at bed');
        if (!this.camera) {
            console.warn('Camera not initialized');
            return;
        }

        gsap.to(this.camera.position, {
            x: 0,
            z: -7,
            y: -1.5,
            duration: 1,
            ease: 'power2.inOut',
        });
        
        gsap.to(this.camera.rotation, {
            x: -Math.PI/2,
            z: -Math.PI/2,
            y: -Math.PI/4,
            duration: 1,
            ease: 'power2.inOut',
        });
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

    lookAtVoid() {
        if (!this.camera) return;
        applyCameraPreset('VOID_VIEW');
        setTimeout(() => {
            iframeControls.openIframe('https://noisebetweenstatic.com/', { externalEmbed: true });
        }, 1500);
    }

    lookAtVideoWall() {
        if (!this.camera) return;
        applyCameraPreset('VIDEO_WALL_VIEW');
        audioService.fadeOutBackgroundMusic();
    }

    resetToDefault() {
        if (!this.camera) return;
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
        if (topEye) topEye.style.transform = 'translate(0, 0)';
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
        setTimeout(() => {
            interactionService.setEyesClosed(false);
        }, 2000);
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

    checkCameraPreset(presetName) {
        const preset = CAMERA_PRESETS[presetName];
        const position = preset.position;
        if (this.camera.position.x === position.x && this.camera.position.z === position.z && this.camera.position.y === position.y) {
            return true;
        }
        return false;
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

    /** Fade ambient BGM back in whenever the camera settles at the room's starting pose. */
    updateInteriorBgm() {
        if (!this.camera) return;

        const atDefault = this.isAtInteriorDefault();
        if (atDefault === this._wasAtInteriorDefault) return;

        this._wasAtInteriorDefault = atDefault;
        if (atDefault) {
            audioService.fadeInBackgroundMusic();
        }
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
    cameraService.currentPreset = presetName;
    return cameraService.transitionTo(preset.position, preset.rotation, options);
}
