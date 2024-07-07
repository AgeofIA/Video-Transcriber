let currentlySelectedSegmentIndex = null;
const clearSelectionButton = document.getElementById('clear-selection');
let isListSorted = true; // Add this line to track sorting status

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('transcribe-btn').addEventListener('click', transcribeVideo);
    document.getElementById('download-csv').addEventListener('click', downloadCSV);
    document.getElementById('download-txt').addEventListener('click', downloadTXT);
    document.getElementById('download-srt').addEventListener('click', downloadSRT);
    clearSelectionButton.addEventListener('click', clearSegmentSelection);
    document.getElementById('add-segment').addEventListener('click', addSegment);
    document.getElementById('sort-segments').addEventListener('click', sortSegments);
    
    // Event listener for autoplay toggle
    const autoplayToggle = document.getElementById('autoplay-toggle');
    autoplayToggle.addEventListener('change', (event) => {
        setAutoplayEnabled(event.target.checked);
    });
});

function displaySegmentedTranscription(segments, isSorted = true) {
    const container = document.getElementById('segmented-transcription');
    container.innerHTML = '';
    
    segments.forEach((segment, index) => {
        const div = document.createElement('div');
        div.className = 'mb-2 px-4 py-2 bg-white rounded-lg cursor-pointer transition duration-300 ease-in-out segment-container';
        div.setAttribute('data-index', index);
        const duration = (segment.end - segment.start).toFixed(2);
        div.innerHTML = `
            <textarea class="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-0 segment-text" data-index="${index}" rows="2">${segment.text}</textarea>
            <div class="mt-1 flex justify-between items-center">
                <button class="remove-segment p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 transition duration-300 ease-in-out" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
                <div class="flex items-center space-x-4">
                    <input type="number" class="segment-start w-20 p-1 border border-slate-300 rounded-md focus:outline-none focus:ring-0" value="${segment.start.toFixed(2)}" step="0.01" min="0" data-index="${index}">
                    <span class="text-sm text-slate-600">to</span>
                    <input type="number" class="segment-end w-20 p-1 border border-slate-300 rounded-md focus:outline-none focus:ring-0" value="${segment.end.toFixed(2)}" step="0.01" min="0" data-index="${index}">
                </div>
                <span class="text-sm text-slate-600 segment-time">${duration}s</span>
            </div>
        `;
        container.appendChild(div);
    });
    
    container.addEventListener('mousedown', event => {
        const segmentDiv = event.target.closest('.segment-container');
        if (segmentDiv) {
            const index = parseInt(segmentDiv.getAttribute('data-index'));
            handleSegmentClick(index);
        }
    });

    container.addEventListener('input', event => {
        if (event.target.classList.contains('segment-start') || event.target.classList.contains('segment-end')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            updateSegmentTimes(index);
            if (index === currentlySelectedSegmentIndex) {
                playSegment(index, true); // Force replay
            }
        } else if (event.target.classList.contains('segment-text')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            updateSegmentText(index);
        }
    });

    container.addEventListener('click', event => {
        const removeButton = event.target.closest('.remove-segment');
        if (removeButton) {
            const index = parseInt(removeButton.getAttribute('data-index'));
            removeSegment(index);
        }
    });

    isListSorted = isSorted;
    updateSortButtonVisibility();
}

function updateSortButtonVisibility() {
    const sortButton = document.getElementById('sort-segments');
    if (isListSorted) {
        sortButton.classList.add('hidden');
    } else {
        sortButton.classList.remove('hidden');
    }
}

function updateSegmentTimes(index) {
    const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
    const startInput = segmentDiv.querySelector('.segment-start');
    const endInput = segmentDiv.querySelector('.segment-end');
    const timeSpan = segmentDiv.querySelector('.segment-time');

    const newStart = parseFloat(startInput.value);
    const newEnd = parseFloat(endInput.value);
    const duration = (newEnd - newStart).toFixed(2);

    timeSpan.textContent = `${duration}s`;

    transcription.segments[index].start = newStart;
    transcription.segments[index].end = newEnd;

    saveSegmentChanges(index);

    isListSorted = false;
    updateSortButtonVisibility();
}
function handleSegmentClick(index) {
    if (currentlySelectedSegmentIndex !== index) {
        currentlySelectedSegmentIndex = index;
        highlightSegment(index);
        playSegment(index);
        clearSelectionButton.classList.remove('hidden');
    }
}

function highlightSegment(index) {
    document.querySelectorAll('.segment-container').forEach(el => {
        el.classList.remove('bg-yellow-100');
        el.classList.add('bg-white');
    });
    
    if (index !== null) {
        const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
        segmentDiv.classList.remove('bg-white');
        segmentDiv.classList.add('bg-yellow-100');
    }
}

function clearSegmentSelection() {
    currentlySelectedSegmentIndex = null;
    highlightSegment(null);
    resetVideoPlayer();
    clearSelectionButton.classList.add('hidden');
}

function updateSegmentText(index) {
    const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
    const textArea = segmentDiv.querySelector('.segment-text');

    transcription.segments[index].text = textArea.value;
    saveSegmentChanges(index);
    debouncedUpdateFullTranscription();
}

document.getElementById('segmented-transcription').addEventListener('mousedown', event => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        event.stopPropagation();
    }
});

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

function onSegmentPlay(index) {
    currentlySelectedSegmentIndex = index;
    highlightSegment(index);
    clearSelectionButton.classList.remove('hidden');
}

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

const debouncedUpdateFullTranscription = debounce(updateFullTranscription, 300);