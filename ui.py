import streamlit as st
import os
from core import download_video, transcribe_audio, get_youtube_id, update_transcription, create_csv

st.set_page_config(page_title='YouTube Video Transcriber')
st.title('YouTube Video Transcriber')

@st.experimental_dialog("Video Segment", width='large')
def play_segment(youtube_id, index, start_time, end_time, segment_text):
    embed_code = f"""
    <div id="player"></div>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
        var player;
        var startTime = {start_time};
        var endTime = {end_time};
        
        function onYouTubeIframeAPIReady() {{
            player = new YT.Player('player', {{
                height: '315',
                width: '560',
                videoId: '{youtube_id}',
                playerVars: {{
                    'autoplay': 1,
                    'start': Math.floor(startTime),
                    'end': Math.ceil(endTime),
                    'controls': 1
                }},
                events: {{
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }}
            }});
        }}

        function onPlayerReady(event) {{
            event.target.playVideo();
            player.seekTo(startTime);
        }}

        function onPlayerStateChange(event) {{
            if (event.data == YT.PlayerState.PLAYING) {{
                setTimeout(checkTime, 1000);
            }}
        }}

        function checkTime() {{
            var currentTime = player.getCurrentTime();
            if (currentTime >= endTime) {{
                player.seekTo(startTime);
            }}
            setTimeout(checkTime, 1000);
        }}
    </script>
    """
    st.components.v1.html(embed_code, height=350)
    
    col1, col2 = st.columns(2)
    with col1:
        new_start = st.number_input("Start Time (s)", min_value=0.0, value=start_time, step=0.01, format="%.2f", key=f"start_{index}")
    with col2:
        new_end = st.number_input("End Time (s)", min_value=new_start, value=end_time, step=0.01, format="%.2f", key=f"end_{index}")
    
    new_text = st.text_area("Transcription", value=segment_text, key=f"text_{index}")
    
    duration = new_end - new_start
    st.caption(f"Segment Duration: {duration:.2f}s")
    
    if st.button("Save Changes"):
        st.session_state.transcription = update_transcription(st.session_state.transcription, index, new_start, new_end, new_text)
        st.success("Changes saved successfully!")
        st.rerun()

    if st.button("Update Video"):
        st.rerun()

youtube_url = st.text_input('Enter the YouTube video URL:', '')

if st.button('Transcribe Video'):
    if youtube_url:
        youtube_id = get_youtube_id(youtube_url)
        if not youtube_id:
            st.error("Invalid YouTube URL. Please enter a valid YouTube video URL.")
            st.stop()
        
        st.session_state.youtube_id = youtube_id
        
        with st.spinner('Downloading video...'):
            try:
                video_file_path = download_video(youtube_url)
                st.session_state.video_file_path = video_file_path
            except Exception as e:
                st.error(f"Failed to download video: {e}")
                st.stop()

        with st.spinner('Transcribing audio...'):
            try:
                transcription = transcribe_audio(st.session_state.video_file_path)
                st.session_state.transcription = transcription
            except Exception as e:
                st.error(f"Failed to transcribe audio: {e}")
                if st.session_state.video_file_path:
                    os.unlink(st.session_state.video_file_path)
                    st.session_state.video_file_path = None
                st.stop()
    else:
        st.warning("Please enter a YouTube URL before transcribing.")

if 'transcription' in st.session_state:
    # Display the full text transcription
    st.subheader('Full Transcription:')
    st.text_area('', value=st.session_state.transcription.text, height=200)

    # Add CSV download button
    csv_data = create_csv(st.session_state.transcription)
    st.download_button(
        label="Download Transcript as CSV",
        data=csv_data,
        file_name="transcript.csv",
        mime="text/csv"
    )

    # Display segment-level transcription with timestamps and play buttons
    st.subheader('Transcription with Timestamps:')
    for index, segment in enumerate(st.session_state.transcription.segments):
        start_time = segment['start']
        end_time = segment['end']
        segment_text = segment['text']
        col1, col2 = st.columns([1, 5])
        with col1:
            if st.button(f"Play", key=f"play_{start_time}"):
                play_segment(st.session_state.youtube_id, index, start_time, end_time, segment_text)
        with col2:
            st.caption(f"[{start_time:.2f}s - {end_time:.2f}s]")
            st.write(segment_text)