// Debounce function to limit the frequency of function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Create a debounced version of updateFullTranscription
let debouncedUpdateFullTranscription;

const debouncedUpdateSegmentTimes = debounce((index, isManualInput, timeType) => {
    const newTime = updateSegmentTimes(index, isManualInput, timeType);
    if (isManualInput && timeType === 'start') {
        playSegment(index, true, newTime);
    }
}, 1000);

// Set up all event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize debouncedUpdateFullTranscription once updateFullTranscription is available
    if (typeof updateFullTranscription === 'function') {
        debouncedUpdateFullTranscription = debounce(updateFullTranscription, 300);
    }

    // Check for any cached transcription data
    checkForCachedTranscription();

    // Set up form submission handler for transcription
    document.getElementById('transcribe-form').addEventListener('submit', (e) => {
        e.preventDefault();
        transcribeVideo();
    });

    // Set up event listeners for main control buttons
    document.getElementById('clear-selection').addEventListener('click', clearSegmentSelection);
    document.getElementById('add-segment').addEventListener('click', addSegment);
    document.getElementById('sort-segments').addEventListener('click', sortSegments);

    // Event listeners for download functionality
    document.getElementById('download-dropdown-btn').addEventListener('click', toggleDownloadDropdown);
    document.getElementById('download-srt').addEventListener('click', () => handleDownload('srt'));
    document.getElementById('download-txt').addEventListener('click', () => handleDownload('txt'));
    document.getElementById('download-csv').addEventListener('click', () => handleDownload('csv'));

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const downloadSection = document.getElementById('download-section');
        if (!downloadSection.contains(event.target)) {
            closeDownloadDropdown();
        }
    });

    // Set up event listeners for segmented transcription interactions
    const segmentedTranscription = document.getElementById('segmented-transcription');

    // Handle segment selection in segmented transcription
    segmentedTranscription.addEventListener('mousedown', event => {
        const segmentDiv = event.target.closest('.segment-container');
        if (segmentDiv) {
            const index = parseInt(segmentDiv.getAttribute('data-index'));
            handleSegmentClick(index, 'segmented-transcription');
        }
    });

    // Handle segment selection in full transcription
    const fullTranscription = document.getElementById('full-transcription');
    fullTranscription.addEventListener('mousedown', event => {
        const segmentSpan = event.target.closest('span[data-index]');
        if (segmentSpan) {
            const index = parseInt(segmentSpan.getAttribute('data-index'));
            handleSegmentClick(index, 'full-transcription');
        }
    });

    // Prevent selection when interacting with inputs and textareas
    segmentedTranscription.addEventListener('click', event => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            event.stopPropagation();
        }
    });

    // Handle updates to segment times and text
    segmentedTranscription.addEventListener('input', event => {
        const segmentDiv = event.target.closest('.segment-container');
        if (segmentDiv) {
            const index = parseInt(segmentDiv.getAttribute('data-index'));
            if (event.target.classList.contains('segment-start')) {
                handleStartTimeUpdate(index, event.target.value, event.inputType);
            } else if (event.target.classList.contains('segment-end')) {
                handleEndTimeUpdate(index, event.target.value, event.inputType);
            } else if (event.target.classList.contains('segment-text')) {
                updateSegmentText(index);
            }
        }
    });

    function handleStartTimeUpdate(index, value, inputType) {
        const isManualInput = inputType === 'insertText' || inputType === 'deleteContentBackward';
        if (isManualInput) {
            debouncedUpdateSegmentTimes(index, true, 'start');
        } else {
            const newStartTime = updateSegmentTimes(index, false, 'start');
            playSegment(index, true, newStartTime);
        }
    }

    function handleEndTimeUpdate(index, value, inputType) {
        const isManualInput = inputType === 'insertText' || inputType === 'deleteContentBackward';
        if (isManualInput) {
            debouncedUpdateSegmentTimes(index, true, 'end');
        } else {
            updateSegmentTimes(index, false, 'end');
        }
    }

    // Handle segment removal and retranscription
    segmentedTranscription.addEventListener('click', event => {
        const removeButton = event.target.closest('.remove-segment');
        if (removeButton) {
            event.stopPropagation(); // Prevent segment selection
            const index = parseInt(removeButton.closest('.segment-container').getAttribute('data-index'));
            removeSegment(index);
        }
        
        const retranscribeButton = event.target.closest('.retranscribe-segment');
        if (retranscribeButton) {
            event.stopPropagation(); // Prevent segment selection
            const index = parseInt(retranscribeButton.closest('.segment-container').getAttribute('data-index'));
            retranscribeSegment(index);
        }
    });

    // Handle autoplay toggle
    const autoplayToggle = document.getElementById('autoplay-toggle');
    autoplayToggle.addEventListener('change', (event) => {
        setAutoplayEnabled(event.target.checked);
    });
});