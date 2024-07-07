import unittest
from core import download_audio, transcribe_audio

class TestCoreFunctions(unittest.TestCase):
    def test_audio_transcription(self):
        # URL of a YouTube video with clear, spoken content for testing
        test_youtube_url = 'https://www.youtube.com/watch?v=9fKpbTcAk1E'

        # Download the audio from the specified YouTube video
        audio_file_path = download_audio(test_youtube_url)
        self.assertTrue(audio_file_path, "Failed to download audio from YouTube")

        # Transcribe the downloaded audio
        transcription = transcribe_audio(audio_file_path)
        self.assertTrue(transcription, "Failed to transcribe audio")

if __name__ == '__main__':
    unittest.main()
