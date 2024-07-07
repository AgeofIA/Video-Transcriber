import os
import tempfile
import pytube
from dotenv import load_dotenv
from openai import OpenAI
from urllib.parse import urlparse, parse_qs
import csv
import io

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
    yt = pytube.YouTube(youtube_url)
    video_stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
    video_stream.download(output_path=temp_file.name.rsplit('/', 1)[0], filename=temp_file.name.rsplit('/', 1)[1])
    return temp_file.name

def transcribe_audio(file_path):
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )
    return transcription

def update_transcription(transcription, index, start_time, end_time, text):
    transcription.segments[index]['start'] = start_time
    transcription.segments[index]['end'] = end_time
    transcription.segments[index]['text'] = text.strip()
    # Rebuild full transcription text
    transcription.text = ' '.join([seg['text'].strip() for seg in transcription.segments])
    return transcription

def add_segment(transcription, start_time, end_time, text):
    new_segment = {
        'start': start_time,
        'end': end_time,
        'text': text
    }
    
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