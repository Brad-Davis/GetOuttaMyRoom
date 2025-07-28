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
        console.log(oldItem);
        return oldItem;
    }

    // Base renderItems method - subclasses should override with specific selectors
    renderItems() {
        throw new Error("renderItems must be implemented by subclass");
    }

    isFull() {
        return this.items.filter(item => item !== null).length >= this.size;
    }

    // Base tickItems method - subclasses can override with specific element selectors
    tickItems(timeAmount) {
        const activeItemsElement = this.getActiveItemsElement();
        
        this.items.forEach((item, index) => {
            if (item) {
                item.tick(timeAmount, index, activeItemsElement.children);
                if (this instanceof EnemyActiveItems) {
                    if (item.isReady) {
                        const container = activeItemsElement.children[index + 1];
                        item.onUse(container.children[0], container, true); // USE ITEM!
                    }
                }
            } else {
                // Handle empty slots - clear the container background
                const container = activeItemsElement.children[index + 1];
                if (container) {
                    container.style.background = `rgba(192, 192, 192, 0)`;
                }
            }
        });
    }

    // Method for subclasses to override to specify their DOM element
    getActiveItemsElement() {
        throw new Error("getActiveItemsElement must be implemented by subclass");
    }

    // Method for subclasses to override to specify their container class
    getContainerSelector() {
        throw new Error("getContainerSelector must be implemented by subclass");
    }

    renderItems(containerName) {
        const containers = document.querySelectorAll(containerName);
        
        console.log(this.items);
        
        // Update each container only if it needs to change
        this.items.forEach((item, index) => {
            if (index < containers.length) {
                const container = containers[index];
                const currentItemId = container.querySelector('.active-item')?.getAttribute('data-item-id');
                const newItemId = item?.id;
                
                // Only update if the item has changed
                if (currentItemId !== newItemId) {
                    if (item !== null) {
                        // Add new item
                        container.innerHTML = `
                            <div class="active-item" draggable="true" data-item-id="${item.id}" data-item-type="${item.type}">
                                <img src="${item.image}" alt="${item.name}" title="${item.name}">
                            </div>
                        `;
                        container.classList.add('has-item');
                        
                       
                    } else {
                        // Remove item
                        container.innerHTML = '';
                        container.classList.remove('has-item');
                        container.style.background = `rgba(192, 192, 192, 0)`;
                    }
                }
                // If currentItemId === newItemId, don't touch the container at all
                // This preserves existing DOM elements and their event handlers
            }
        });
    }
}

class PlayerActiveItems extends ActiveItems {
    constructor() {
        super();
    }

    getActiveItemsElement() {
        return document.getElementById('active-items');
    }

    getContainerSelector() {
        return '.active-item-container';
    }

    renderItems() {
        super.renderItems(this.getContainerSelector());
    }
}

class EnemyActiveItems extends ActiveItems {
    constructor() {
        super(); // Properly call parent constructor
    }

    addItem(item, placementIndex) {
        if (this.items[placementIndex] === null) {
            this.items[placementIndex] = item;
            this.renderItems();
            return null;
        }
        // Note: Enemy active items don't support swapping like player items
    }  

    renderItems() {
        super.renderItems(this.getContainerSelector());
    }

    getActiveItemsElement() {
        return document.getElementById('enemy-active-items');
    }

    getContainerSelector() {
        return '.enemy-active-item-container';
    }

    renderEnemyItems(enemy) {
        this.items = enemy.items;
        this.renderItems();
        this.showEnemyItems();
    }

    showEnemyItems() {
        document.getElementById('enemy-active-items').style.opacity = '1';
        document.getElementById('enemy-active-items-title').style.opacity = '1';
    }

    hideEnemyItems() {
        document.getElementById('enemy-active-items').style.opacity = '0';
        document.getElementById('enemy-active-items-title').style.opacity = '0';
    }
}

const enemyActiveItems = new EnemyActiveItems();
const playerActiveItems = new PlayerActiveItems();

export { ActiveItems, enemyActiveItems, playerActiveItems };