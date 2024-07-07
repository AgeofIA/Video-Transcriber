let transcription;

function checkForCachedTranscription() {
    fetch('/get_cached_transcription')
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('No cached transcription found');
                    return;
                }
                throw new Error('Error fetching cached transcription');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.transcription) {
                transcription = data.transcription;
                document.getElementById('full-transcription').value = data.transcription.text;
                displaySegmentedTranscription(data.transcription.segments, data.transcription.is_sorted);
                initializeYouTubePlayer(data.transcription.youtube_id);
                document.getElementById('transcription-result').classList.remove('hidden');
            }
            if (data && data.youtube_url) {
                document.getElementById('youtube-url').value = data.youtube_url;
            }
        })
        .catch(error => {
            console.error('Error checking for cached transcription:', error);
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