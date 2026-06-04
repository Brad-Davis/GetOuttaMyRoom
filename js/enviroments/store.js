import loaderService from "../utils/loaderService.js";
import gsap from "gsap";
import items from "../templates/items.js";
import dialogService from "../utils/dialogService.js";
import dopamineManager from "../managers/dopamineManager.js";

class Store {
    constructor() {
        this.items = [];
        this.sprite = loaderService.createSprite("./resources/images/bedGoblin.png");
        this.shop = document.getElementById('shop');
        this.shop.classList.remove('is-open');
        this.shop.style.opacity = '0';
        this.storeVisited = false;
    }

    addItem(item) {
        const maxSlots = document.querySelectorAll('#shop-items .shop-item-container').length;
        if (this.items.length >= maxSlots) {
            console.warn('Shop slots are full');
            return;
        }
        this.items.push(item);
        this.renderShopItems();
    }

    removeItem(item) {
        const idx = this.items.indexOf(item);
        if (idx === -1) return;
        this.items.splice(idx, 1);
        this.renderShopItems();
    }

    renderShopItems() {
        const containers = document.querySelectorAll('#shop-items .shop-item-container');
        containers.forEach((container) => {
            container.innerHTML = '';
            container.classList.remove('has-item');
        });
        this.items.forEach((item, index) => {
            if (index >= containers.length) return;
            const container = containers[index];
            const imgHtml = item.image
                ? `<img src="${item.image}" alt="${item.name}" title="${item.name}" draggable="false">`
                : `<span class="item-name">${item.name}</span>`;
            container.innerHTML = `
                <div class="inventory-item" draggable="true" data-item-id="${item.id}" data-item-type="${item.type}">
                    ${imgHtml}
                </div>
            `;
            container.classList.add('has-item');
        });
    }

    showSetup(scene) {
        // window.goblin = this.sprite;
        dopamineManager.getDopamine()
        if (this.storeVisited === false && dopamineManager.getDopamine() > 0) {
            items.punch_001.value = dopamineManager.getDopamine();
            this.firstTimeWithDopamine();
            this.storeVisited = true;
        }
        scene.add(this.sprite);
        this.sprite.scale.set(0.8, 0.8, 0.8)
        this.sprite.position.set(3.5, -3.5, -7);
        gsap.to(this.sprite.position, {
            x: 0.8,
            y: -1.9,
            z: -7,
            duration: 1,
            ease: "power2.inOut"
        });
        this.sprite.visible = true;
        console.log("Store setup");
        this.shop.classList.add('is-open');
        this.shop.style.opacity = '1';
        this.renderShopItems();
    }

    async firstTimeWithDopamine() {
        await dialogService.runLines([
            {
                speaker: 'BED GOBLIN',
                text: 'GOOD YOU HAVE DOPAMINE. PURCHASE THE PUNCH THEN CONFRONT THAT UGLY LOUD MAN IN THE HALLWAY.',
            },
            {
                speaker: 'BED GOBLIN',
                text: 'DRAG IT INTO THE ACTIVE SLOT',
            },
            {
                speaker: 'BED GOBLIN',
                text: 'YOU CAN ALSO STORE YOUR OBJECTS IN YOUR BACKPACK BUT THEY WONT CHARGE IN BATTLE.',
            }
        ]);
    }

    hideSetup() {
        this.sprite.position.set(0.8, -1.9, -7);
        gsap.to(this.sprite.position, {
            x: 3.5,
            y: -3.5,
            z: -7,
            duration: 1,
            ease: "power2.inOut"
        });
        this.shop.classList.remove('is-open');
        this.shop.style.opacity = '0';
    }

    initialStoreSetup() {
        this.refillShop();
    }

    refillShop() {
        this.items = [];
        this.addItem(items.punch_001);
        items.punch_001.value = 10;
        if (this.shop?.classList.contains('is-open')) {
            this.renderShopItems();
        }
    }

    refillShopWithLinkedInItems() {
        this.items = [];
        this.addItem(items.podcast_001);
        this.addItem(items.shot_001);
        this.addItem(items.callEx_001);
        if (this.shop?.classList.contains('is-open')) {
            this.renderShopItems();
        }
    }

    refillShopWithYoutubeItems() {
        this.items = [];
        this.addItem(items.scream_001);
        this.addItem(items.political_001);
        this.addItem(items.musicTaste_001);
        if (this.shop?.classList.contains('is-open')) {
            this.renderShopItems();
        }
    }
}

const store = new Store();
store.initialStoreSetup();
export default store;