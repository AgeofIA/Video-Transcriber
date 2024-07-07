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

// Set up all event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize debouncedUpdateFullTranscription once updateFullTranscription is available
    if (typeof updateFullTranscription === 'function') {
        debouncedUpdateFullTranscription = debounce(updateFullTranscription, 300);
    }

    // Check for any cached transcription data
    checkForCachedTranscription();

    // Set up event listeners for main control buttons
    document.getElementById('transcribe-btn').addEventListener('click', transcribeVideo);
    document.getElementById('download-csv').addEventListener('click', downloadCSV);
    document.getElementById('download-txt').addEventListener('click', downloadTXT);
    document.getElementById('download-srt').addEventListener('click', downloadSRT);
    document.getElementById('clear-selection').addEventListener('click', clearSegmentSelection);
    document.getElementById('add-segment').addEventListener('click', addSegment);
    document.getElementById('sort-segments').addEventListener('click', sortSegments);

    // Set up event listeners for segmented transcription interactions
    const segmentedTranscription = document.getElementById('segmented-transcription');
    
    // Handle segment selection
    segmentedTranscription.addEventListener('mousedown', event => {
        const segmentDiv = event.target.closest('.segment-container');
        if (segmentDiv) {
            const index = parseInt(segmentDiv.getAttribute('data-index'));
            handleSegmentClick(index);
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
            if (event.target.classList.contains('segment-start') || event.target.classList.contains('segment-end')) {
                updateSegmentTimes(index);
            } else if (event.target.classList.contains('segment-text')) {
                updateSegmentText(index);
            }
        }
    });

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