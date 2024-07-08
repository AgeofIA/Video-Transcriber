from flask import Flask, render_template, request, jsonify, send_file, session
from flask_session import Session
from core import download_video, transcribe_audio, get_youtube_id, create_csv, create_srt, add_segment, remove_segment, sort_segments, is_sorted, retranscribe_segment
import os
import io

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Set a secret key for session encryption

# Configure server-side sessions
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_FILE_DIR'] = os.path.join(app.root_path, 'flask_session')
Session(app)

@app.route('/')
def index():
    youtube_url = session.get('youtube_url', '')
    return render_template('index.html', youtube_url=youtube_url)

@app.route('/transcribe', methods=['POST'])
def transcribe_video():
    youtube_url = request.form['youtube_url']
    youtube_id = get_youtube_id(youtube_url)
    
    if not youtube_id:
        return jsonify({'error': 'Invalid YouTube URL. Please enter a valid YouTube video link.'}), 400
    
    try:
        video_file_path = download_video(youtube_url)
        transcription = transcribe_audio(video_file_path)
        os.unlink(video_file_path)  # Delete the temporary video file
        
        # Ensure the full text is included in the session data
        session['transcription'] = {
            'youtube_id': youtube_id,
            'text': transcription.text,
            'segments': [{**segment, 'text': segment['text'].strip()} for segment in transcription.segments]
        }
        session['youtube_url'] = youtube_url
        
        # Check if segments are sorted
        is_sorted_status = is_sorted(session['transcription']['segments'])
        
        return jsonify({
            'youtube_id': youtube_id,
            'text': transcription.text,
            'segments': session['transcription']['segments'],
            'is_sorted': is_sorted_status
        })
    except Exception as e:
        return jsonify({'error': f'An error occurred while processing the video: {str(e)}'}), 500

@app.route('/get_cached_transcription')
def get_cached_transcription():
    if 'transcription' in session:
        is_sorted_status = is_sorted(session['transcription']['segments'])
        return jsonify({
            'transcription': {
                'youtube_id': session['transcription']['youtube_id'],
                'text': session['transcription']['text'],
                'segments': session['transcription']['segments'],
                'is_sorted': is_sorted_status
            },
            'youtube_url': session.get('youtube_url', '')
        })
    else:
        return jsonify({'error': 'No cached transcription available'}), 404

@app.route('/update_segment', methods=['POST'])
def update_segment():
    data = request.json
    index = data['index']
    start_time = data['start_time']
    end_time = data['end_time']
    text = data['text'].strip()
    
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    session['transcription']['segments'][index]['start'] = start_time
    session['transcription']['segments'][index]['end'] = end_time
    session['transcription']['segments'][index]['text'] = text
    
    # Update the full transcription text
    session['transcription']['text'] = ' '.join([seg['text'].strip() for seg in session['transcription']['segments']])
    
    session.modified = True  # Ensure the session is saved
    
    return jsonify({'success': True})

@app.route('/add_segment', methods=['POST'])
def add_new_segment():
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    data = request.json
    start_time = data['start_time']
    end_time = data['end_time']
    text = data['text']
    selected_index = data['selected_index']
    
    session['transcription'], is_sorted_status = add_segment(session['transcription'], start_time, end_time, text, selected_index)
    session.modified = True
    
    return jsonify({'success': True, 'transcription': session['transcription'], 'is_sorted': is_sorted_status})

@app.route('/remove_segment', methods=['POST'])
def remove_existing_segment():
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    data = request.json
    index = data['index']
    
    session['transcription'] = remove_segment(session['transcription'], index)
    session.modified = True
    
    return jsonify({'success': True, 'transcription': session['transcription']})

@app.route('/download_csv')
def download_csv():
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    csv_data = create_csv(session['transcription'])
    csv_buffer = io.BytesIO()
    csv_buffer.write(csv_data.encode('utf-8'))
    csv_buffer.seek(0)
    
    return send_file(
        csv_buffer,
        mimetype='text/csv',
        as_attachment=True,
        download_name='transcript.csv'
    )

@app.route('/download_txt')
def download_txt():
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    full_text = session['transcription']['text']
    txt_buffer = io.BytesIO()
    txt_buffer.write(full_text.encode('utf-8'))
    txt_buffer.seek(0)
    
    return send_file(
        txt_buffer,
        mimetype='text/plain',
        as_attachment=True,
        download_name='transcript.txt'
    )

@app.route('/download_srt')
def download_srt():
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    srt_data = create_srt(session['transcription'])
    srt_buffer = io.BytesIO()
    srt_buffer.write(srt_data.encode('utf-8'))
    srt_buffer.seek(0)
    
    return send_file(
        srt_buffer,
        mimetype='text/plain',
        as_attachment=True,
        download_name='transcript.srt'
    )

@app.route('/sort_segments', methods=['POST'])
def sort_transcription_segments():
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    session['transcription'] = sort_segments(session['transcription'])
    session.modified = True
    
    return jsonify({'success': True, 'transcription': session['transcription']})

# Add this new route
@app.route('/retranscribe_segment', methods=['POST'])
def retranscribe_segment_route():
    if 'transcription' not in session:
        return jsonify({'error': 'No transcription available'}), 400
    
    data = request.json
    index = data['index']
    youtube_url = session['youtube_url']
    
    try:
        # Download the video
        video_file_path = download_video(youtube_url)
        
        # Get the segment to retranscribe
        segment = session['transcription']['segments'][index]
        
        # Retranscribe the segment
        new_segment = retranscribe_segment(video_file_path, segment['start'], segment['end'])
        
        # Update the transcription in the session
        session['transcription']['segments'][index] = new_segment
        session['transcription']['text'] = ' '.join([seg['text'].strip() for seg in session['transcription']['segments']])
        session.modified = True
        
        # Clean up the temporary video file
        os.unlink(video_file_path)
        
        return jsonify({'success': True, 'segment': new_segment})
    except Exception as e:
        return jsonify({'error': f'An error occurred while re-transcribing the segment: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5013)