let currentlySelectedSegmentIndex = null;
const clearSelectionButton = document.getElementById('clear-selection');
let isListSorted = true;

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
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <div class="flex-grow"></div>
                        <button class="retranscribe-segment p-1 text-green-500 hover:text-green-700 rounded-full hover:bg-green-100 transition duration-300 ease-in-out" data-index="${index}" title="Re-transcribe segment">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
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
        
        const retranscribeButton = event.target.closest('.retranscribe-segment');
        if (retranscribeButton) {
            const index = parseInt(retranscribeButton.getAttribute('data-index'));
            retranscribeSegment(index);  // This function is now in transcription.js
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

function onSegmentPlay(index) {
    currentlySelectedSegmentIndex = index;
    highlightSegment(index);
    clearSelectionButton.classList.remove('hidden');
}