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

def get_youtube_id(url):
    parsed_url = urlparse(url)
    if parsed_url.hostname == 'youtu.be':
        return parsed_url.path[1:]
    if parsed_url.hostname in ('www.youtube.com', 'youtube.com'):
        if 'v' in parse_qs(parsed_url.query):
            return parse_qs(parsed_url.query)['v'][0]
    return None

def download_video(youtube_url):
    temp_file = None
    temp_audio_file = None
    
    try:
        logger.info(f"Starting download process for URL: {youtube_url}")
        
        # Create temporary files first
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        
        logger.info(f"Created temporary files: video={temp_file.name}, audio={temp_audio_file.name}")
        
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
            'outtmpl': temp_file.name,
            'quiet': False,
            'no_warnings': False,
            'progress': True,
            'force_overwrites': True,  # Force overwrite of existing files
            'no_cache_dir': True,      # Disable cache
            'rm_cache_dir': True,      # Remove any existing cache
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }]
        }
        
        logger.info("Starting video download with yt-dlp")
        
        # Clean up any existing files before download
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        if os.path.exists(temp_audio_file.name):
            os.unlink(temp_audio_file.name)
            
        # Download the video
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(youtube_url, download=True)
                if not info:
                    raise Exception("No video information extracted")
                logger.info(f"Download completed. File size: {os.path.getsize(temp_file.name) if os.path.exists(temp_file.name) else 'file not found'}")
            except Exception as e:
                logger.error(f"yt-dlp download failed: {str(e)}")
                # Try alternate download method
                ydl_opts['format'] = 'bestaudio[ext=mp3]/bestaudio/best'
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }]
                ydl_opts['outtmpl'] = temp_audio_file.name
                info = ydl.extract_info(youtube_url, download=True)
                if os.path.exists(temp_audio_file.name) and os.path.getsize(temp_audio_file.name) > 0:
                    logger.info("Successfully downloaded audio directly")
                    return temp_audio_file.name
                raise
        
        # Verify video download
        if not os.path.exists(temp_file.name):
            raise Exception(f"Video file not found at {temp_file.name}")
        if os.path.getsize(temp_file.name) == 0:
            raise Exception("Downloaded video file is empty")
            
        logger.info("Extracting audio from video")
        
        # Extract audio
        video = VideoFileClip(temp_file.name)
        if not video.audio:
            raise Exception("No audio stream found in video")
            
        video.audio.write_audiofile(temp_audio_file.name, codec='mp3', logger=None)
        video.close()
        
        # Clean up video file
        os.unlink(temp_file.name)
        logger.info("Video file cleaned up")
        
        # Verify audio file
        if not os.path.exists(temp_audio_file.name) or os.path.getsize(temp_audio_file.name) == 0:
            raise Exception("Failed to extract audio from video")
            
        logger.info("Audio extraction completed successfully")
        return temp_audio_file.name
            
    except Exception as e:
        logger.error(f"Error in download_video: {str(e)}")
        # Clean up any temporary files
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        if temp_audio_file and os.path.exists(temp_audio_file.name):
            os.unlink(temp_audio_file.name)
        raise Exception(f"Failed to download video: {str(e)}")

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