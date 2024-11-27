import unittest
import os

from core import download_audio, transcribe_audio, get_youtube_id

class TestCoreFunctions(unittest.TestCase):
    def setUp(self):
        # Use a short, public domain video for testing
        self.test_youtube_url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'  # "Me at the zoo" - First YouTube video
        self.temp_files = []

    def tearDown(self):
        # Clean up any temporary files created during tests
        for file in self.temp_files:
            if os.path.exists(file):
                os.unlink(file)

    def test_get_youtube_id(self):
        # Test various YouTube URL formats
        test_cases = [
            ('https://www.youtube.com/watch?v=jNQXAC9IVRw', 'jNQXAC9IVRw'),
            ('https://youtu.be/jNQXAC9IVRw', 'jNQXAC9IVRw'),
            ('https://www.youtube.com/watch?v=jNQXAC9IVRw&t=10s', 'jNQXAC9IVRw'),
            ('invalid_url', None)
        ]
        
        for url, expected_id in test_cases:
            with self.subTest(url=url):
                self.assertEqual(get_youtube_id(url), expected_id)

    def test_audio_download(self):
        # Test downloading and converting to audio
        audio_file_path = download_audio(self.test_youtube_url)
        self.temp_files.append(audio_file_path)
        
        # Verify the file exists and has content
        self.assertTrue(os.path.exists(audio_file_path))
        self.assertGreater(os.path.getsize(audio_file_path), 0)
        self.assertTrue(audio_file_path.endswith('.mp3'))
        
        self.audio_file_path = audio_file_path

    def test_audio_transcription(self):
        # Download and transcribe a short video
        audio_file_path = download_audio(self.test_youtube_url)
        self.temp_files.append(audio_file_path)
        
        # Test transcription
        transcription = transcribe_audio(audio_file_path)
        
        # Verify transcription structure and content
        self.assertTrue(hasattr(transcription, 'text'))
        self.assertTrue(hasattr(transcription, 'segments'))
        self.assertGreater(len(transcription.text), 0)
        self.assertGreater(len(transcription.segments), 0)
        
        # Verify segment structure
        first_segment = transcription.segments[0]
        self.assertIn('text', first_segment)
        self.assertIn('start', first_segment)
        self.assertIn('end', first_segment)

    def test_invalid_youtube_url(self):
        # Test handling of invalid YouTube URL
        with self.assertRaises(Exception):
            download_audio('https://youtube.com/invalid_video_id')

if __name__ == '__main__':
    unittest.main()