// Global variables
let currentlySelectedSegmentIndex = null;
let isListSorted = true;

// Displays the segmented transcription in the UI
function displaySegmentedTranscription(segments, isSorted = true) {
    const container = document.getElementById('segmented-transcription');
    container.innerHTML = '';
    
    segments.forEach((segment, index) => {
        const div = document.createElement('div');
        div.className = 'mb-2 px-4 pt-2 pb-1 bg-white rounded-lg cursor-pointer transition duration-300 ease-in-out segment-container';
        div.setAttribute('data-index', index);
        const duration = (segment.end - segment.start).toFixed(2);
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-grow pr-4">
                    <textarea class="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-0 segment-text h-[4.5em] overflow-y-auto" data-index="${index}">${segment.text}</textarea>
                    <div class="px-3 flex justify-between items-center w-full">
                        <button class="remove-segment p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 transition duration-300 ease-in-out" data-index="${index}" title="Delete segment">
                            ${Icons.REMOVE}
                        </button>
                        <div class="flex-grow"></div>
                        <button class="retranscribe-segment p-1 text-green-500 hover:text-green-700 rounded-full hover:bg-green-100 transition duration-300 ease-in-out" data-index="${index}" title="Re-transcribe segment">
                            ${Icons.RETRANSCRIBE}
                        </button>
                    </div>
                </div>
                <div class="w-20 flex flex-col items-end">
                    <input type="number" class="segment-start w-full p-1 mb-1 border border-slate-300 rounded-md focus:outline-none focus:ring-0" value="${segment.start.toFixed(2)}" step="0.01" min="0" data-index="${index}">
                    <input type="number" class="segment-end w-full p-1 mb-1 border border-slate-300 rounded-md focus:outline-none focus:ring-0" value="${segment.end.toFixed(2)}" step="0.01" min="0" data-index="${index}">
                    <span class="mt-1 text-sm text-slate-600 segment-time text-center w-full">${duration}s</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    isListSorted = isSorted;
    updateSortButtonVisibility();
}

// Updates the visibility of the sort button based on whether the list is sorted
function updateSortButtonVisibility() {
    const sortButton = document.getElementById('sort-segments');
    if (isListSorted) {
        sortButton.classList.add('hidden');
    } else {
        sortButton.classList.remove('hidden');
    }
}

// Handle segment highlighting and selection
function handleSegmentClick(index, source) {
    if (currentlySelectedSegmentIndex !== index) {
        currentlySelectedSegmentIndex = index;
        highlightSegment(index);
        highlightFullTranscriptSegment(index);
        
        // Use setTimeout to ensure the DOM has updated before scrolling
        setTimeout(() => {
            if (source === 'full-transcription') {
                scrollToSegmentInSegmentsList(index);
            } else if (source === 'segmented-transcription') {
                scrollToSegmentInFullTranscript(index);
            }
        }, 0);
        
        playSegment(index);
        document.getElementById('clear-selection').classList.remove('hidden');
    }
}

// Scroll to the segment in the full transcript
function scrollToSegmentInFullTranscript(index) {
    const fullTranscriptDiv = document.getElementById('full-transcription');
    const segments = fullTranscriptDiv.getElementsByTagName('span');
    if (index !== null && index < segments.length) {
        const segment = segments[index];
        const containerRect = fullTranscriptDiv.getBoundingClientRect();
        const segmentRect = segment.getBoundingClientRect();
        
        fullTranscriptDiv.scrollTop = fullTranscriptDiv.scrollTop + (segmentRect.top - containerRect.top) - (containerRect.height / 2) + (segmentRect.height / 2);
    }
}

// Scroll to the segment in the segments list
function scrollToSegmentInSegmentsList(index) {
    const segmentedTranscription = document.getElementById('segmented-transcription');
    const segmentDiv = segmentedTranscription.querySelector(`.segment-container[data-index="${index}"]`);
    if (segmentDiv) {
        const containerRect = segmentedTranscription.getBoundingClientRect();
        const segmentRect = segmentDiv.getBoundingClientRect();
        
        // Calculate the scroll position to bring the segment to the top of the container
        const scrollTop = segmentedTranscription.scrollTop + (segmentRect.top - containerRect.top);
        
        // Scroll the container
        segmentedTranscription.scrollTop = scrollTop;
    }
}

// Highlights the selected segment in the UI
function highlightSegment(index) {
    document.querySelectorAll('.segment-container').forEach(el => {
        el.classList.remove('bg-yellow-100');
        el.classList.add('bg-white');
    });
    
    if (index !== null) {
        const segmentDiv = document.querySelector(`.segment-container[data-index="${index}"]`);
        if (segmentDiv) {
            segmentDiv.classList.remove('bg-white');
            segmentDiv.classList.add('bg-yellow-100');
        }
    }
}

// Highlight the selected segment in the full transcript
function highlightFullTranscriptSegment(index) {
    const fullTranscriptDiv = document.getElementById('full-transcription');
    const segments = fullTranscriptDiv.getElementsByTagName('span');

    // Remove highlight from all segments
    for (let i = 0; i < segments.length; i++) {
        segments[i].classList.remove('bg-yellow-200');
    }

    // Add highlight to the selected segment
    if (index !== null && index < segments.length) {
        segments[index].classList.add('bg-yellow-200');
    }
}

// Clear the currently selected segment and reset the UI
function clearSegmentSelection() {
    currentlySelectedSegmentIndex = null;
    highlightSegment(null);
    highlightFullTranscriptSegment(null);
    resetVideoPlayer();
    document.getElementById('clear-selection').classList.add('hidden');
}

// Updates the UI when a segment is played
function onSegmentPlay(index) {
    currentlySelectedSegmentIndex = index;
    highlightSegment(index);
    document.getElementById('clear-selection').classList.remove('hidden');
}