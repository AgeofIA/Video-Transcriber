let player;
let currentSegment = null;
let autoplayEnabled = true;

function onPlayerReady(event) {
    // Player is ready
    console.log("Video duration:", getDuration());
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED && currentSegment && autoplayEnabled) {
        player.seekTo(currentSegment.start);
        player.playVideo();
    }
}

function playSegment(index, forceReplay = false) {
    const segment = transcription.segments[index];
    if (currentSegment !== segment || forceReplay) {
        currentSegment = segment;
        player.seekTo(currentSegment.start);
        if (autoplayEnabled) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }
    if (autoplayEnabled) {
        checkSegmentBounds();
    }
}

function checkSegmentBounds() {
    if (!currentSegment || !autoplayEnabled) return;

    const currentTime = player.getCurrentTime();
    if (currentTime >= currentSegment.end) {
        player.seekTo(currentSegment.start);
        player.playVideo();
    } else if (currentTime < currentSegment.start) {
        player.seekTo(currentSegment.start);
    }

    // Check again after 100ms
    setTimeout(checkSegmentBounds, 100);
}

function setAutoplayEnabled(enabled) {
    autoplayEnabled = enabled;
    if (enabled && currentSegment) {
        player.playVideo();
        checkSegmentBounds();
    } else if (!enabled && player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
    }
}

function getDuration() {
    if (player && typeof player.getDuration === 'function') {
        return player.getDuration();
    }
    return 0; // Return 0 if player is not initialized or getDuration is not available
}

function onYouTubeIframeAPIReady() {
    // The API is ready, but we'll initialize the player when we have a video ID
}

function resetVideoPlayer() {
    if (player) {
        player.destroy();
        player = null;
    }
    currentSegment = null;
    const playerDiv = document.getElementById('youtube-player');
    playerDiv.innerHTML = ''; // Clear the player div
}

function initializeYouTubePlayer(videoId) {
    resetVideoPlayer(); // Ensure the player is reset before initializing
    const playerDiv = document.getElementById('video-player');
    playerDiv.classList.remove('hidden');
    
    player = new YT.Player('youtube-player', {
        height: '360',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 0,
            'controls': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// Export functions that need to be accessed from other files
window.initializeYouTubePlayer = initializeYouTubePlayer;
window.playSegment = playSegment;
window.resetVideoPlayer = resetVideoPlayer;
window.setAutoplayEnabled = setAutoplayEnabled;
window.getDuration = getDuration;