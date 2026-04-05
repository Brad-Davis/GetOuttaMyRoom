import * as THREE from 'three';
import { InteractionManager } from 'three.interactive';
import interactionService from '../utils/interactionService.js';
import Movement from '../controls/movement.js';
import BackButton from '../controls/backButton.js';
import textOverlay from '../UI/textOverlay.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class GameInteractionManager {
    constructor() {
        this.threeInteractionManager = null;
        this.movement = null;
        this.backButton = null;
        this.orbitControls = null;
    }

    initialize(renderer, camera) {
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

        this.orbitControls = new OrbitControls(camera, renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.update();

        console.log('Interaction Manager initialized');
    }

    setupGameInteractions(interactableObjects, camera, gameState) {
        console.log('Setting up game interactions...');

        // Setup back button for focused interactions
        this.backButton = new BackButton(camera, window.gsap, this.unsetAllFocus.bind(this), gameState);

        // Setup individual object interactions
        interactableObjects.forEach((item, key) => {
            this.setupObjectInteraction(key, item, camera, gameState);
        });

        // Enable interactions after setup
        setTimeout(() => {
            interactionService.enable();
            textOverlay.hide();
        }, 2000);
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
            default:
                console.warn(`Unknown interaction type: ${type}`);
        }
    }

    setupDoorInteraction(mesh, door, gameState) {
        mesh.addEventListener('click', async () => {
            if (!interactionService.checkEnabled()) return;

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
    }

    setupDresserInteraction(mesh, dresser, camera) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            console.log('Dresser clicked');
            if (!dresser.getDresserFocus()) {
                dresser.lookAtDresser(camera, window.gsap, this.backButton);
            }
        });
    }

    setupComputerInteraction(mesh, computer, camera) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            console.log('Computer clicked');
            const dresser = this.getGameObject('dresser');
            computer.lookAtComputer(camera, window.gsap, dresser?.getDresserFocus());
        });
    }

    setupCDInteraction(mesh, cd) {
        mesh.addEventListener('click', () => {
            console.log('CD clicked - exploding!');
            cd.onClick();
            textOverlay.hide();
            setTimeout(() => {
                interactionService.enable();
            }, 2000);
        });
    }

    setupBongInteraction(mesh, bong) {
        mesh.addEventListener('click', () => {
            console.log('Bong clicked!');
            bong.onClick();
        });
    }

    setupMoonInteraction(mesh, moon) {
        mesh.addEventListener('click', () => {
            if (!interactionService.checkEnabled()) return;

            console.log('Moon clicked!');
            moon.onClick();
        });
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
        // This would be injected or passed in during setup
        return null;
    }

    setMovementGameGroup(gameGroup) {
        if (this.movement) {
            this.movement.gameGroup = gameGroup;
        }
        if (this.orbitControls && gameGroup) {
            const worldPos = new THREE.Vector3();
            gameGroup.getWorldPosition(worldPos);
            this.orbitControls.target.copy(worldPos);
            this.orbitControls.update();
        }
    }

    /** Call once per frame (required for damping). */
    frameUpdate() {
        if (this.orbitControls) {
            this.orbitControls.update();
        }
    }

    dispose() {
        if (this.orbitControls) {
            this.orbitControls.dispose();
            this.orbitControls = null;
        }
        this.threeInteractionManager = null;
        this.movement = null;
        this.backButton = null;
    }
}

export default GameInteractionManager;
