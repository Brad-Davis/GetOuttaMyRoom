import * as THREE from 'three';
import { InteractionManager } from 'three.interactive';
import interactionService from '../utils/interactionService.js';
import dialogService from '../utils/dialogService.js';
import cameraService from '../utils/cameraPresets.js';
import Movement from '../controls/movement.js';
import backButtonManager from '../controls/backButton.js';
import speakButtonManager from '../controls/speakButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class GameInteractionManager {
    constructor() {
        this.threeInteractionManager = null;
        this.movement = null;
        this.orbitControls = null;
        this._camera = null;
        this.assetManager = null;
    }

    setAssetManager(assetManager) {
        this.assetManager = assetManager;
    }

    initialize(renderer, camera) {
        this._camera = camera;
        // Setup Three.js interaction manager
        this.threeInteractionManager = new InteractionManager(
            renderer,
            camera,
            renderer.domElement
        );

        // Register with interaction service
        interactionService.setInteractionManager(this.threeInteractionManager);

        // Setup movement controls
        this.movement = new Movement(camera, null); // Will set gameGroup later

        // this.movement.disable();
        //UNCOMMENT THIS TO ENABLE ORBIT CONTROLS
        // this.orbitControls = new OrbitControls(camera, renderer.domElement);
        // this.orbitControls.enableDamping = true;
        // this.orbitControls.dampingFactor = 0.05;
        // this.orbitControls.update();

        console.log('Interaction Manager initialized');
    }

    setupGameInteractions(interactableObjects, camera, gameState) {
        console.log('Setting up game interactions...');

        // Setup HUD buttons (module singletons)
        backButtonManager.init(camera, window.gsap, this.unsetAllFocus.bind(this), gameState);
        speakButtonManager.init(camera);

        // Setup individual object interactions
        interactableObjects.forEach((item, key) => {
            this.setupObjectInteraction(key, item, camera, gameState);
        });

        // Stay disabled until the player clicks the CD and the intro finishes (GameEngine wires CD callback).
    }

    setupObjectInteraction(objectName, item, camera, gameState) {
        const { object, mesh, type } = item;

        if (!mesh) {
            console.warn(`No mesh found for ${objectName}`);
            return;
        }

        // Add to interaction manager
        this.threeInteractionManager.add(mesh);

        // Setup click handlers based on object type
        switch (type) {
            case 'door':
                this.setupDoorInteraction(mesh, object, gameState);
                break;
            case 'dresser':
                this.setupDresserInteraction(mesh, object, camera);
                break;
            case 'computer':
                this.setupComputerInteraction(mesh, object, camera);
                break;
            case 'cd':
                this.setupCDInteraction(mesh, object);
                break;
            case 'bong':
                this.setupBongInteraction(mesh, object);
                break;
            case 'moon':
                this.setupMoonInteraction(mesh, object);
                break;
            case 'void':
                this.setupVoidInteraction(mesh, object);
                break;
            case 'videoWall':
                this.setupVideoWallInteraction(mesh, object);
                break;
            case 'rightWindow':
                this.setupRightWindowInteraction(mesh);
                break;
            case 'poster2':
                this.setupPoster2Interaction(mesh);
                break;
            case 'bed':
                this.setupBedInteraction(mesh, object, gameState);
                break;
            default:
                console.warn(`Unknown interaction type: ${type}`);
        }
    }

    setupDoorInteraction(mesh, door, gameState) {
        mesh.addEventListener('click', async () => {
            if (!interactionService.checkEnabled()) return;
            if (!cameraService.isAtInteriorDefault()) return;

            if (door.doorOpen) {
                door.close();
                this.movement.disable();
            } else {
                const battleStarted = await gameState.goToBattle(door);
                if (battleStarted) {
                    door.open();
                }
            }
        });
        this.addCursorListener(mesh);
    }

    setupVoidInteraction(mesh) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            cameraService.lookAtVoid();
        });
        this.addCursorListener(mesh);
    }

    setupVideoWallInteraction(mesh, bedroom) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            bedroom?.enableVideoWallAudio();
            cameraService.lookAtVideoWall();
        });
        this.addCursorListener(mesh);
    }

    setupRightWindowInteraction(mesh) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            cameraService.lookAtRightWindow();
        });
        this.addCursorListener(mesh);
    }

    setupPoster2Interaction(mesh) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            cameraService.lookAtPoster2();
        });
        this.addCursorListener(mesh);
    }


    setupBedInteraction(mesh, _bed, gameState) {
        mesh.addEventListener('click', async () => {
            if (!interactionService.checkEnabled()) return;
            if (cameraService.isAtSleepingView()) return;

            await dialogService.start('bed_goblin_intro');
            gameState.goToStore();
            cameraService.lookAtBed();
        });
        this.addCursorListener(mesh);
    }

    setupDresserInteraction(mesh, dresser, camera) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            console.log('Dresser clicked');
            if (!dresser.getDresserFocus()) {
                dresser.lookAtDresser();
            }
        });
        this.addCursorListener(mesh);
        
    }

    setupComputerInteraction(mesh, computer, camera) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            const dresser = this.getGameObject('dresser');
            if (!dresser?.getDresserFocus()) {
                return;
            }

            console.log('Computer clicked');
            computer.lookAtComputer(camera, window.gsap, dresser.getDresserFocus());
        });
        this.addCursorListener(mesh);
    }

    setupCDInteraction(mesh, cd) {
        mesh.addEventListener('click', () => {
            console.log('CD clicked - exploding!');
            this.beginProgrammaticCameraMove();
            cd.onClick();
        });

        mesh.addEventListener('mouseenter', () => {
            cd.onHover();
        });

        mesh.addEventListener('mouseleave', () => {
            cd.onHoverLeave();
        });
        this.addCursorListener(mesh);
    }

    setupBongInteraction(mesh, bong) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            console.log('Bong clicked!');
            bong.onClick();
        });
        this.addCursorListener(mesh);
    }

    setupMoonInteraction(mesh, moon) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            console.log('Moon clicked!');
            moon.onClick();
        });
        this.addCursorListener(mesh);
    }

    unsetAllFocus() {
        // This would be called by back button to unfocus all objects
        const dresser = this.getGameObject('dresser');
        const computer = this.getGameObject('computer');
        
        dresser?.unsetFocus();
        computer?.unsetFocus();
    }

    // Helper method to get game objects (would need reference to AssetManager)
    getGameObject(name) {
        return this.assetManager?.getGameObject(name) ?? null;
    }

    setMovementGameGroup(gameGroup) {
        if (this.movement) {
            this.movement.gameGroup = gameGroup;
        }
        this.syncOrbitToGameGroup(gameGroup);
    }

    syncOrbitToGameGroup(gameGroup) {
        if (this.orbitControls && gameGroup) {
            const worldPos = new THREE.Vector3();
            gameGroup.getWorldPosition(worldPos);
            this.orbitControls.target.copy(worldPos);
            this.orbitControls.update();
        }
    }

    beginProgrammaticCameraMove() {
        this._orbitUpdatesSuspended = true;
    }

    /**
     * Call after GSAP (or other code) finishes moving the camera so OrbitControls
     * internal state matches the new pose.
     */
    endProgrammaticCameraMove(gameGroup) {
        this._orbitUpdatesSuspended = false;
        if (gameGroup) {
            this.syncOrbitToGameGroup(gameGroup);
        } else if (this.orbitControls) {
            this.orbitControls.update();
        }
    }

    /** Call once per frame (Orbit damping + three.interactive hover / enter-leave). */
    frameUpdate() {
        // three.interactive: mouseenter/mouseleave are emitted from update() (raycast vs last frame).
        if (this.threeInteractionManager) {
            this.threeInteractionManager.update();
        }
        if (this.orbitControls && !this._orbitUpdatesSuspended) {
            this.orbitControls.update();
        }
        backButtonManager.updateVisibility();
        speakButtonManager.updateVisibility();
        cameraService.updateInteriorBgm();
        this.movement?.frameUpdate();
    }

    dispose() {
        this._orbitUpdatesSuspended = false;
        if (this.orbitControls) {
            this.orbitControls.dispose();
            this.orbitControls = null;
        }
        this.threeInteractionManager = null;
        this.movement = null;
        backButtonManager.dispose();
        speakButtonManager.dispose();
    }

    addCursorListener(mesh) {
        mesh.addEventListener('mouseenter', () => {
            document.body.style.cursor = 'pointer';
        });
        mesh.addEventListener('mouseleave', () => {
            document.body.style.cursor = '';
        });
    }

    getMovement(){
        return this.movement;
    }
}

export default GameInteractionManager;
