import SceneManager from './SceneManager.js';
import AssetManager from '../managers/AssetManager.js';
import InteractionManager from '../managers/InteractionManager.js';
import gameState from '../gameState.js';
import interactionService from '../utils/interactionService.js';
import cameraService, { applyCameraPreset } from '../utils/cameraPresets.js';
import textOverlay from '../UI/textOverlay.js';
import Thirties from '../people/thirties.js';
import {
    CD_STARTS_BATTLE_IMMEDIATELY,
    SKIP_INTRO,
    shouldSkipThirdFight,
    SPAWN_IN_KITCHEN,
} from '../config/gameFlow.js';
import effectsService from '../utils/effectsService.js';
import iframeControls from '../UI/iframeControls.js';
import { dismissInitialLoadingScreen } from '../utils/initialLoadingScreen.js';

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
            await Promise.all([
                effectsService.preloadSfxLibrary(),
                this.sceneManager.initialize(),
            ]);
            await this.assetManager.initialize();
            this.interactionManager.initialize(
                this.sceneManager.renderer,
                this.sceneManager.camera
            );
            this.interactionManager.setMovementGameGroup(this.sceneManager.gameGroup);

            // Load game assets
            await this.loadGameAssets();
            await this.spawnThirties();
            
            // Setup interactions
            this.setupInteractions();

            gameState.applyDevSkipCheckpointsAtStart();
            
            // Start game loop
            this.startGameLoop();

            if (SPAWN_IN_KITCHEN) {
                await this.applyKitchenDevSpawn();
            } else if (SKIP_INTRO) {
                await this.applySkipIntroFlow();
            }
            
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

    async spawnThirties() {
        if (this.thirties) return;
        this.thirties = new Thirties(120, 1, 0, 0);
        await this.thirties.renderInGame(this.sceneManager.gameGroup);
    }

    getThirties() {
        return this.thirties;
    }

    async applyKitchenDevSpawn() {
        textOverlay.clearBottomOverlay();
        textOverlay.hide();
        dismissInitialLoadingScreen();

        const activeItems = document.getElementById('active-items');
        if (activeItems) activeItems.style.display = 'flex';

        this.interactionManager.movement.enterKitchenChapter();
        interactionService.enable();
    }

    async applySkipIntroFlow() {
        // Stop constructor-started bottom-HUD blink ("Click the CD"); otherwise #overlay flashes the whole skip path.
        textOverlay.clearBottomOverlay();
        textOverlay.hide();

        const cd = this.assetManager.getGameObject('cd');
        cd?.skipIntroTeardown?.();

        const door2 = this.assetManager.getGameObject('door2');
        if (door2 && !door2.doorOpen) {
            door2.open();
        }

        const activeItems = document.getElementById('active-items');
        if (activeItems) activeItems.style.display = 'flex';

        dismissInitialLoadingScreen();

        if (shouldSkipThirdFight()) {
            applyCameraPreset('INTERIOR_START', { duration: 0 });
            cameraService.openEyes();
            await iframeControls.hideIframe(false);
            textOverlay.hide();
            interactionService.enable();
            gameState.startThirtiesChapter();
            return;
        }

        cameraService.sleepInBed({ fastEyelids: true });

        // `hideIframe(true)` awaits dialog — dismiss loader first or it never leaves.
        await iframeControls.hideIframe(true);
        // `endDialog()` shows bottom HUD again — keep overlay hidden during normal play.
        textOverlay.hide();
        interactionService.enable();
    }

    setupInteractions() {
        console.log('Setting up interactions...');
        this.interactionManager.setAssetManager(this.assetManager);
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
                        // Open door as soon as the intro camera lands — not after spawnEnemy()
                        // (startBattleNow would otherwise delay sound + mesh until battle setup finishes).
                        if (door && !door.doorOpen) {
                            door.open();
                        }
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
                    // Scroll (wheel) movement is enabled after beating the uncle — see gameState.winBattle.

                    this.interactionManager.syncOrbitToGameGroup(this.sceneManager.gameGroup);

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
        effectsService.update();
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
        effectsService.dispose();
    }

    // Getters for other systems to access managers
    getSceneManager() { return this.sceneManager; }
    getAssetManager() { return this.assetManager; }
    getInteractionManager() { return this.interactionManager; }
}

export default GameEngine;
