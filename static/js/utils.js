// Debounce function to limit the frequency of updates
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

// This will be defined once updateFullTranscription is available
let debouncedUpdateFullTranscription;

// Event listeners setup
document.addEventListener('DOMContentLoaded', () => {
    // Call checkForCachedTranscription when the DOM is loaded
    checkForCachedTranscription();

    // Initialize debouncedUpdateFullTranscription once updateFullTranscription is available
    if (typeof updateFullTranscription === 'function') {
        debouncedUpdateFullTranscription = debounce(updateFullTranscription, 300);
    }

    document.getElementById('transcribe-btn').addEventListener('click', transcribeVideo);
    document.getElementById('download-csv').addEventListener('click', downloadCSV);
    document.getElementById('download-txt').addEventListener('click', downloadTXT);
    document.getElementById('download-srt').addEventListener('click', downloadSRT);
    document.getElementById('clear-selection').addEventListener('click', clearSegmentSelection);
    document.getElementById('add-segment').addEventListener('click', addSegment);
    document.getElementById('sort-segments').addEventListener('click', sortSegments);

    // Event listener for segment selection
    document.getElementById('segmented-transcription').addEventListener('mousedown', event => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            event.stopPropagation();
        }
    });

    // Event listener for autoplay toggle
    const autoplayToggle = document.getElementById('autoplay-toggle');
    autoplayToggle.addEventListener('change', (event) => {
        setAutoplayEnabled(event.target.checked);
    });
});