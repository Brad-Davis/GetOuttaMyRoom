let canvas, startButton, photoSense, myFont;
let prevSize;
let size;
let color = 255;
let addStart = 0;
let glitching = false;

//SET HOME TO TRUE TO HAVE HOMESCREEN
//and get rid of playtrack(0)
let home = true;

let runningIntro = false;
let radius = 80;
let centerX;
let centerY;
let v1;
let dial;
let angle = 20.2;
let onDial = false;
let rotWorking = false;
let pX, pY;
let cur;
let prevAngle;
let move = false;
let scrollActive = false;
let start;
let delta;
let scrollToDeg;
let scrollRate;
let count = 0;
let dialShowing = false;
let staticSound;
let introSound;
let masterVolumeVal = 0.5;
let videoRunning = false;
let myVoice = new p5.Speech(); // speech synthesis object

// setTimeout(function () {
//     myVoice.setVoice();

//     myVoice.setPitch(0.01)
//     myVoice.setVoice(Math.floor(Math.random(myVoice.voices.length)));
//     myVoice.listVoices();
//     myVoice.setVoice("fr-FR");
//     myVoice.speak('hi there');
//     // say something
// }, 3000)

let choiceVoice = 5;//english;
let choicePitch = 0.7;
let choiceRate = 1;
let typeSpeed = 100;
let messageIndex = 0;
let lineBreakLength = 12;
let modal;
let modalContent;
let transmissionRunning = false;
let saidNo = false;
let findPart = false;
let givenName = "";
let stopType = false;
let typing = false;
let curPart = ""
let prevMessage;
let broadcast;



//english 5
//japan 12

//HELLO CAN U HEAR ME

let words = ["i", "heart", "p", "five"]; // some words

let iterator = 0; // a counter for the words

let listbutton; // button
let transmissions;
let curTrackNum;
let globalTransmissionNum = -1;
let curRandomVoice = 0;
let partTransmissions = ["Did u hear me?! Fix my " + curPart, "Are you kidding? THE " + curPart + "!!!!", ""];
function preload() {
    globalTransmissionNum = 0;
    choiceVoice = 5;//english;
    choicePitch = 0.7;
    choiceRate = 1;
    typeSpeed = 40;
    messageIndex = 0;
    lineBreakLength = 12;


    transmissions = [[fadeInRadio,
        "Hey, hey you!",
        "Good you can hear me",
        "What's your name?",
        getName,
        "... That'll have to change if you ever wanna make it big but whatever",
        "Anyway you think you can help me out?",
        getYesNoFake,
        "You know you're alright, ",
        "Thanks for helping me out. people these days aren't giving me the respect I deserve",
        "It's actually in your best interest cuz I've worked with everyone",
        "anyway can you fix up my antenna? Its been so janky lately",
        antennaAdjust,
        fadeOutRadio
    ], [fadeInRadio, "Damn you didn't have to adjust it so hard",
        "can't hear as much as I used to",
        "can u move stations around see if that'll fix it?",
        dialAdjust,//hit all three dials
        "JEEZ a little softer, my bolts aren't what they used to be",
        stopTransmission,
        "Ughhh try the other one",
        stopTransmission,
        fadeOutRadio
    ], [fadeInRadio, "Alright so now all I can hear are agressively loud ads for airlines",
        "You shoulda seen the heyday. I was everywhere",
        "You couldn't get away from me. Sports, stories, people cared",
        "Here wait listen to this",
        baseballBroadcast,
        "I'm serious just listen",
        "So tired of everything changing",
        "People used to gather around and listen",
        "So that's what you're gonna do",
        mouthAdjust,
        speakerAdjust,
        radioAdjust,
        fadeOutRadio,


        //baseball radio starts playing and will continue to until you touch the mouth
        //weird sounds start playing
    ],
    [openCredits]]
    soundFormats('mp3')
    staticSound = loadSound('static.mp3');
    introSound = loadSound('radio.mp3');
    broadcast = loadSound('baseball.mp3');
}


function setup() {
    modal = document.getElementById("myModal");
    modalContent = document.getElementById("modalContent");
    normalVoice();
    myVoice.interrupt = true;
    masterVolume(masterVolumeVal);
    introSound.setVolume(1.0, 3);
    staticSound.setVolume(0.1, 3);
    introSound.loop();
    centerX = windowWidth / 2;
    centerY = windowHeight / 2;
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES);
    fill(155);
    textAlign(CENTER, CENTER);
    rectMode(CENTER);
    rotate(0);
    background(0);
    textFont('Press Start 2P');
    startButton = createButton('START');
    const startEl = startButton.elt;
    startEl.id = 'noise-start-btn';
    startEl.style.opacity = '0';
    startEl.style.visibility = 'hidden';
    startEl.style.pointerEvents = 'none';
    startButton.class('noise-start-btn');
    startButton.mousePressed(enterSite);
    $("#wholeRadio").on("click", function () {
        onObjectClick();
    });
    $("#radioBackground").on("click", function () {
        onObjectClick();
    });

    fitCanvasToViewport();
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(fitCanvasToViewport).observe(document.documentElement);
    }
}

function fitCanvasToViewport() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    resizeCanvas(w, h);
    centerX = w / 2;
    centerY = h / 2;
}


function stopTransmission() {
    transmissionRunning = false;
}

function nextTrack() {
    //need to worry about stopping video

    if (curTrackNum < 3) {
        fadeOutRadio(true);
        playTrack(curTrackNum + 1);
        if (videoRunning) {
            fadeVideo();
        }
    } else {
        //indicate not working
    }
}

function prevTrack(self) {
    fadeOutRadio(true);
    if (curTrackNum < 0) {
        playTrack(curTrackNum - 1);
        if (videoRunning) {
            stopVideo();
            fadeVideo();
        }
    } else {
        //indicate not working
    }
}

function playTrack(trackNum) {
    curTrackNum = trackNum;
    document.getElementById("transmission").innerText = "";
    globalTransmissionNum = 0;
    parts.setupTrack(trackNum);
    curRandomVoice = trackNum * 0.2;
    transmissionRunning = true;
}


function doList() {
    myVoice.listVoices(); // debug printer for voice options
}


function onObjectClick() {

    if (transmissionRunning) {
        console.log('sendingTransmission')
        sendTransmission();
    } else if (findPart) {
        console.log('findPart');
        missedClick++;
        console.log(missedClick);
        if (missedClick > 5) {
            parts.prevPiece().flash(1000);
            missedClick = 0;
        }
        console.log('hello');
    } else {
        console.log('baseball')
        //baseball broadcast send message every five
        missedClick++;
        if (parts.prevPiece() && missedClick > 5) {
            parts.prevPiece().flash(1000);
            missedClick = 0;
        }
    }

}



function randomVoice() {
    myVoice.setPitch(random(2));
    myVoice.setRate(random(0.5, 2));
    myVoice.setVoice(Math.floor(random(myVoice.voices.length)));
}

function normalVoice() {
    myVoice.setPitch(choicePitch);
    myVoice.setRate(choiceRate);
    myVoice.setVoice(choiceVoice);

}

function speakWithRandom(message, randomAmount) {
    //randomAmount bewteen 0 and 1
    if (message) {
        let randAmt = random(1);
        if (randAmt < randomAmount) {
            randomVoice();
        }
        speakMes(message);
        normalVoice();
    }

}

function speakMes(message) {
    myVoice.speak(message);
}

function sendTransmission() {
    //returns true if successfully run
    if (!typing) {
        globalTransmissionNum++;
    }
    return sendTransmissionArray(curTrackNum, globalTransmissionNum - 1);

}




function sendTransmissionArray(trackNum, transmissionNumber) {
    //This will send the transmissionNumber index 
    let curMessage = transmissions[trackNum][transmissionNumber];
    console.log(curMessage);
    if (typeof curMessage === "function") {
        //if passed function returns false the text does not dissapear
        if (transmissions[trackNum][transmissionNumber]()) {
            document.getElementById("transmission").innerText = "";
        }
        return true;
    } else {
        return sendMessage(curMessage);
        //speakWithRandom(curMessage, transmissionNumber / 10)
    }

}

function glitchOutRandom(num) {
    if ((curTrackNum + 0.2) * Math.random() * num > 0.9) {
        glitchOut();
    }
}


function sendMessage(message) {
    if (!typing) {
        messageIndex = 0;
        typing = true;
        speakWithRandom(message, curRandomVoice)
        $(".screen").addClass("talking");
        document.getElementById("transmission").innerText = ""
        typeMessage(message)
        glitchOutRandom(1);
        return true;
    } else {
        //show all message
        document.getElementById("transmission").innerText = message;
        typing = false;
        $(".screen").removeClass("talking");
        return false;
    }
}

function typeMessage(message) {
    if (messageIndex < message.length) {
        const curChar = message.charAt(messageIndex);
        if (typing) {
            document.getElementById("transmission").innerHTML += message.charAt(messageIndex);
        } else {
            return;
        }
        messageIndex++;
        setTimeout(function () {
            typeMessage(message);
        }, typeSpeed);
    } else {
        typing = false;
        $(".screen").removeClass("talking");
    }
}

function getName() {
    openBox();
    const inputName = document.createElement("input");
    inputName.setAttribute("type", "text");
    const doneBtn = document.createElement("BUTTON");
    doneBtn.innerHTML = "Done!";
    doneBtn.className = "fullWidth";
    modalContent.appendChild(inputName);
    modalContent.appendChild(doneBtn);
    inputName.placeholder = "NAME"
    doneBtn.onclick = function () {
        console.log(inputName.value);
        givenName = inputName.value;
        let add = 0;
        if (givenName === "") {
            insertMessage("Fine! Being all coy. I'll just call u Georfry");
            givenName = "Georfry";
            add = 1;
        }
        transmissions[0][5 + add] = givenName + transmissions[0][5 + add];
        transmissions[0][8 + add] = transmissions[0][8 + add] + givenName;
        screen.setMessage(givenName, 5);
        document.cookie = "name=" + givenName;
        console.log(document.cookie);
        closeBox();
    }
    return true;

}

Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
};

function insertMessage(message, offset) {
    if (offset) {
        transmissions[curTrackNum].insert(globalTransmissionNum + offset, message);
    } else {
        transmissions[curTrackNum].insert(globalTransmissionNum, message);
    }
}

function getYesNoFake() {
    let yesBtn = document.createElement("BUTTON");
    let noBtn = document.createElement("BUTTON");
    yesBtn.innerHTML = "YES";
    noBtn.innerHTML = "no";
    noBtn.onclick = function () {

        noBtn.innerHTML = "YES";
        if (saidNo === true) {
            closeBox();
        } else {
            insertMessage("I saw that $#!1 by the way don't ever try to pull that again", 1);
        }
        saidNo = true;
    }
    yesBtn.onclick = function () {
        closeBox();
    }

    modalContent.appendChild(yesBtn);
    modalContent.appendChild(noBtn);
    openBox();
    return true;
}

function openBox() {
    modal.style.display = "block";
    transmissionRunning = false;
}

function closeBox() {
    modal.style.display = "none";
    modalContent.innerHTML = '';
    transmissionRunning = true;
}

function antennaAdjust() {
    transmissionRunning = false;
    makeUsable(parts.curPiece());
    findPart = true;
    return false;
}

function dialAdjust() {
    transmissionRunning = false;
    makeUsable(parts.curPiece());
    makeUsable(parts.curPiece());
    makeUsable(parts.curPiece());
    findPart = true;
}

function mouthAdjust() {
    transmissionRunning = false;
    makeUsable(parts.curPiece());
}

function speakerAdjust() {
    console.log('speaker');
    transmissionRunning = false;
    makeUsable(parts.curPiece());
}

function radioAdjust() {
    transmissionRunning = false;
    makeUsable(parts.curPiece());
}

function baseballBroadcast() {
    $(".speaker").addClass('shake-constant');
    broadcast.play();
}

function fadeInRadio() {
    document.getElementById("transmission").innerText = ""
    $('#wholeRadio').fadeIn("slow");
}

function fadeOutRadio(noVideo) {
    console.log('fading')
    $('.fullRadio').addClass("shake-opacity");
    $('#transmission').addClass("shake-opacity");

    $('#wholeRadio').fadeOut("slow", function () {
        $('.fullRadio').removeClass("shake-opacity");
        $('#transmission').removeClass("shake-opacity");
        if (!noVideo) {
            console.log("video starting")
            startVideo(curTrackNum);
        }
    });
}

function glitchOut() {
    if (!glitching) {

        glitching = true;
        const startLeft = $('#transmission').css("left")
        const startTop = $('#transmission').css("top")
        const startLeftRadio = $('.fullRadio').css("left")
        const startTopRadio = $('.fullRadio').css("top")
        $('.fullRadio').css("transition-duration", "0s")

        console.log(startLeftRadio);
        console.log(startTopRadio);

        setTimeout(function () {
            $('.fullRadio').css("left", (Math.random() * 800 - 400) + "px")
            $('.fullRadio').css("top", (Math.random() * 800 - 400) + "px")
            $('#wholeRadio').css('transform', 'rotate(' + (Math.random() * 360) + 'deg)')
            $('#transmission').css("left", (Math.random() * 800 - 400) + "px")
            $('#transmission').css("top", (Math.random() * 800 - 400) + "px")
            setTimeout(function () {
                $('#wholeRadio').css('transform', 'rotate(' + (Math.random() * 360) + 'deg)')
                $('.fullRadio').css("left", (Math.random() * 800 - 400) + "px")
                $('.fullRadio').css("top", (Math.random() * 800 - 400) + "px")
                $('#transmission').css("left", (Math.random() * 800 - 400) + "px")
                $('#transmission').css("top", (Math.random() * 800 - 400) + "px")
                $('#transmission').css('transform', 'rotate(' + (Math.random() * 360) + 'deg)')
                $('#wholeRadio').css('transform', 'translateY(-50%)')
                setTimeout(function () {
                    $('.fullRadio').css("left", startLeftRadio)
                    $('.fullRadio').css("top", startTopRadio)
                    setTimeout(function () {
                        $('.fullRadio').css("transition-duration", "3s")
                        $('#transmission').css("left", startLeft)
                        $('#transmission').css("top", startTop)
                        glitching = false;
                    }, Math.random() * 500)
                }, Math.random() * 500)
            }, Math.random() * 500);

        }, Math.random() * 3000);

    }


}


function windowResized() {
    fitCanvasToViewport();
}

function stopVideo() {
    videoRunning = false;
    bringCanvasToFront();
    staticSound.setVolume(0.2, 2)
}

function draw() {
    if (home) {

        //DELTE AND UNCOMMENT FOR NO MORE TESTING
        // home = false;
        // playTrack(0);

        if (frameCount % 5 == 0) {
            fill(0, 30);
            rect(centerX, centerY, width, height)
            titleText(addStart, runningIntro);
        }

    } else {
        //TODO make it so check only happens every second or so;
        playVideoCheck();
    }

}

function playVideoCheck() {
    if (videoRunning) {
        if (player.getCurrentTime() > player.getDuration() * 0.98) {
            nextTrack();
            videoRunning = false;
        }
    }
}



function titleText(add, runningIntro) {
    if (runningIntro) {
        size = prevSize * 1.05;
        if (size > 300) {
            color -= 4;
        }
        if (color <= 0) {
            home = false;
            startIntro();
            transmissionRunning = true;
            playTrack(0);
        }
    } else {
        size = 200 - Math.cos(frameCount / 100) * 200 + add;
    }

    prevSize = size;
    fill(color);
    textSize(size * Math.random());
    // translate(width / 2, height / 2);
    // rotate(size * frameCount)
    text('Noise_Between_Static', Math.random() * window.width, Math.random() * window.height);

}

function enterSite() {
    startButton.remove();
    startButton = null;
    $('#warning').fadeOut()
    document.body.classList.add('track-controls-ready');
    $('#trackControls1').fadeIn()
    $('#trackControls2').fadeIn()
    runningIntro = true;
    introSound.setVolume(0, 5);
    staticSound.loop();

    // background(0);
    // clear();
    //document.getElementById("defaultCanvas0").style.zIndex = "1"

}


function startVideo(videoNum) {
    videoRunning = true;
    $(".staticBackground").fadeTo(1000, 1, function () {
        runVideo(videoNum);
        $("#fullBackground").fadeTo(1000, 1, function () {
            console.log('faded!');
            $(".staticBackground").fadeTo(1500, 1, function () {
                $(".staticBackground").fadeTo(3000, 0);
            });
        });
    });

}
