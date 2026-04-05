import * as THREE from 'three';
import SceneManager from './SceneManager.js';
import AssetManager from '../managers/AssetManager.js';
import InteractionManager from '../managers/InteractionManager.js';
import gameState from '../gameState.js';

class GameEngine {
    constructor() {
        this.sceneManager = null;
        this.assetManager = null;
        this.interactionManager = null;
        this.isInitialized = false;
        this.animationId = null;
    }

    async initialize() {
        try {
            console.log('Initializing Game Engine...');
            
            // Initialize managers in order
            this.sceneManager = new SceneManager();
            this.assetManager = new AssetManager();
            this.interactionManager = new InteractionManager();

            // Setup core systems
            await this.sceneManager.initialize();
            await this.assetManager.initialize();
            this.interactionManager.initialize(
                this.sceneManager.renderer,
                this.sceneManager.camera
            );
            this.interactionManager.setMovementGameGroup(this.sceneManager.gameGroup);

            // Load game assets
            await this.loadGameAssets();
            
            // Setup interactions
            this.setupInteractions();
            
            // Start game loop
            this.startGameLoop();
            
            this.isInitialized = true;
            console.log('Game Engine initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Game Engine:', error);
            throw error;
        }
    }

    async loadGameAssets() {
        console.log('Loading game assets...');
        await this.assetManager.loadCriticalAssets();
        await this.assetManager.loadGameObjects(this.sceneManager.gameGroup);
    }

    setupInteractions() {
        console.log('Setting up interactions...');
        this.interactionManager.setupGameInteractions(
            this.assetManager.getInteractableObjects(),
            this.sceneManager.camera,
            gameState
        );
    }

    startGameLoop() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this.update();
            this.render();
        };
        animate();
    }

    update() {
        this.interactionManager?.frameUpdate();
        this.assetManager.updateAnimatedObjects();
    }

    render() {
        this.sceneManager.render();
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.sceneManager?.dispose();
        this.assetManager?.dispose();
        this.interactionManager?.dispose();
    }

    // Getters for other systems to access managers
    getSceneManager() { return this.sceneManager; }
    getAssetManager() { return this.assetManager; }
    getInteractionManager() { return this.interactionManager; }
}

export default GameEngine;
