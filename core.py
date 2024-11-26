import csv
import io
import logging
import os
import tempfile
from urllib.parse import parse_qs, urlparse

import yt_dlp
from dotenv import load_dotenv
from moviepy.editor import VideoFileClip
from openai import OpenAI

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load OpenAI API Key from .env
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Add after the imports
MAX_VIDEO_DURATION = 600  # 10 minutes max

def get_youtube_id(url):
    parsed_url = urlparse(url)
    if parsed_url.hostname == 'youtu.be':
        return parsed_url.path[1:]
    if parsed_url.hostname in ('www.youtube.com', 'youtube.com'):
        if 'v' in parse_qs(parsed_url.query):
            return parse_qs(parsed_url.query)['v'][0]
    return None

def download_audio(youtube_url):
    temp_audio_file = None
    
    try:
        logger.info(f"Starting audio download process for URL: {youtube_url}")
        
        # First, extract video information without downloading
        ydl_opts = {
            'quiet': True,
            'extract_flat': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            duration = info.get('duration', 0)
            
            if duration > MAX_VIDEO_DURATION:
                raise Exception(f"Video is too long. Maximum duration allowed is {MAX_VIDEO_DURATION/60:.1f} minutes.")
        
        # Create temporary file path (don't create the file yet)
        temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3').name
        logger.info(f"Created temporary file path: audio={temp_audio_file}")
        
        # Configure yt-dlp options for download
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': temp_audio_file[:-4],
            'quiet': True,
            'extract_audio': True,
            'audio_format': 'mp3',
            'audio_quality': 0,
            'prefer_ffmpeg': True
        }
        
        # Download the audio
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
            
        # The actual file will have .mp3 extension added by yt-dlp
        actual_file = temp_audio_file[:-4] + '.mp3'
        
        # Verify the file exists and has content
        if not os.path.exists(actual_file) or os.path.getsize(actual_file) == 0:
            raise Exception("Failed to download audio file")
            
        return actual_file
            
    except Exception as e:
        logger.error(f"Error in download_audio: {str(e)}")
        # Clean up any temporary files
        if temp_audio_file:
            base_path = temp_audio_file[:-4]
            for ext in ['.mp3', '.m4a', '.part', '.webm']:
                if os.path.exists(base_path + ext):
                    os.unlink(base_path + ext)
        raise

def transcribe_audio(file_path):
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )
    
    # Ensure the full text is included in the transcription object
    if not hasattr(transcription, 'text') or not transcription.text:
        transcription.text = ' '.join([seg['text'].strip() for seg in transcription.segments])
    
    return transcription

def update_transcription(transcription, index, start_time, end_time, text):
    transcription.segments[index]['start'] = start_time
    transcription.segments[index]['end'] = end_time
    transcription.segments[index]['text'] = text.strip()
    # Rebuild full transcription text
    transcription.text = ' '.join([seg['text'].strip() for seg in transcription.segments])
    return transcription

def add_segment(transcription, start_time, end_time, text, selected_index):
    new_segment = {
        'start': start_time,
        'end': end_time,
        'text': text
    }
    
    if selected_index >= 0:
        transcription['segments'].insert(selected_index + 1, new_segment)
    else:
        transcription['segments'].insert(0, new_segment)
    
    # Update the full transcription text
    transcription['text'] = ' '.join([seg['text'].strip() for seg in transcription['segments']])
    
    # Check if the list is still sorted after adding the new segment
    is_sorted_status = is_sorted(transcription['segments'])
    
    return transcription, is_sorted_status

def remove_segment(transcription, index):
    if 0 <= index < len(transcription['segments']):
        del transcription['segments'][index]
        
        # Update the full transcription text
        transcription['text'] = ' '.join([seg['text'].strip() for seg in transcription['segments']])
    
    return transcription

def sort_segments(transcription):
    transcription['segments'].sort(key=lambda x: x['start'])
    
    # Update the full transcription text
    transcription['text'] = ' '.join([seg['text'].strip() for seg in transcription['segments']])
    
    return transcription

def is_sorted(segments):
    if len(segments) <= 1:
        return True
    return all(segments[i]['start'] <= segments[i+1]['start'] for i in range(len(segments)-1))

def create_csv(transcription):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Start Time', 'End Time', 'Text'])
    for segment in transcription['segments']:
        writer.writerow([segment['start'], segment['end'], segment['text'].strip()])
    return output.getvalue()

def create_srt(transcription):
    output = io.StringIO()
    for i, segment in enumerate(transcription['segments'], start=1):
        start = format_time(segment['start'])
        end = format_time(segment['end'])
        output.write(f"{i}\n")
        output.write(f"{start} --> {end}\n")
        output.write(f"{segment['text'].strip()}\n\n")
    return output.getvalue()

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    milliseconds = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{milliseconds:03d}"

def retranscribe_segment(video_file_path, start_time, end_time):
    # Extract the audio segment
    video = VideoFileClip(video_file_path)
    audio_segment = video.audio.subclip(start_time, end_time)
    
    # Save the audio segment to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio_file:
        audio_segment.write_audiofile(temp_audio_file.name)
    
    # Transcribe the audio segment
    with open(temp_audio_file.name, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json"
        )
    
    # Clean up the temporary audio file
    os.unlink(temp_audio_file.name)
    
    # Create a new segment with the transcription result
    new_segment = {
        'start': start_time,
        'end': end_time,
        'text': transcription.text.strip()
    }
    
    return new_segment