import effectsService from "../utils/effectsService.js";
import { shakeDamageMultiplierHud } from "../utils/damageMultiplierHud.js";
import voiceRecognition from "../services/voiceRecognition.js";
import dialogService from "../utils/dialogService.js";
import {podcastScore, insultScore, musicTasteScore, politicalScore} from "../services/aiScoring.js";
import micVolumeScoring from "../services/micVolumeScoring.js";
import dopamineManager from "../managers/dopamineManager.js";

class Item {
    constructor(name, description, value, rechargeTime = 0, image = null, triggerFunction = null, id = null, phyDamage = 0, emoDamage = 0, effects = null, sfx = null, phyBuff = 0, emoBuff = 0) {
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
        this.phyBuff = phyBuff;
        this.emoBuff = emoBuff;
        this.effects = effects;
        this.sfx = sfx;
        this.readyIdleTime = 0;
    }

    static READY_IDLE_FLASH_DELAY = 5;

    use(fromEnemy = false) {
        console.log(`${this.name} is used.`);
        if (!fromEnemy) {
            if (this.phyDamage > 0) {
                shakeDamageMultiplierHud('physical');
            }
            if (this.emoDamage > 0) {
                shakeDamageMultiplierHud('emotional');
            }
        }
        this.triggerFunction(fromEnemy);
    }

    tick(timeAmount, index, containers) {
        const containerElement = containers[index];
        // For click events when ready, we target the inner item
        const innerItemElement = containerElement ? containerElement.querySelector('.active-item, .enemy-active-item') : null;
        
        if (this.isReady) {
            this.readyIdleTime += timeAmount;
            if (innerItemElement && this.readyIdleTime >= Item.READY_IDLE_FLASH_DELAY) {
                innerItemElement.classList.add('idle-flash');
            }
            return;
        }
        if (this.rechargeTime === 0) {
            this.isReady = true;
            this.readyIdleTime = 0;
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
            this.readyIdleTime = 0;
            
            if (containerElement) {
                containerElement.style.background = `rgba(192, 192, 192, 1)`;
            }
            
            // Apply ready-state effects to the inner item if it exists and isn't already set up
            if (innerItemElement && !innerItemElement._readyClickHandler) {
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
                    if (speakingActive) {
                        return;
                    }
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

    

    resetChargeVisual(containerElement) {
        if (!containerElement) {
            return;
        }
        const innerItemElement = containerElement.querySelector('.active-item, .enemy-active-item');
        if (innerItemElement) {
            innerItemElement.classList.remove('active-item-ready', 'idle-flash');
            innerItemElement.style.transform = "scale(1)";
            this.readyIdleTime = 0;
            if (innerItemElement._readyClickHandler) {
                innerItemElement.removeEventListener('click', innerItemElement._readyClickHandler);
                innerItemElement._readyClickHandler = null;
            }
        }
        containerElement.style.background = `rgba(192, 192, 192, 0)`;
    }

    onUse(innerItemElement, containerElement, fromEnemy = false) {
        if (!fromEnemy && speakingActive) {
            return;
        }
        effectsService.apply(this.effects);
        console.log(this.sfx);
        // Prevent double-playing the same sound when effects.sfx already handled it.
        if (!this.effects?.sfx && this.sfx) {
            effectsService.playSfx(this.sfx);
        }
        this.use(fromEnemy);
        this.isReady = false;
        this.resetChargeVisual(containerElement);
    }
}


let speakingActive = false;

function setSpeakingActive(active) {
    speakingActive = active;
    const slots = document.getElementById('active-items-slots');
    if (slots) {
        slots.style.pointerEvents = active ? 'none' : '';
    }
}

export function isSpeakingActive() {
    return speakingActive;
}

const itemPool = {
    "punch": new Item(
        "Punch",
        "A basic punch that deals physical damage.",
        /* value */ 4,
        /* rechargeTime */ 0.5,
        /* image */ "./resources/images/punch.png",
        /* triggerFunction */ (fromEnemy = false) => {
            hurt(10, fromEnemy);
        },
        /* id */ "punch",
        /* phyDamage */ 10,
        /* emoDamage */ 0,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        },
        /* sfx */ "lightPunch"
    ),
    "punch_heavy": new Item(
        "Punch Heavy",
        "A heavy punch that deals physical damage.",
        /* value */ 2,
        /* rechargeTime */ 4,
        /* image */ "./resources/images/punch.png",
        /* triggerFunction */ (fromEnemy = false) => {
            hurt(10, fromEnemy, true);
        },
        /* id */ "punch_heavy",
        /* phyDamage */ 30,
        /* emoDamage */ 0,
        /* effects */ {
            sfx: "punchHeavy",
            sfxOptions: { volume: 0.05, playbackRate: 1 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        },
        /* sfx */ "punchHeavy"
    ),
    "shot": new Item(
        "Shot",
        "A shot that boosts physical damage, but lowers emotional damage.",
        /* value */ 5,
        /* rechargeTime */ 10,
        /* image */ "./resources/images/shot.png",
        /* triggerFunction */ (fromEnemy = false) => {
            effectsService.playSfx("shot", { volume: 0.2 });
            buffPlayer(1.25, 0.75, 1, fromEnemy);
        },
        /* id */ "shot",
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.15, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        },
        /* sfx */ "shot",
        /* phyBuff */ 2,
        /* emoBuff */ 0.5
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
        /* rechargeTime */ 5 ,
        /* image */ "./resources/images/mic.png",
        /* triggerFunction */ async (fromEnemy = false) => {
            if (speakingActive) {
                // SHOULD BE AN ERROR MESSAGE HERE TO SAY THAT YOU ARE ALREADY SPEAKING
                return;
            }
            setSpeakingActive(true);
            const lengthOfTime = 10;
            const topics = ["Men's Rights", "The State of Stand Up Comedy", "World War II", "Dating in the modern age", "AI", "Looksmaxxing", "Israel", "Crypto"];
            const topic = topics[Math.floor(Math.random() * topics.length)];

            try {
                await dialogService.runLines([
                    {
                        speaker: 'Podcast Producer',
                        text: `Please speak on the topic of ${topic}. You have ${lengthOfTime} seconds. Start talking after clicking this box (your words will show up on the screen).`,
                    },
                ]);
            } catch (error) {
                console.warn("[Podcast intro] failed:", error);
            }

            try {
                const statement = await voiceRecognition.getAndPrintStatement(lengthOfTime);
                const score = await podcastScore(statement, topic);
                console.log("[Podcast score]", score);
                hurt(score.score, fromEnemy, false);

                let response = `Your podcast score is ${score.score}.`;
                if (score.score > 50) {
                    response += ` You now run a successful podcast! Your family is devastated!!`;
                } else {
                    response += ` You are a terrible speaker. Your family is relieved.`;
                }
                await dialogService.runLines([{
                    speaker: 'Podcast Producer',
                    text: response,
                }]);
            } catch (error) {
                console.warn("[Podcast item] failed:", error);
            } finally {
                setSpeakingActive(false);
            }
        },
        /* phyDamage */ 0,
        /* emoDamage */ 3,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        },
    ),
    "insult": new Item(
        "Insult",
        "A sharp insult that deals emotional damage.",
        /* value */ 5,
        /* rechargeTime */ 2,
        /* image */ "./resources/images/insult.png",
        /* triggerFunction */ async (fromEnemy = false) => {
            if (speakingActive) {
                // SHOULD BE AN ERROR MESSAGE HERE TO SAY THAT YOU ARE ALREADY SPEAKING
                return;
            }
            setSpeakingActive(true);
            const lengthOfTime = 5;

            const insultTopics = ["Their looks", "Their Identity", "Their personality", "Their intelligence", "Their wealth", "Their social status", "Their family", "Their friends", "Their job", "Their home", "Their car", "Their clothes", "Their shoes", "Their hair", "Their makeup", "Their body", "Their sex", "Their gender", "Their sexuality", "Their religion", "Their politics", "Their beliefs", "Their opinions", "Their values", "Their morals", "Their ethics", "Their behavior", "Their attitude", "Their personality", "Their intelligence", "Their wealth", "Their social status", "Their family", "Their friends", "Their job", "Their home", "Their car", "Their clothes", "Their shoes", "Their hair", "Their makeup", "Their body", "Their sex", "Their gender", "Their sexuality", "Their religion", "Their politics", "Their beliefs", "Their opinions", "Their values", "Their morals", "Their ethics", "Their behavior", "Their attitude"];
            const insultTopic = insultTopics[Math.floor(Math.random() * insultTopics.length)];
            try {
                await dialogService.runLines([
                    {
                        speaker: 'Inner Monologue',
                        text: `Please insult your opponent on ${insultTopic}. You have ${lengthOfTime} seconds. Start talking after clicking this box (your words will show up on the screen).`,
                    },
                ]);
            } catch (error) {
                console.warn("[Insult intro] failed:", error);
            }

            try {
                const statement = await voiceRecognition.getAndPrintStatement(lengthOfTime);
                const score = await insultScore(statement, insultTopic);
                console.log("[Insult score]", score);
                hurt(score.score, fromEnemy, false);

                let response = `Your insult score is ${score.score}.`;
                if (score.score > 50) {
                    response += ` You are a mean and vicious person. CONGRATS<3<3<3`;
                } else {
                    response += ` You are kind. Learn from your mistakes.`;
                }
                await dialogService.runLines([{
                    speaker: 'Inner Monologue',
                    text: response,
                }]);
            } catch (error) {
                console.warn("[Insult item] failed:", error);
            } finally {
                setSpeakingActive(false);
            }
        },
        /* phyDamage */ 0,
        /* emoDamage */ 10,
        /* effects */ {
            sfx: "insult",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        }
    ),
    "chips": new Item(
        "Chips",
        "Eating chips will heal you!",
        /* value */ 5,
        /* rechargeTime */ 2,
        /* image */ "./resources/images/chips.png",
        /* triggerFunction */ (fromEnemy = false) => {
            heal(10, fromEnemy);
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null
    ),
    "bite": new Item(
        "Bite",
        "Bite your family members to hurt them and heal yourself.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/bite.png",
        /* triggerFunction */ (fromEnemy = false) => {
            hurt(10, fromEnemy);
            heal(10, fromEnemy);
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "bite",

        
    ),
    "scream": new Item(
        "Scream",
        "Scream at your family members to hurt them a lot and yourself a little.",
        /* value */ 5,
        /* rechargeTime */ 20,
        /* image */ "./resources/images/scream.png",
        /* triggerFunction */ async (fromEnemy = false) => {
            if (speakingActive) {
                return;
            }
            setSpeakingActive(true);
            const lengthOfTime = 4;
            const meterSegments = 12;
            let lastUiUpdateMs = 0;

            await dialogService.runLines([
                {
                    speaker: 'Inner Monologue',
                    text: `Scream as loud as you can for ${lengthOfTime} seconds. Louder screams deal more damage.`,
                },
            ]);

            const renderMeter = (level = 0) => {
                const safeLevel = Math.max(0, Math.min(1, Number(level) || 0));
                const filled = Math.round(safeLevel * meterSegments);
                const empty = meterSegments - filled;
                const bar = `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
                const loudnessPercent = Math.round(safeLevel * 100);
                return `Scream now!\nLoudness ${bar} ${loudnessPercent}%`;
            };

            dialogService.startLiveDialog({
                speaker: 'Inner Monologue',
                text: renderMeter(0),
                secondsRemaining: lengthOfTime,
            });

            try {
                const screamScore = await micVolumeScoring.measureLoudness(lengthOfTime, {
                    onSample: (sample) => {
                        const now = Date.now();
                        if (now - lastUiUpdateMs < 100) return;
                        lastUiUpdateMs = now;
                        const secondsRemaining = Math.max(0, lengthOfTime - sample.elapsed);
                        dialogService.updateLiveDialog({
                            text: renderMeter(sample.level),
                            secondsRemaining,
                        });
                    },
                });
                const familyDamage = Math.max(8, Math.round(screamScore.score * 5));
                const selfDamage = Math.max(2, Math.round(familyDamage));

                hurt(familyDamage, fromEnemy, false);
                hurt(selfDamage, !fromEnemy, false);

                dialogService.endLiveDialog();
                await dialogService.runLines([{
                    speaker: 'Inner Monologue',
                    text: `Family takes ${familyDamage} damage. You take ${selfDamage} recoil damage.`,
                }]);
            } catch (error) {
                console.warn("[Scream item] failed:", error);
                dialogService.endLiveDialog();
                await dialogService.runLines([{
                    speaker: 'Inner Monologue',
                    text: 'Could not read your mic scream level. Check mic permissions and try again.',
                }]);
            } finally {
                setSpeakingActive(false);
            }
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "scream"
    ),
    "Vape": new Item(
        "Vape",
        "Vape to hurt yourself for dopamine.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/vape.png",
        /* triggerFunction */ (fromEnemy = false) => {
            //GIVE DOPAMINE
            dopamineManager.giveDopamine(5);
            heal(-10, fromEnemy);
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "vape"
    ),
    "Mania": new Item(
        "Mania",
        "Mania to hurt yourself for dopamine.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/mania.png",
        /* triggerFunction */ (fromEnemy = false) => {
            //GIVE DOPAMINE
            dopamineManager.giveDopamine(5);
            hurt(10, fromEnemy);
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "mania"
    ),
    "callEx": new Item(
        "Call Ex",
        "Grants a randomized outcome.",
        /* value */ 5,
        /* rechargeTime */ 3,
        /* image */ "./resources/images/callFromEx.png",
        /* triggerFunction */ async (fromEnemy = false) => {
            effectsService.playSfx("callEx", { volume: 0.05 });

            const outcomes = [
                {
                    lines: [
                        { speaker: "Inner Monologue", text: "silent treatment... that stings." },
                        { speaker: "Inner Monologue", text: "Ouchie you take 10 damage." },
                    ],
                    effect: () => heal(-10, fromEnemy),
                },
                {
                    lines: [
                        { speaker: "Inner Monologue", text: "Aw, I do miss you." },
                        { speaker: "Inner Monologue", text: "You feel a weird power... emotional buff" },
                    ],
                    effect: () => buffPlayer(1, 1.5),
                },
                {
                    lines: [
                        { speaker: "EX", text: "Sorry, I'm busy right now." },
                        { speaker: "Inner Monologue", text: "Alright, they at least respect you enough to pick up. No effect " },
                    ],
                },
                {
                    lines: [
                        { speaker: "EX", text: "Hey sexy, you miss me?" },
                        { speaker: "Inner Monologue", text: "You are bricked up... emotional buff" },
                    ],
                    effect: () => buffPlayer(1, 2),
                },
                {
                    resolve: () => {
                        const buff = Math.random() < 0.5;
                        return {
                            lines: [
                                { speaker: "Inner Monologue", text: "They pickup and you start arguing with your ex." },
                                {
                                    speaker: "EX",
                                    text: buff
                                        ? "You always start this! (You feel a weird power... physical buff)"
                                        : "You always start this! (You feel drained)",
                                },
                            ],
                            effect: () => (buff ? buffPlayer(1.5, 1) : hurt(5, fromEnemy)),
                        };
                    },
                },
                {
                    lines: [
                        { speaker: "EX", text: "I'm coming over <3" },
                        { speaker: "Inner Monologue", text: "Your family is terrified of this beast. They take BIG damage." },
                    ],
                    effect: () => hurt(50, fromEnemy, false, true),
                },
            ];

            const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
            await dialogService.runLines([{ speaker: "Inner Monologue", text: "You find your ex in the contact list." }]);

            const { lines, effect } = outcome.resolve ? outcome.resolve() : outcome;
            await dialogService.runLines(lines);
            effect?.();
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ null,
    ),
    "political": new Item(
        "Uninformed Political Discussion",
        "Discuss politics with your family.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/politics.png",
        /* triggerFunction */ async (fromEnemy = false) => {
            if (speakingActive) {
                return;
            }
            setSpeakingActive(true);
            const lengthOfTime = 5;
            const questions = [
                "Name a U.S. senator.",
                "Name a female politician.",
                "Name a U.S. president before 2000.",
                "Name a U.S. state governor.",
                "Name a member of the U.S. Supreme Court.",
                "Name a U.S. cabinet secretary.",
            ];
            const question = questions[Math.floor(Math.random() * questions.length)];

            try {
                await dialogService.runLines([
                    {
                        speaker: 'Inner Monologue',
                        text: `${question} You have ${lengthOfTime} seconds. Start talking after clicking this box (your words will show up on the screen).`,
                    },
                ]);
            } catch (error) {
                console.warn("[Political intro] failed:", error);
            }

            try {
                const statement = await voiceRecognition.getAndPrintStatement(lengthOfTime);
                const score = await politicalScore(statement, question);
                console.log("[Political score]", score);
                hurt(score.score, fromEnemy, false);

                let response = ``;
                if (score.score > 50) {
                    response += ` You actually knew that?! Your family is furious you showed off at dinner.`;
                } else {
                    response += ` Classic uninformed energy. Your family is relieved you embarrassed yourself.`;
                }
                await dialogService.runLines([{
                    speaker: 'Inner Monologue',
                    text: response,
                }]);
            } catch (error) {
                console.warn("[Political item] failed:", error);
            } finally {
                setSpeakingActive(false);
            }
        },
        /* phyDamage */ 0,
        /* emoDamage */ 3,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        },
        /* sfx */ "political"
    ),
    "Facial Piercing": new Item(
        "Facial Piercing",
        "Pierce your face to hurt yourself and your family.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/facialPiercing.png",
        /* triggerFunction */ (fromEnemy = false) => {
            // GIVE DOPAMINE
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "facialPiercing"
    ),
    "Instagram Story Trauma Dump": new Item(
        "Instagram Story Trauma Dump",
        "Dump your trauma on your family.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/instagramStoryTraumaDump.png",
        /* triggerFunction */ (fromEnemy = false) => {
            // GIVE DOPAMINE
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "instagramStoryTraumaDump"
    ),
    "Music Taste": new Item(
        "Music Taste",
        "Explain your music taste to hurt your family.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/musicTaste.png",
        /* triggerFunction */ async (fromEnemy = false) => {
            if (speakingActive) {
                return;
            }
            setSpeakingActive(true);
            const lengthOfTime = 10;

            try {
                await dialogService.runLines([
                    {
                        speaker: 'Disappointed Parent',
                        text: `Talk about a musician that your family would be disappointed in. You have ${lengthOfTime} seconds. Start talking after clicking this box (your words will show up on the screen).`,
                    },
                ]);
            } catch (error) {
                console.warn("[Music Taste intro] failed:", error);
            }

            try {
                const statement = await voiceRecognition.getAndPrintStatement(lengthOfTime);
                const score = await musicTasteScore(statement, musician);
                console.log("[Music Taste score]", score);
                hurt(score.score, fromEnemy, false);

                let response = `Your music taste score is ${score.score}.`;
                if (score.score > 50) {
                    response += ` Your family is afraid of you and your music taste.`;
                } else {
                    response += ` Your family is relieved. Maybe they can get you into the classics.`;
                }
                await dialogService.runLines([{
                    speaker: 'Inner Monologue',
                    text: response,
                }]);
            } catch (error) {
                console.warn("[Music Taste item] failed:", error);
            } finally {
                setSpeakingActive(false);
            }
        },
        /* phyDamage */ 0,
        /* emoDamage */ 3,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 6, duration: 120 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        },
    ),
    "Youtube Shorts": new Item(
        "Youtube Shorts",
        "Create a Youtube Short to hurt yourself and your family.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/youtubeShorts.png",
        /* triggerFunction */ (fromEnemy = false) => {
            // GIVE DOPAMINE
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "youtubeShorts"
    ),
    // "Sports Betting": new Item(
    //     "Sports Better",
    //     "Play a sport to hurt yourself and your family.",
    //     /* value */ 5,
    //     /* rechargeTime */ 5,
    //     /* image */ "./resources/images/sportsBetter.png",
    //     /* triggerFunction */ (fromEnemy = false) => {
    //         // GIVE DOPAMINE
    //     },  
    //     /* phyDamage */ 0,
    //     /* emoDamage */ 0,
    //     /* effects */ null,
    //     /* sfx */ "sportsBetter"
    // ),
    "Hot Take": new Item(
        "Hot Take",
        "Make a hot take to hurt yourself or your family.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/hotTake.png",
        /* triggerFunction */ (fromEnemy = false) => {
            // GIVE DOPAMINE

        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "hotTake"
    ),
    "Existential Dread": new Item(
        "Existential Dread",
        "Feel existential dread for big damage",
        /* value */ 5,
        /* rechargeTime */ 7,
        /* image */ "./resources/images/skull.png",
        /* triggerFunction */ (fromEnemy = false) => {
            hurt(50, fromEnemy, false);
        },
        /* id */ "existentialDread",
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ {
            sfx: "punchLight",
            sfxOptions: { volume: 0.65, playbackRate: 1.05 },
            screenShake: { intensity: 300, duration: 1500 },
            flash: { color: "#ffffff", alpha: 0.08, duration: 80 }
        },
        /* sfx */ "existentialDread"
    ),
    "Newspaper": new Item(
        "Newspaper",
        "Grandma's got a newspaper and she's not afraid to use it.",
        /* value */ 5,
        /* rechargeTime */ 5,
        /* image */ "./resources/images/newspaper.png",
        /* triggerFunction */ (fromEnemy = false) => {
            // GIVE DOPAMINE
            hurt(25, fromEnemy, false);
        },
        /* phyDamage */ 0,
        /* emoDamage */ 0,
        /* effects */ null,
        /* sfx */ "newspaper"
    ),
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
            item.effects,
            item.sfx,
            item.phyBuff,
            item.emoBuff
        );
    }
    return null;
}

function generateId(itemName) {
    return itemName + "_" + Math.random().toString(36).substr(2, 9);
}

/** Fresh instance from a catalog entry (inventory / equipped slots must not share charge state). */
export function cloneItemFromTemplate(template, { currentCharge = 0, isReady = false } = {}) {
    if (!template) return null;
    const item = new Item(
        template.name,
        template.description,
        template.value,
        template.rechargeTime,
        template.image,
        template.triggerFunction,
        template.id,
        template.phyDamage,
        template.emoDamage,
        template.effects,
        template.sfx,
        template.phyBuff,
        template.emoBuff
    );
    item.currentCharge = currentCharge;
    item.isReady = isReady;
    return item;
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
    "musicTaste_001": generateItem("Music Taste", "musicTaste_001"),
    "insult_001": generateItem("insult", "insult_001"),
    "chips_001": generateItem("chips", "chips_001"),
    "bite_001": generateItem("bite", "bite_001"),
    "callEx_001": generateItem("callEx", "callEx_001"),
    "scream_001": generateItem("scream", "scream_001"),
    "political_001": generateItem("political", "political_001"),
    "existentialDread_001": generateItem("Existential Dread", "existentialDread_001"),
    "newspaper_001": generateItem("Newspaper", "newspaper_001"),
}

export default items;

