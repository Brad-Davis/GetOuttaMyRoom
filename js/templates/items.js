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
        const itemElement = activeItems[index + 1]
        if (this.isReady) {
            return;
        }
        if (this.rechargeTime === 0) {
            this.isReady = true;
            itemElement.style.background = `rgba(192, 192, 192, 1)`;
            return;

        }
        console.log(`${this.name} is ticking.`)
        this.currentCharge+= timeAmount;
        console.log(index);
        
        
        console.log(itemElement);
        if (itemElement) {
            const gradient = this.currentCharge / this.rechargeTime * 100;
            console.log(gradient);
            itemElement.style.background = `linear-gradient(
                    to right,
                    rgba(192, 192, 192, 1),
                    rgba(192, 192, 192, 1) ${gradient}%,
                    transparent ${gradient}%,
                    transparent 100%
            )`;
            
            // rgba(192, 192, 192, ${gradient})`;
        }
        if (this.currentCharge >= this.rechargeTime) {
            this.currentCharge = 0;
            this.isReady = true;
            itemElement.style.background = `rgba(192, 192, 192, 1)`;
            itemElement.style.cursor = `pointer`;

            // Add a glowing border and subtle scale animation to indicate clickability
            itemElement.style.boxShadow = "0 0 16px 4px #ffe066, 0 0 4px 2px #fff";
            itemElement.style.transition = "box-shadow 0.2s, transform 0.1s";
            itemElement.classList.add('active-item-ready');

            // Add a little bounce on hover
            itemElement.addEventListener('mouseenter', function bounce() {
                itemElement.style.transform = "scale(1.08)";
            });
            itemElement.addEventListener('mouseleave', function unbounce() {
                itemElement.style.transform = "scale(1)";
            });

            // Only add the click event once
            if (!itemElement._readyClickHandler) {
                itemElement._readyClickHandler = () => {
                    this.use();
                    this.isReady = false;
                    itemElement.style.boxShadow = "";
                    itemElement.classList.remove('active-item-ready');
                    itemElement.style.transform = "scale(1)";
                };
                itemElement.addEventListener('click', itemElement._readyClickHandler);
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
    "pentagram_001": new Item(
        "Pentagram",
        "A mystical symbol with unknown powers.",
        50,
        10,
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

