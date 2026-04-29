import effectsService from "../utils/effectsService.js";

class Item {
    constructor(name, description, value, rechargeTime = 0, image = null, triggerFunction = null, id = null, phyDamage = 0, emoDamage = 0, effects = null) {
        this.name = name;
        this.description = description;
        this.value = value;
        this.image = image;
        this.rechargeTime = rechargeTime;
        this.currentCharge = 0;
        this.isReady = false;
        this.type = 'item';
        this.id = id || name;
        this.triggerFunction = triggerFunction;
        this.phyDamage = phyDamage;
        this.emoDamage = emoDamage;
        this.effects = effects;
    }

    use(fromEnemy = false) {
        console.log(`${this.name} is used.`);
        this.triggerFunction(fromEnemy);
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
        // console.log("charge of " + this.name + " is " + this.currentCharge + " and recharge time is " + this.rechargeTime);

        if (containerElement) {
            const gradient = this.currentCharge / this.rechargeTime * 100;
            // console.log(gradient);
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
                    this.onUse(innerItemElement, containerElement);                    
                    // Remove the click event handler after use
                    if (innerItemElement._readyClickHandler) {
                        innerItemElement.removeEventListener('click', innerItemElement._readyClickHandler);
                        innerItemElement._readyClickHandler = null;
                    }
                };
                innerItemElement.addEventListener('click', innerItemElement._readyClickHandler);
            }
        }
    }

    

    onUse(innerItemElement, containerElement, fromEnemy = false) {
        effectsService.apply(this.effects);
        this.use(fromEnemy);
        this.isReady = false;
        innerItemElement.style.boxShadow = "";
        innerItemElement.classList.remove('active-item-ready');
        innerItemElement.style.transform = "scale(1)";
        // Reset container background
        if (containerElement) {
            containerElement.style.background = `rgba(192, 192, 192, 0)`;
        }
    }
}



const itemPool = {
    "punch": new Item(
        "Punch",
        "A basic punch that deals physical damage.",
        /* value */ 2,
        /* rechargeTime */ 0.5,
        /* image */ "./resources/images/hand.png",
        /* triggerFunction */ (fromEnemy = false) => {
            hurt(3, fromEnemy);
        },
        /* id */ "punch",
        /* phyDamage */ 3,
        /* emoDamage */ 0,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        }
    ),
    "punch_heavy": new Item(
        "Punch Heavy",
        "A heavy punch that deals physical damage.",
        /* value */ 2,
        /* rechargeTime */ 4,
        /* image */ "./resources/images/hand.png",
        /* triggerFunction */ (fromEnemy = false) => {
            hurt(10, fromEnemy, true);
        },
        /* id */ "punch_heavy",
        /* phyDamage */ 10,
        /* emoDamage */ 0,
        /* effects */ {
            sfx: "punchHeavy",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        }
    ),
    "shot": new Item(
        "Shot",
        "A shot that boosts physical damage, but lowers emotional damage.",
        /* value */ 2,
        /* rechargeTime */ 2,
        /* image */ "./resources/images/shot.png",
        /* triggerFunction */ (fromEnemy = false) => {
            buffPlayer(2, 0.5);
        },
        /* phyDamage */ 3,
        /* emoDamage */ 0,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        }
    ),
    "cd": new Item(
        "CD",
        "A shiny CD with unknown contents.",
        /* value */ 5,
        /* rechargeTime */ 0,
        /* image */ "./resources/images/cd.jpg",
        /* id */ "cd",
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null
    ),
    "pentagram": new Item(
        "Pentagram",
        "A mystical symbol that deals devastating damage but takes time to recharge.",
        /* value */ 50,
        /* rechargeTime */ 1,
        /* image */ "./resources/images/pentagramV3.png",
        /* triggerFunction */ (fromEnemy = false) => {
            // console.log("Pentagram unleashes dark energy!");
            hurt(50, fromEnemy);
            hurt(10, !fromEnemy);
        },
        /* phyDamage */ 25,
        /* emoDamage */ 5,
        /* id */ "pentagram",
        /* effects */ {
            sfx: "darkBurst",
            sfxOptions: { volume: 0.8, playbackRate: 0.95 },
            screenShake: { intensity: 14, duration: 180 },
            flash: { color: "#ff2ba3", alpha: 0.2, duration: 130 }
        }
    ),
    "podcast": new Item(
        "Podcast",
        "Creating a podcast will inflict huge emotional damage to your family.",
        /* value */ 5,
        /* rechargeTime */ 2,
        /* image */ "./resources/images/mic.png",
        /* triggerFunction */ (fromEnemy = false) => {
            buffPlayer(0.5, 2);
        },
        /* phyDamage */ 0,
        /* emoDamage */ 3,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        }
    )
}

function generateItem(itemName, id = null) {
    const item = itemPool[itemName];
    if (item) {
        // Clone the item to avoid shared state (like currentCharge, isReady, etc.)
        return new Item(
            item.name,
            item.description,
            item.value,
            item.rechargeTime,
            item.image,
            item.triggerFunction,
            id || generateId(item.name),
            item.phyDamage,
            item.emoDamage,
            item.effects
        );
    }
    return null;
}

function generateId(itemName) {
    return itemName + "_" + Math.random().toString(36).substr(2, 9);
}

const items = {
    "punch_001": generateItem("punch", "punch_001"),
    "punch_heavy_001": generateItem("punch_heavy", "punch_heavy_001"),
    "shot_001": generateItem("shot", "shot_001"),
    "cd_001": generateItem("cd", "cd_001"),
    "punch_002": generateItem("punch", "punch_002"),
    "pentagram_001": generateItem("pentagram", "pentagram_001"),
    "pentagram_002": generateItem("pentagram", "pentagram_002"),
    "podcast_001": generateItem("podcast", "podcast_001"),
}

export default items;

