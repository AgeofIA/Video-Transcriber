let isDownloadDropdownOpen = false;

function toggleDownloadDropdown() {
    const dropdownBtn = document.getElementById('download-dropdown-btn');
    const downloadOptions = document.getElementById('download-options');
    
    isDownloadDropdownOpen = !isDownloadDropdownOpen;
    
    if (isDownloadDropdownOpen) {
        downloadOptions.classList.remove('hidden');
        dropdownBtn.classList.add('active');
    } else {
        downloadOptions.classList.add('hidden');
        dropdownBtn.classList.remove('active');
    }
}

function closeDownloadDropdown() {
    if (isDownloadDropdownOpen) {
        toggleDownloadDropdown();
    }
}

function handleDownload(type) {
    switch (type) {
        case 'srt':
            downloadSRT();
            break;
        case 'txt':
            downloadTXT();
            break;
        case 'csv':
            downloadCSV();
            break;
    }
    closeDownloadDropdown();
}

function downloadSRT() {
    fetch('/download_srt')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'transcript.srt';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Error:', error));
}

function downloadTXT() {
    fetch('/download_txt')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'transcript.txt';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Error:', error));
}

function downloadCSV() {
    fetch('/download_csv')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'transcript.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Error:', error));
}