import * as THREE from 'three';
import sceneService from '../utils/sceneService.js';
import LightingFixture from '../items/lightingFixture.js';
import cameraService from '../utils/cameraPresets.js';

class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gameGroup = null;
        this.lightingSystem = null;
    }

    async initialize() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        this.setupBackground();
        this.setupEventListeners();
        
        console.log('Scene Manager initialized');
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.gameGroup = new THREE.Group();
        this.gameGroup.position.z = -5;
        this.scene.add(this.gameGroup);
        
        // Register with scene service for global access
        sceneService.setScene(this.scene);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );

        //STARTING POSITION!!!!
        // Start outside the room; CD intro moves you inside (see CD + GameEngine).
        // OG POSTION: this.camera.position.set(1.5, 0.7, 2.3);
        this.camera.position.set(-22,1,-2);
        // this.camera.position.set(0,0,0);
        this.camera.rotation.set(0,0,0);

        cameraService.initialize(this.camera);
        
        // Make camera globally accessible for legacy code
        window.camera = this.camera;
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        const container = document.getElementById('container');
        if (container) {
            container.prepend(this.renderer.domElement);
        } else {
            document.body.appendChild(this.renderer.domElement);
        }
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 5, 100);
        ambientLight.position.set(0, 3.5, 0);
        this.gameGroup.add(ambientLight);

        // Soft directional light
        const softLight = new THREE.DirectionalLight(0x404040, 0.3);
        softLight.position.set(4, 10, 10);
        this.gameGroup.add(softLight);

        // Lighting fixture with flickering effect
        this.lightingSystem = new LightingSystem(this.scene, ambientLight);
        this.lightingSystem.createFixture(10, 10, 0);
        this.lightingSystem.startFlickering();
    }

    setupBackground() {
        // const textureLoader = new THREE.TextureLoader();
        // textureLoader.load('./resources/images/sky.jpg', (texture) => {
        //     this.scene.background = texture;
        // });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer?.dispose();
        this.lightingSystem?.dispose();
    }

    // Getters
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }
    getGameGroup() { return this.gameGroup; }
}

// Lighting system for managing flickering effects
class LightingSystem {
    constructor(scene, ambientLight) {
        this.scene = scene;
        this.ambientLight = ambientLight;
        this.lightingFixture = null;
        this.targetIntensity = 0;
        this.currentIntensity = 0;
        this.rampSpeed = 0.005;
        this.flickerActive = false;
    }

    createFixture(x, y, z) {
        this.lightingFixture = new LightingFixture(this.scene);
        this.lightingFixture.createFixture(x, y, z);
    }

    startFlickering() {
        this.flickerActive = true;
        this.flickerLight();
    }

    flickerLight() {
        if (!this.flickerActive) return;
        
        this.targetIntensity = Math.random() * 0.01 + 0.05;
        this.rampSpeed = 0.001;
        this.rampToValue();
    }

    rampToValue() {
        if (!this.flickerActive) return;
        
        if (this.currentIntensity < this.targetIntensity - 0.001) {
            this.currentIntensity += this.rampSpeed;
            this.updateLightIntensity();
            requestAnimationFrame(() => this.rampToValue());
        } else if (this.currentIntensity > this.targetIntensity + 0.001) {
            this.currentIntensity -= this.rampSpeed;
            this.updateLightIntensity();
            requestAnimationFrame(() => this.rampToValue());
        } else {
            setTimeout(() => this.flickerLight(), Math.random() * 500 + 100);
        }
    }

    updateLightIntensity() {
        this.ambientLight.intensity = this.currentIntensity;
        if (this.lightingFixture) {
            this.lightingFixture.changeIntensity(this.currentIntensity * 1);
        }
    }

    dispose() {
        this.flickerActive = false;
    }
}

export default SceneManager;

