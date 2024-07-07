let transcription;

document.addEventListener('DOMContentLoaded', function() {
    checkForCachedTranscription();
});

function checkForCachedTranscription() {
    fetch('/get_cached_transcription')
        .then(response => {
            if (!response.ok) {
                throw new Error('No cached transcription available');
            }
            return response.json();
        })
        .then(data => {
            if (data.transcription) {
                transcription = data.transcription;
                document.getElementById('full-transcription').value = data.transcription.text;
                displaySegmentedTranscription(data.transcription.segments, data.transcription.is_sorted);
                initializeYouTubePlayer(data.transcription.youtube_id);
                document.getElementById('transcription-result').classList.remove('hidden');
            }
            if (data.youtube_url) {
                document.getElementById('youtube-url').value = data.youtube_url;
            }
        })
        .catch(error => {
            console.log('No cached transcription found:', error);
        });
}

function transcribeVideo() {
    const youtubeUrl = document.getElementById('youtube-url').value;
    const loading = document.getElementById('loading');
    const result = document.getElementById('transcription-result');
    const errorMessage = document.getElementById('error-message');
    
    loading.classList.remove('hidden');
    result.classList.add('hidden');
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    
    fetch('/transcribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `youtube_url=${encodeURIComponent(youtubeUrl)}`
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'An error occurred while transcribing the video.');
            });
        }
        return response.json();
    })
    .then(data => {
        loading.classList.add('hidden');
        result.classList.remove('hidden');
        
        transcription = data;
        document.getElementById('full-transcription').value = data.text;
        displaySegmentedTranscription(data.segments, data.is_sorted);
        
        // Reset and reinitialize the video player with the new video ID
        resetVideoPlayer();
        initializeYouTubePlayer(data.youtube_id);
    })
    .catch(error => {
        console.error('Error:', error);
        loading.classList.add('hidden');
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('hidden');
    });
}

function saveSegmentChanges(index) {
    const segment = transcription.segments[index];

    fetch('/update_segment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            index: index,
            start_time: segment.start,
            end_time: segment.end,
            text: segment.text
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Segment updated successfully');
            updateFullTranscription();
        } else {
            console.error('Failed to update segment');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function addSegment() {
    const videoDuration = player.getDuration();
    
    fetch('/add_segment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            start_time: 0,
            end_time: videoDuration,
            text: ""
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            transcription = data.transcription;
            displaySegmentedTranscription(transcription.segments, data.is_sorted);
            updateFullTranscription();
            isListSorted = data.is_sorted;
            updateSortButtonVisibility();
        } else {
            console.error('Failed to add segment');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function removeSegment(index) {
    fetch('/remove_segment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            index: index
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            transcription = data.transcription;
            displaySegmentedTranscription(transcription.segments);
            updateFullTranscription();
            
            // If we removed the currently playing segment, reset the player
            if (index === currentlySelectedSegmentIndex) {
                clearSegmentSelection();
            }
        } else {
            console.error('Failed to remove segment');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function updateFullTranscription() {
    transcription.text = transcription.segments.map(segment => segment.text).join(' ');
    document.getElementById('full-transcription').value = transcription.text;
}

function downloadCSV() {
    window.location.href = '/download_csv';
}

function downloadTXT() {
    window.location.href = '/download_txt';
}

function downloadSRT() {
    window.location.href = '/download_srt';
}