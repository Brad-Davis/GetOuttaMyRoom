import SceneManager from './SceneManager.js';
import AssetManager from '../managers/AssetManager.js';
import InteractionManager from '../managers/InteractionManager.js';
import gameState from '../gameState.js';
import interactionService from '../utils/interactionService.js';
import cameraService, { applyCameraPreset } from '../utils/cameraPresets.js';
import textOverlay from '../UI/textOverlay.js';
import Thirties from '../people/thirties.js';
import { CD_STARTS_BATTLE_IMMEDIATELY } from '../config/gameFlow.js';

class GameEngine {
    constructor() {
        this.sceneManager = null;
        this.assetManager = null;
        this.interactionManager = null;
        this.isInitialized = false;
        this.animationId = null;
        this.thirties = null;
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
        await this.assetManager.loadGameObjects(
            this.sceneManager.gameGroup,
            this.sceneManager.camera
        );
    }

    setupInteractions() {
        console.log('Setting up interactions...');
        this.interactionManager.setupGameInteractions(
            this.assetManager.getInteractableObjects(),
            this.sceneManager.camera,
            gameState
        );

        const cd = this.assetManager.getGameObject('cd');
        if (cd) {
            cd.setImmediateBattleMode(CD_STARTS_BATTLE_IMMEDIATELY);
            cd.setOnImmediateBattle(async () => {
                const door = this.assetManager.getGameObject('door');
                applyCameraPreset('INTERIOR_START', {
                    duration: 1.1,
                    ease: 'power2.inOut',
                    onComplete: async () => {
                        await gameState.startBattleNow(door);
                        this.interactionManager.endProgrammaticCameraMove(
                            this.sceneManager.gameGroup
                        );
                    }
                });
            });
            // cd.setCamera(this.sceneManager.camera);
            cd.setOnHouseEntered(() => {
                // const finishCdIntro = () => {
                    this.interactionManager.endProgrammaticCameraMove(
                        this.sceneManager.gameGroup
                    );
                    interactionService.enable();
                    this.interactionManager.movement?.enable();

                    this.interactionManager.syncOrbitToGameGroup(this.sceneManager.gameGroup);

                    //ADD YOUR THIRTIES
                    if (!this.thirties) {
                        this.thirties = new Thirties(120, 1, 0, 0);
                        this.thirties.renderInGame(this.sceneManager.gameGroup);
                    }
                    

                    // Second camera move into the room; onComplete must run or interactions stay disabled.
                    // applyCameraPreset('INTERIOR_START', {
                    //     duration: 1.75,
                    //     ease: 'power2.inOut',
                    //     onComplete: finishCdIntro,
                    // });
                });
        }
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
