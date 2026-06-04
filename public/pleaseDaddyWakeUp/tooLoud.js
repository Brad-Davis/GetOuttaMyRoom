(async () => {
    let volumeCallback = null;
    let volumeInterval = null;
    const volumeVisualizer = document.getElementById('volume-visualizer');
    const startButton = document.getElementById('start');
    const playAgainButton = document.getElementById('playAgainButton');
    // Initialize
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true
            }
        });
        const audioContext = new AudioContext();
        const audioSource = audioContext.createMediaStreamSource(audioStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.minDecibels = -127;
        analyser.maxDecibels = 0;
        analyser.smoothingTimeConstant = 0.4;
        audioSource.connect(analyser);
        const volumes = new Uint8Array(analyser.frequencyBinCount);
        volumeCallback = () => {
            analyser.getByteFrequencyData(volumes);
            let volumeSum = 0;
            for (const volume of volumes)
                volumeSum += volume;
            const averageVolume = volumeSum / volumes.length;
            // Value range: 127 = analyser.maxDecibels - analyser.minDecibels;
            //THIS SHOULD CHANGE TO SLOWLY INCREASE
            // volumeVisualizer.style.setProperty('--volume', (averageVolume * 100 / 127) + '%');
            if (!daddyWoke) {
                volumeVisualizer.style.setProperty('--volume', volumeMeter + '%');
            } else {
                setBarWhenComplete(true);
            }
            
            loudnessAnalysis(averageVolume);
        };
    } catch (e) {
        console.error('Failed to initialize volume visualizer, simulating instead...', e);
        // Simulation
        //TODO remove in production!
        let lastVolume = 50;
        volumeCallback = () => {
            const volume = Math.min(Math.max(Math.random() * 100, 0.8 * lastVolume), 1.2 * lastVolume);
            lastVolume = volume;
            volumeVisualizer.style.setProperty('--volume', volume + '%');
        };
    }
    // Use
    startButton.addEventListener('click', () => {
        daddyWoke = false;
        difficulty = GAME_DIFFICULTY;
        // startSpeechRecognition();
        hideModal();
        curReactionLevel = 0;
        setBarWhenComplete(false);
        volumeMeter = 0;
        startVideo();
        if (volumeCallback !== null && volumeInterval === null) {
            volumeInterval = setInterval(volumeCallback, 100);
            setReaction(0);
        }

    });
    playAgainButton.addEventListener('click', () => {
        daddyWoke = false;
        difficulty = GAME_DIFFICULTY;
        const pissAd = document.getElementById("pissAd");
        if (pissAd && pissAd.style.display === "flex") {
            pissAd.style.display = "none";
        }

        hideModal();
        volumeMeter = 0;
        curReactionLevel = 0;
        startVideo();
        setBarWhenComplete(false);
        if (volumeCallback !== null && volumeInterval === null) {
            volumeInterval = setInterval(volumeCallback, 100);
            setReaction(0);
        }
    })
})();

// Set up room audio looping once on initialization
const roomAudio = document.getElementById('room');
roomAudio.addEventListener('ended', function() {
    console.log('Room audio ended, restarting...');
    this.currentTime = 0;
    const playPromise = this.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error('Failed to restart room audio:', error);
        });
    }
});

let volRange = 0;
let timeAtVol = 0;
let timeAtDifVol = 0;

function hideModal() {
    document.getElementById('modal').style.opacity = 0;
    setTimeout(() => {
        document.getElementById('modal').style.display = 'none'
    }, 2000);
}

function showModal() {
    document.getElementById('modal').style.opacity = 1;
    document.getElementById('modal').style.display = 'block'
}

let curVolRangeAvg = 0.0;
/** Mic fill rate; higher = easier (was ~0.25 at easiest slider, ~0.0025 at hardest). */
const GAME_DIFFICULTY = 0.55;
let difficulty = GAME_DIFFICULTY;

function loudnessAnalysis(volume) {
    let curVolRange;
    if (volumeMeter > volume) {
        volumeMeter = Math.max(0, volumeMeter - 0.35);
    } else {
        volumeMeter += volume * difficulty;
    }
    if (volumeMeter < 15) {
        curVolRange = 0;
    } else if (volumeMeter < 45) {
        curVolRange = 1;
    } else if (volumeMeter < 68) {
        curVolRange = 2;
    } else {
        curVolRange = 3;
    }

    setReaction(curVolRange);
}

let prevRange;
let daddyWoke = false;
let curReactionLevel = 0;
function setReaction(range) {
    if (!daddyWoke) {
        curReactionLevel = range;
    }
}



try {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
}
catch (e) {
    console.error(e);
    $('.no-browser-support').show();
    $('.app').hide();
}

let noteContent = '';


// /*-----------------------------
//       Voice Recognition
// ------------------------------*/

// // If false, the recording will stop after a few seconds of silence.
// // When true, the silence period is longer (about 15 seconds),
// // allowing us to keep recording even when the user pauses.
// recognition.continuous = true;

// // This block is called every time the Speech APi captures a line.
// recognition.onresult = function (event) {

//     // event is a SpeechRecognitionEvent object.
//     // It holds all the lines we have captured so far.
//     // We only need the current one.
//     var current = event.resultIndex;

//     // Get a transcript of what was said.
//     var transcript = event.results[current][0].transcript;



//     // Add the current transcript to the contents of our Note.
//     // There is a weird bug on mobile, where everything is repeated twice.
//     // There is no official solution so far so we have to handle an edge case.
//     var mobileRepeatBug = (current == 1 && transcript == event.results[0][0].transcript);

//     if (!mobileRepeatBug) {
//         createWordBubble(transcript);
//     }
// };

// const output = document.getElementById('output')

// function createWordBubble(text) {
//     const bubble = document.createElement("div");
//     bubble.className = "bubble"
//     bubble.innerHTML = text;
//     output.appendChild(bubble);
// }

// recognition.onstart = function () {
//     console.log('Voice recognition activated. Try speaking into the microphone.');
// }

// recognition.onspeechend = function () {
//     console.log('You were quiet for a while so voice recognition turned itself off.');
// }

// recognition.onerror = function (event) {
//     if (event.error == 'no-speech') {
//         console.log('No speech was detected. Try again.');
//     };
// }

// function startSpeechRecognition() {
//     if (noteContent.length) {
//         noteContent += ' ';
//     }
//     recognition.start();
// }

// function stopSpeechRecognition() {
//     recognition.stop();
//     console.log('Voice recognition paused.');
// }

/*
Video stuff:

1. sleeping video always playing #sleepVid
2. if quiet trigger and play quiet video #quietVid
3. if loud trigger loud video #loudVid
4. if louder trigger wake video #wakeVid

Overriding videos might be difficult need wait for a little while so stop 

*/
const sleepVid = document.getElementById("sleepVid");
const quietVid = document.getElementById("quietVid");
const loudVid = document.getElementById("loudVid");
const wakeVid = document.getElementById("wakeVid");

const allVids = [sleepVid, quietVid, loudVid, wakeVid];

function startVideo() {
    startVid();
    const roomAudio = document.getElementById('room');
    
    // Handle play() promise for mobile compatibility
    const playPromise = roomAudio.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Room audio started successfully');
        }).catch(error => {
            console.error('Failed to play room audio:', error);
        });
    }
}

let curVideoPlaying = null;

function startVid() {
    let vidIndex = curReactionLevel;
    const newVideoChance = 0.88;
    const playVidInRange = Math.random() <= newVideoChance;
    

    if (!playVidInRange && vidIndex != 3) {
        vidIndex = 0;
    }
    const vid = allVids[vidIndex];

    curVideoPlaying = vid;

    allVids.forEach((vid, index) => {
        if (vidIndex != index) {
            vid.style.visibility = "hidden"
            vid.pause();
            vid.currentTime = 0;
        } else {
            vid.style.visibility = "unset";
        }
    });

    vid.play();


    /*
    Suggestion/Idea:

    Could make it so checks audio average after every loop to make animation smoother
    so on end run set reaction based on global average
    will also improve performace
    */

    //final video
    if (vidIndex === 3) {
        vid.onended = onDaddyWakeVideoEnd;
        daddyWoke = true;
    } else {
        vid.onended = startVid;
    }
}
const DADDY_WAKE_MSG = { type: 'GOMR_DADDY_WAKE_UP', v: 1 };

function onDaddyWakeVideoEnd() {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(DADDY_WAKE_MSG, '*');
            return;
        }
    } catch (e) {
        console.warn('Failed to notify parent of daddy wake win', e);
    }
    showModalOnWin();
}

function showModalOnWin() {
    document.getElementById("daddyTitle").innerHTML = "Thanks For Waking Papa <3 <br> I thought for sure he was dead."
    document.getElementById("pissAd").style.display = "flex";
    document.getElementById("playAgainButton").style.fontSize = "10px";
    document.getElementById("Start").style.display = "none";
    document.getElementsByClassName('subtext')[0].style.display = "none";
    document.getElementById("PlayAgain").style.display = "inline-block";
    showModal();
}

function setBarWhenComplete(isFull) {
    if (isFull) {
        document.getElementById('volume-visualizer').classList.add("volume-full");
    } else {
        document.getElementById('volume-visualizer').classList.remove("volume-full");
    }
    
}

let volumeMeter = 0;

