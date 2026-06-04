function openNav() {
    document.getElementById("mySidebar").style.width = "100%";
}

function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
}



function openVolume() {
    console.log(document.getElementById('volumeBar'));
    document.getElementById('volumeBar').style.transform = "translateX(0%)";
    console.log("VOLUME")
}

function closeVolume() {
    document.getElementById('volumeBar').style.transform = "translateX(-100%)";
}

function startIntro() {
    bringCanvasToFront();
}

function bringCanvasToFront() {
    //document.getElementById('defaultCanvas0').classList.toggle('hide');

    $("#defaultCanvas0").fadeTo(0, 0);
    setTimeout(function () {
        console.log('start');
        document.getElementById('defaultCanvas0').style.zIndex = '2';
        $("#defaultCanvas0").fadeTo(1500, 0.3);
        setTimeout(function () {
            dialShowing = true;
            fadeInAndOut();
        }, 1500)

    }, 1000);

}

function fadeInAndOut() {
    const randomTime = Math.floor(Math.random() * 2500)
    $("#defaultCanvas0").fadeTo(randomTime, 0.05 + Math.random() * 0.5);
    setTimeout(function () {
        if (dialShowing) {
            fadeInAndOut()
        }
    }, randomTime);
}

function setVolume(level) {
    player.setVolume(level);
    masterVolume(level / 100);
    myVoice.setVolume(level / 100);
}

const videos = ['UZCKAGJwlNU', 'g_FtYHLgNbE', 'fdS8bAQDIr4'];
function runVideo(videoNum) {
    $('#fullBackground').css("display", "block");
    $('#fullBackground').fadeIn('slow');
    player.loadVideoById(videos[videoNum]);
    console.log(player);
    player.playVideo();
    dialShowing = false;
    introSound.stop()
    staticSound.setVolume(0, 5)
    $("#defaultCanvas0").fadeTo(3000, 0);
}

function fadeVideo() {
    $(".staticBackground").fadeTo(500, 1, function () {
        $('#fullBackground').fadeOut('slow', function () {
            $('#fullBackground').css("display", "none");
            stopVideo();
        });
        $(".staticBackground").fadeTo(1000, 0.2);
    });
}

$('#fullBackground').fadeOut()

var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;

function openCredits() {
    document.getElementById("credits").style.display = "block";
}

function closeCredits() {
    document.getElementById("credits").style.display = "none";
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: 'g_FtYHLgNbE',
        playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            playsinline: 1,
        },
    });
}

// 4. The API will call this function when the video player is ready.


// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function stopVideo() {
    player.stopVideo();
}



