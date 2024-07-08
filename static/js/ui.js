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

// Handles the click event on a segment
function handleSegmentClick(index) {
    if (currentlySelectedSegmentIndex !== index) {
        currentlySelectedSegmentIndex = index;
        highlightSegment(index);
        playSegment(index);
        document.getElementById('clear-selection').classList.remove('hidden');
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

// Clears the current segment selection
function clearSegmentSelection() {
    currentlySelectedSegmentIndex = null;
    highlightSegment(null);
    resetVideoPlayer();
    document.getElementById('clear-selection').classList.add('hidden');
}

// Updates the UI when a segment is played
function onSegmentPlay(index) {
    currentlySelectedSegmentIndex = index;
    highlightSegment(index);
    document.getElementById('clear-selection').classList.remove('hidden');
}