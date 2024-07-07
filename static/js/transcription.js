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

function retranscribeSegment(index) {
    const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
    const retranscribeButton = segmentDiv.querySelector('.retranscribe-segment');
    
    // Disable the button and show loading state
    retranscribeButton.disabled = true;
    retranscribeButton.innerHTML = '<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    
    fetch('/retranscribe_segment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ index: index })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the segment in the UI
            const textArea = segmentDiv.querySelector('.segment-text');
            textArea.value = data.segment.text;
            
            // Update the transcription object
            transcription.segments[index] = data.segment;
            updateFullTranscription();
            
            // Restore the button state
            retranscribeButton.disabled = false;
            retranscribeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>';
        } else {
            console.error('Failed to re-transcribe segment:', data.error);
            // Restore the button state and show an error message
            retranscribeButton.disabled = false;
            retranscribeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>';
            alert('Failed to re-transcribe segment. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Restore the button state and show an error message
        retranscribeButton.disabled = false;
        retranscribeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>';
        alert('An error occurred while re-transcribing the segment. Please try again.');
    });
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