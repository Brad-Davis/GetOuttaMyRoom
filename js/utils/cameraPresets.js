import gsap from 'gsap';

export const CAMERA_PRESETS = {
    DEFAULT: {
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
    }
};

class CameraService {
    constructor() {
        this.camera = null;
        this.gsap = gsap;
        this.currentPreset = null;
        this.defaultPosition = { x: 0, y: 0, z: 0 };
        this.defaultRotation = { x: 0, y: 0, z: 0 };
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
