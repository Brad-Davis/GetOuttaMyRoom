import Door from '../items/door.js';
import Rug from '../items/rug.js';
import Bed from '../items/bed.js';
import Moon from '../items/moon.js';
import Bong from '../items/bong.js';
import Dresser from '../items/dresser.js';
import Computer from '../items/computer.js';
import CD from '../items/cd.js';
import Bedroom from '../enviroments/bedroom.js';
import OpeningMenu from '../enviroments/openingMenu.js';
import Enemy from '../templates/enemy.js';
import gsap from 'gsap';

class AssetManager {
    constructor() {
        this.gameObjects = new Map();
        this.interactableObjects = new Map();
        this.animatedObjects = [];
        this.enemies = [];
    }

    async initialize() {
        // Make gsap globally accessible for legacy code
        window.gsap = gsap;
        console.log('Asset Manager initialized');
    }

    async loadCriticalAssets() {
        // Load any critical assets that need to be ready before game starts
        console.log('Loading critical assets...');
    }

    async loadGameObjects(gameGroup, camera = null) {
        console.log('Loading game objects...');
        
        // Load static objects
        await this.loadStaticObjects(gameGroup);
        
        // Load interactive objects
        await this.loadInteractiveObjects(gameGroup);
        
        // Load animated objects
        this.loadAnimatedObjects(gameGroup, camera);
        
        // Generate enemies
        // this.generateEnemies();
        
        console.log('Game objects loaded successfully');
    }

    async loadStaticObjects(gameGroup) {
        // Opening menu shell (invert box, camera goes inside — tune `width` / `height` / anchor `x` `y` `z`).
        const openingMenu = new OpeningMenu({
            width: 10,
            height: 6,
            depth: 10,
            x: -22,
            y: 1,
            z: -2,
            interiorTexture: 'sky.jpg',
            textureRepeat: { x: 7, y: 7 },
            wallColor: 0xffffff,
            rotationSpeedY: 0.0001,
        });
        openingMenu.buildRoom(gameGroup);
        this.gameObjects.set('openingMenu', openingMenu);
        this.animatedObjects.push(openingMenu);

        // Room/Environment
        const bedroom = new Bedroom();
        bedroom.buildRoom(gameGroup);
        this.gameObjects.set('bedroom', bedroom);
        if (bedroom.rainEffect) {
            this.animatedObjects.push({
                update: () => bedroom.rainEffect.update(),
            });
        }

        // Rug
        const rug = new Rug(gameGroup);
        rug.createRug(0, -3, -1.5);
        this.gameObjects.set('rug', rug);
    }

    async loadInteractiveObjects(gameGroup) {
        // Door
        const door = new Door(gameGroup);
        door.createDoor(0, -1, -5);

        const door2 = new Door(gameGroup);
        door2.createDoor(-22,0,-6);
        this.gameObjects.set('door', door);
        this.interactableObjects.set('door', {
            object: door,
            mesh: door.getDoorMesh(),
            type: 'door'
        });

        // Models that need async loading
        await this.loadAsyncModels(gameGroup);
    }

    async loadAsyncModels(gameGroup) {
        try {
            // Bed
            const bed = new Bed(gameGroup);
            await bed.createBed(3.5, -3, -1.5, gsap, null, null, null); // Will set camera/interaction later
            this.gameObjects.set('bed', bed);

            // Bong
            const bong = new Bong(gameGroup);
            await bong.createBong(-4, -1.5, -3);
            this.gameObjects.set('bong', bong);

            // Dresser
            const dresser = new Dresser(gameGroup);
            await dresser.createDresser(-4, -3, -2);
            this.gameObjects.set('dresser', dresser);
            this.interactableObjects.set('dresser', {
                object: dresser,
                mesh: dresser.getDresserMesh(),
                type: 'dresser'
            });

            // Computer
            const computer = new Computer(gameGroup);
            await computer.createComputer(-4, -1.5, -0.9);
            this.gameObjects.set('computer', computer);
            this.interactableObjects.set('computer', {
                object: computer,
                mesh: computer.getComputerMesh(),
                type: 'computer'
            });
            this.interactableObjects.set('bong', {
                object: bong,
                mesh: bong.getBongMesh(),
                type: 'bong'
            });

        } catch (error) {
            console.error('Error loading async models:', error);
        }
    }

    loadAnimatedObjects(gameGroup, camera = null) {
        // Moon
        const moon = new Moon(gameGroup);
        moon.createMoon(7, 2, -6);
        this.gameObjects.set('moon', moon);
        this.animatedObjects.push(moon);
        this.interactableObjects.set('moon', {
            object: moon,
            mesh: moon.getMoonMesh(),
            type: 'moon'
        });

        // CD
        const cd = new CD(gameGroup, camera);
        // cd.createCD(0.25, -0.5, 7);
        cd.createCD(-22,1,-2);
        this.gameObjects.set('cd', cd);
        this.animatedObjects.push(cd);
        this.interactableObjects.set('cd', {
            object: cd,
            mesh: cd.getCDMesh(),
            type: 'cd'
        });
    }

    updateAnimatedObjects() {
        this.animatedObjects.forEach(obj => {
            if (obj.rotateMoon) obj.rotateMoon();
            if (obj.rotateCD) obj.rotateCD();
            if (typeof obj.update === 'function') obj.update();
        });
    }

    // Getters
    getGameObject(name) {
        return this.gameObjects.get(name);
    }

    getInteractableObjects() {
        return this.interactableObjects;
    }

    dispose() {
        this.gameObjects.clear();
        this.interactableObjects.clear();
        this.animatedObjects = [];
    }
}

export default AssetManager;
