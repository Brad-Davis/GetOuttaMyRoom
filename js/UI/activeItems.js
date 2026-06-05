class ActiveItems {
    constructor() {
        this.items = [null, null];
        this.size = 2;
    }
    
    addItem(item, placementIndex) {
        if (this.items[placementIndex] === null) {
            this.items[placementIndex] = item;
            this.renderItems();
            return null;
        } else {
            const oldItem = this.swapItems(item, placementIndex);
            this.renderItems();
            return oldItem;
        }
    }

    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items[index].isReady = false;
            this.items[index].currentCharge = 0;
            this.items[index] = null;
        }
        this.renderItems();
    }

    swapItems(item, placementIndex) {
        const oldItem = this.items[placementIndex];
        oldItem.isReady = false;
        oldItem.currentCharge = 0;
        this.items[placementIndex] = item;
        return oldItem;
    }

    renderItems() {
        throw new Error("renderItems must be implemented by subclass");
    }

    isFull() {
        return this.items.filter(item => item !== null).length >= this.size;
    }

    getItemContainers() {
        const activeItemsElement = this.getActiveItemsElement();
        if (!activeItemsElement) return [];
        return Array.from(activeItemsElement.querySelectorAll(this.getContainerSelector()));
    }

    tickItems(timeAmount) {
        const containers = this.getItemContainers();
        
        this.items.forEach((item, index) => {
            if (item) {
                item.tick(timeAmount, index, containers);
                if (this instanceof EnemyActiveItems) {
                    if (item.isReady && this._currentEnemy && !this._currentEnemy.isDefeated) {
                        const container = containers[index];
                        this._currentEnemy.onEnemyItemUsed?.(item, index);
                        item.onUse(container.children[0], container, true);
                    }
                }
            } else {
                const container = containers[index];
                if (container) {
                    container.style.background = `rgba(192, 192, 192, 0)`;
                }
            }
        });
    }

    getActiveItemsElement() {
        throw new Error("getActiveItemsElement must be implemented by subclass");
    }

    getContainerSelector() {
        throw new Error("getContainerSelector must be implemented by subclass");
    }

    refreshAllChargeVisuals() {
        const containers = this.getItemContainers();
        this.items.forEach((item, index) => {
            const container = containers[index];
            if (item) {
                item.resetChargeVisual(container);
            } else if (container) {
                container.style.background = `rgba(192, 192, 192, 0)`;
            }
        });
    }

    renderItemsToContainers(containerName, options = {}) {
        const containers = document.querySelectorAll(containerName);
        const itemClass = options.itemClass ?? 'active-item';
        const draggable = options.draggable !== false;
        
        this.items.forEach((item, index) => {
            if (index < containers.length) {
                const container = containers[index];
                const currentItemId = container.querySelector(`.${itemClass}`)?.getAttribute('data-item-id');
                const newItemId = item?.id;
                
                if (currentItemId !== newItemId) {
                    if (item !== null) {
                        const dragAttr = draggable ? ' draggable="true"' : '';
                        container.innerHTML = `
                            <div class="${itemClass}"${dragAttr} data-item-id="${item.id}" data-item-type="${item.type}">
                                <img src="${item.image}" alt="${item.name}" title="${item.name}" draggable="false">
                            </div>
                        `;
                        container.classList.add('has-item');
                    } else {
                        container.innerHTML = '';
                        container.classList.remove('has-item');
                        container.style.background = `rgba(192, 192, 192, 0)`;
                    }
                }
            }
        });
    }
}

class PlayerActiveItems extends ActiveItems {
    constructor() {
        super();
        this.items = [];
        this.size = Infinity;
    }

    getActiveItemsElement() {
        return document.getElementById('active-items');
    }

    getSlotsElement() {
        return document.getElementById('active-items-slots');
    }

    getContainerSelector() {
        return '.active-item-container';
    }

    getItemContainers() {
        const slots = this.getSlotsElement();
        if (!slots) return [];
        return Array.from(slots.querySelectorAll(this.getContainerSelector()));
    }

    syncContainers() {
        const slots = this.getSlotsElement();
        if (!slots) return;

        const existing = slots.querySelectorAll(this.getContainerSelector());
        const needed = this.items.length;

        for (let i = existing.length - 1; i >= needed; i--) {
            existing[i].remove();
        }

        for (let i = existing.length; i < needed; i++) {
            const div = document.createElement('div');
            div.className = 'status-bar-field active-item-container';
            slots.appendChild(div);
        }
    }

    addItem(item, placementIndex = null) {
        if (placementIndex === null || placementIndex >= this.items.length) {
            this.items.push(item);
            this.syncContainers();
            this.renderItems();
            return null;
        }

        const displaced = this.items[placementIndex];
        if (displaced) {
            displaced.isReady = false;
            displaced.currentCharge = 0;
        }
        this.items[placementIndex] = item;
        if (displaced) {
            this.items.push(displaced);
            this.syncContainers();
        }
        this.renderItems();
        return displaced ?? null;
    }

    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index === -1) return;
        item.isReady = false;
        item.currentCharge = 0;
        this.items.splice(index, 1);
        this.syncContainers();
        this.renderItems();
    }

    reorderItem(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.items.length) return;
        if (toIndex < 0 || toIndex >= this.items.length) return;

        const [item] = this.items.splice(fromIndex, 1);
        this.items.splice(toIndex, 0, item);
        this.renderItems();
    }

    isFull() {
        return false;
    }

    updateTitleVisibility() {
        const title = this.getActiveItemsElement()?.querySelector('.active-items-title');
        if (title) {
            title.hidden = this.items.length === 0;
        }
    }

    renderItems() {
        this.syncContainers();
        const slots = this.getSlotsElement();
        const selector = slots ? '#active-items-slots .active-item-container' : this.getContainerSelector();
        super.renderItemsToContainers(selector, { itemClass: 'active-item', draggable: true });
        this.updateTitleVisibility();
    }
}

class EnemyActiveItems extends ActiveItems {
    constructor() {
        super();
        /** @type {import('../templates/enemy.js').default | null} */
        this._currentEnemy = null;
    }

    addItem(item, placementIndex) {
        if (this.items[placementIndex] === null) {
            this.items[placementIndex] = item;
            this.renderItems();
            return null;
        }
    }  

    renderItems() {
        super.renderItemsToContainers(this.getContainerSelector(), { itemClass: 'enemy-active-item', draggable: false });
    }

    getActiveItemsElement() {
        return document.getElementById('enemy-active-items');
    }

    getContainerSelector() {
        return '.enemy-active-item-container';
    }

    renderEnemyItems(enemy) {
        this._currentEnemy = enemy;
        this.items = enemy.items;
        this.renderItems();
        this.showEnemyItems();
    }

    showEnemyItems() {
        const itemsEl = document.getElementById('enemy-active-items');
        const titleEl = document.getElementById('enemy-active-items-title');
        if (itemsEl) {
            itemsEl.style.opacity = '1';
            itemsEl.style.pointerEvents = 'auto';
        }
        if (titleEl) {
            titleEl.style.opacity = '1';
        }
    }

    hideEnemyItems() {
        const itemsEl = document.getElementById('enemy-active-items');
        const titleEl = document.getElementById('enemy-active-items-title');
        if (itemsEl) {
            itemsEl.style.opacity = '0';
            itemsEl.style.pointerEvents = 'none';
        }
        if (titleEl) {
            titleEl.style.opacity = '0';
        }
        this._currentEnemy = null;
    }
}

const enemyActiveItems = new EnemyActiveItems();
const playerActiveItems = new PlayerActiveItems();

export { ActiveItems, enemyActiveItems, playerActiveItems };
