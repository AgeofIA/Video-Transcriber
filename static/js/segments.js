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
    const videoDuration = getDuration();
    const selectedIndex = currentlySelectedSegmentIndex !== null ? currentlySelectedSegmentIndex : -1;
    
    fetch('/add_segment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            start_time: 0,
            end_time: videoDuration,
            text: "",
            selected_index: selectedIndex
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
            
            // If a segment was selected, highlight the new segment
            if (selectedIndex !== -1) {
                handleSegmentClick(selectedIndex + 1);
            }
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

function updateSegmentTimes(index) {
    const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
    const startInput = segmentDiv.querySelector('.segment-start');
    const endInput = segmentDiv.querySelector('.segment-end');
    const timeSpan = segmentDiv.querySelector('.segment-time');

    const videoDuration = getDuration();
    const newStart = Math.max(0, Math.min(parseFloat(startInput.value), parseFloat(endInput.value), videoDuration));
    const newEnd = Math.min(Math.max(parseFloat(startInput.value), parseFloat(endInput.value)), videoDuration);

    startInput.value = newStart.toFixed(2);
    endInput.value = newEnd.toFixed(2);

    const duration = (newEnd - newStart).toFixed(2);
    timeSpan.textContent = `${duration}s`;

    transcription.segments[index].start = newStart;
    transcription.segments[index].end = newEnd;

    saveSegmentChanges(index);

    isListSorted = false;
    updateSortButtonVisibility();

    return newStart;
}

function updateSegmentText(index) {
    const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
    const textArea = segmentDiv.querySelector('.segment-text');

    transcription.segments[index].text = textArea.value;
    saveSegmentChanges(index);
    debouncedUpdateFullTranscription();
}

function sortSegments() {
    fetch('/sort_segments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            transcription = data.transcription;
            displaySegmentedTranscription(transcription.segments);
            updateFullTranscription();
            console.log('Segments sorted successfully');
            isListSorted = true;
            updateSortButtonVisibility();
        } else {
            console.error('Failed to sort segments');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}