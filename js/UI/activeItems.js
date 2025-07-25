class ActiveItems {
    constructor() {
        this.items = [null, null];
        this.size = 2;
        this.tickTimer = null; // Track the current tick timer
        this.isTickingActive = false; // Prevent multiple tick loops
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

    renderItems() {
        const containers = document.querySelectorAll('.active-item-container');
        
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
        
        // Only start ticking if it's not already active
        if (!this.isTickingActive) {
            this.startTicking();
        }
    }

    isFull() {
        return this.items.filter(item => item !== null).length >= this.size;
    }

    startTicking() {
        if (this.isTickingActive) {
            return; // Already ticking
        }
        this.isTickingActive = true;
        this.tickItems(0.1);
    }

    stopTicking() {
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
        this.isTickingActive = false;
    }

    tickItems(timeAmount) {
        const activeItems = document.getElementById('active-items').children;

        this.items.forEach((item, index) => {
            if (item !== null) {
                item.tick(timeAmount, index, activeItems);
            } else {
                // Handle empty slots - clear the container background
                const container = activeItems[index + 1];
                if (container) {
                    container.style.background = `rgba(192, 192, 192, 0)`;
                }
            }
        });
        
        // Schedule next tick only if still active
        if (this.isTickingActive) {
            this.tickTimer = setTimeout(() => {
                this.tickItems(0.1);
            }, 100);
        }
    }
}

const activeItems = new ActiveItems();
export default activeItems;