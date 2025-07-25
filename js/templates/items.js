class Item {
    constructor(name, description, value, rechargeTime = 0, image = null, id = null) {
        this.id = id || this.generateId();
        this.name = name;
        this.description = description;
        this.value = value;
        this.image = image;
        this.rechargeTime = rechargeTime;
        this.currentCharge = 0;
        this.isReady = false;
        this.type = 'item';
    }

    generateId() {
        return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    use() {
        console.log(`${this.name} is used.`);
    }

    tick(timeAmount, index, activeItems) {
        // For charging animation, we target the container
        const containerElement = activeItems[index + 1];
        // For click events when ready, we target the inner item
        const innerItemElement = containerElement ? containerElement.querySelector('.active-item') : null;
        
        if (this.isReady) {
            return;
        }
        if (this.rechargeTime === 0) {
            this.isReady = true;
            if (containerElement) {
                containerElement.style.background = `rgba(192, 192, 192, 1)`;
            }
            return;
        }

        this.currentCharge+= timeAmount;
        console.log("charge of " + this.name + " is " + this.currentCharge + " and recharge time is " + this.rechargeTime);

        if (containerElement) {
            const gradient = this.currentCharge / this.rechargeTime * 100;
            console.log(gradient);
            // Apply charging animation to the CONTAINER
            containerElement.style.background = `linear-gradient(
                    to right,
                    rgba(192, 192, 192, 1),
                    rgba(192, 192, 192, 1) ${gradient}%,
                    transparent ${gradient}%,
                    transparent 100%
            )`;
        }
        
        if (this.currentCharge >= this.rechargeTime) {
            this.currentCharge = 0;
            this.isReady = true;
            
            if (containerElement) {
                containerElement.style.background = `rgba(192, 192, 192, 1)`;
            }
            
            // Apply ready-state effects to the inner item if it exists and isn't already set up
            if (innerItemElement && !innerItemElement._readyClickHandler) {
                innerItemElement.style.cursor = `pointer`;
                innerItemElement.style.boxShadow = "0 0 16px 4px #ffe066, 0 0 4px 2px #fff";
                innerItemElement.style.transition = "box-shadow 0.2s, transform 0.1s";
                innerItemElement.classList.add('active-item-ready');

                // Add hover effects to inner item
                innerItemElement.addEventListener('mouseenter', function bounce() {
                    innerItemElement.style.transform = "scale(1.08)";
                });
                innerItemElement.addEventListener('mouseleave', function unbounce() {
                    innerItemElement.style.transform = "scale(1)";
                });

                // Add the click event handler
                innerItemElement._readyClickHandler = () => {
                    this.use();
                    this.isReady = false;
                    innerItemElement.style.boxShadow = "";
                    innerItemElement.classList.remove('active-item-ready');
                    innerItemElement.style.transform = "scale(1)";
                    // Reset container background
                    if (containerElement) {
                        containerElement.style.background = `rgba(192, 192, 192, 0)`;
                    }
                };
                innerItemElement.addEventListener('click', innerItemElement._readyClickHandler);
            }
        }
    }
}

class Weapon extends Item {
    constructor(name, description, value, rechargeTime, triggerFunction, phyDamage, emoDamage = 0, image = null, id = null) {
        super(name, description, value, rechargeTime, image, id);
        this.triggerFunction = triggerFunction;
        this.phyDamage = phyDamage;
        this.emoDamage = emoDamage;
        this.type = 'weapon';
    }

    use() {
        if (this.triggerFunction) {
            this.triggerFunction();
        }
    }
}

class Buffer extends Item {
    constructor(name, description, value, rechargeTime, healing, phyMult, emoMult, image = null, id = null) {
        super(name, description, value, rechargeTime, image, id);
        this.healing = healing;
        this.phyMult = phyMult || 1;
        this.emoMult = emoMult || 1;
        this.type = 'buffer';
    }

    use() {
        console.log(`${this.name} restores ${this.healing} health.`);
    }
}

const items = {
    "punch_001": new Weapon(
        "Punch",
        "A basic punch that deals physical damage.",
        2,
        5,
        () => {
            hurtEnemy(10);
        },
        10,
        0,
        "./resources/images/hand.png",
        "punch_001"
    ),
    "phone_001": new Item(
        "Phone",
        "A mysterious old phone that might be useful.",
        10,
        0,
        "./resources/images/phone.png",
        "phone_001"
    ),
    "cd_001": new Item(
        "CD",
        "A shiny CD with unknown contents.",
        5,
        0,
        "./resources/images/cd.jpg",
        "cd_001"
    ),
    "pentagram_001": new Weapon(
        "Pentagram",
        "A mystical symbol that deals devastating damage but takes time to recharge.",
        50,
        15,
        () => {
            console.log("Pentagram unleashes dark energy!");
            hurtEnemy(25);
        },
        25,
        5,
        "./resources/images/pentagramV3.png",
        "pentagram_001"
    ),
    "rug_001": new Item(
        "Rug",
        "A soft rug for decoration.",
        15,
        0,
        "./resources/images/rug.png",
        "rug_001"
    )
}

export default items;

