# Project Structure

## Overview
The YouTube Video Transcriber is organized into a Flask backend and a JavaScript frontend. Here's a detailed breakdown of the project structure:

```
project_root/
├── app.py                    # Main Flask application
├── core.py                   # Core functionality for video processing
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (OpenAI API key)
├── __init__.py               # Python package initialization (empty)
├── static/                   # Frontend static assets
│   ├── css/
│   │   └── styles.css        # Custom CSS styles
│   └── js/
│       ├── download.js       # Download functionality
│       ├── icons.js          # SVG icons
│       ├── player.js         # YouTube player controls
│       ├── segments.js       # Segment manipulation
│       ├── transcription.js  # Transcription handling
│       ├── ui.js             # UI interactions
│       └── utils.js          # Utility functions
├── templates/                # HTML templates
│   └── index.html            # Main application page
├── flask_session/            # Server-side session storage
├── transcription_cache/      # Cache for processed transcriptions
└── tests/                    # Test files
    └── test_core.py          # Core functionality tests

## Key Components

### Backend (Python)
- `app.py`: Flask routes and application setup
- `core.py`: Video processing, transcription, and segment manipulation
- `requirements.txt`: Project dependencies

### Frontend (JavaScript)
- `player.js`: YouTube iframe API integration and playback control
- `segments.js`: Segment manipulation and sorting
- `transcription.js`: Transcription display and updates
- `download.js`: Export functionality (TXT, CSV, SRT)

### Styling
- `styles.css`: Custom styling including scrollbars and toggle switches
- TailwindCSS: Utility-first CSS framework

### Data Storage
- Flask sessions for temporary data storage
- Local cache for transcription results
```