# YouTube Video Transcriber

A web application that transcribes YouTube videos into text with timestamps, allowing for easy editing, segmentation, and export of transcriptions.

## Features

- Transcribe any YouTube video using OpenAI's Whisper model
- Interactive segment editing with synchronized video playback
- Export transcriptions in multiple formats:
  - SRT (subtitles)
  - TXT (plain text)
  - CSV (segments with timestamps)
- Real-time segment manipulation:
  - Add new segments
  - Edit segment text and timestamps
  - Remove segments
  - Re-transcribe individual segments
  - Sort segments by timestamp
- Auto-play segments with loop functionality
- Session-based caching for transcription persistence

## Prerequisites

- Python 3.7+
- OpenAI API key
- Flask
- Modern web browser with JavaScript enabled

## Installation

1. Clone the repository
2. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Usage

1. Start the Flask server:
   ```
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5013
   ```

3. Enter a YouTube URL and click "Transcribe"

## Project Structure

- `/static` - Frontend assets (JavaScript, CSS)
- `/templates` - HTML templates
- `/core.py` - Core functionality for video processing and transcription
- `/app.py` - Flask application and routes
- `/flask_session` - Session data storage

## Dependencies

Key dependencies include:
- Flask and Flask-Session for the web server
- yt-dlp for YouTube video downloading
- moviepy for audio extraction
- OpenAI API for transcription
- TailwindCSS for styling

## License

MIT License

## Contributing

Feel free to submit issues and pull requests to help improve the application.

## Notes

- The application uses server-side sessions to cache transcriptions
- Large videos may take longer to process
- Make sure you have sufficient OpenAI API credits for transcription