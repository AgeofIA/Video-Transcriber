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
                updateFullTranscription();
                displaySegmentedTranscription(data.transcription.segments, data.transcription.is_sorted);
                initializeYouTubePlayer(data.transcription.youtube_id);
                document.getElementById('transcription-result').classList.remove('hidden');
                document.getElementById('download-section').classList.remove('hidden');
                document.getElementById('how-to').classList.add('hidden');
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
    const downloadSection = document.getElementById('download-section');
    const howTo = document.getElementById('how-to');
    
    loading.classList.remove('hidden');
    result.classList.add('hidden');
    errorMessage.classList.add('hidden');
    downloadSection.classList.add('hidden');
    howTo.classList.add('hidden');
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
        downloadSection.classList.remove('hidden');
        
        transcription = data;
        updateFullTranscription();
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
        howTo.classList.remove('hidden');
    });
}

function updateFullTranscription() {
    const fullTranscriptDiv = document.getElementById('full-transcription');
    fullTranscriptDiv.innerHTML = '';
    
    if (!transcription || !transcription.segments) {
        console.error('Transcription or segments are missing');
        return;
    }
    
    const colors = ['bg-red-50', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-pink-50', 'bg-indigo-50'];
    
    transcription.segments.forEach((segment, index) => {
        // Create span for the segment text
        const span = document.createElement('span');
        span.textContent = segment.text;
        span.className = `segment-${index} ${colors[index % colors.length]} mr-1 cursor-pointer`;
        span.setAttribute('data-index', index);  // Ensure this line is present
        
        fullTranscriptDiv.appendChild(span);

        // Add a space after each segment, outside of the colored span
        if (index < transcription.segments.length - 1) {
            const space = document.createTextNode(' ');
            fullTranscriptDiv.appendChild(space);
        }
    });

    // Update the full text if it's not already set
    if (!transcription.text) {
        transcription.text = transcription.segments.map(segment => segment.text).join(' ');
    }
}

function handleFullTranscriptSegmentClick(index) {
    // This function will be defined in ui.js
    if (typeof handleSegmentClick === 'function') {
        handleSegmentClick(index);
    } else {
        console.error('handleSegmentClick function is not defined');
    }
}

function retranscribeSegment(index) {
    const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
    const retranscribeButton = segmentDiv.querySelector('.retranscribe-segment');
    
    // Disable the button and show loading state
    retranscribeButton.disabled = true;
    retranscribeButton.innerHTML = Icons.LOADING_SPINNER;
    
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
            retranscribeButton.innerHTML = Icons.RETRANSCRIBE;
        } else {
            console.error('Failed to re-transcribe segment:', data.error);
            // Restore the button state and show an error message
            retranscribeButton.disabled = false;
            retranscribeButton.innerHTML = Icons.RETRANSCRIBE;
            alert('Failed to re-transcribe segment. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Restore the button state and show an error message
        retranscribeButton.disabled = false;
        retranscribeButton.innerHTML = Icons.RETRANSCRIBE;
        alert('An error occurred while re-transcribing the segment. Please try again.');
    });
}