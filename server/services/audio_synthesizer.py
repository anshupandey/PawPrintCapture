"""
Multi-provider text-to-speech synthesis
Supports OpenAI TTS, Google Cloud TTS, and ElevenLabs
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
import requests
import tempfile

class AudioSynthesizer:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider = config['tts_provider']
        
        if self.provider == 'openai':
            from openai import OpenAI
            self.openai_client = OpenAI(api_key=config['openai_api_key'])
        elif self.provider == 'google':
            self.setup_google_tts(config.get('google_tts_api_key'))
        elif self.provider == 'elevenlabs':
            self.elevenlabs_api_key = config.get('elevenlabs_api_key')
            if not self.elevenlabs_api_key:
                raise ValueError("ElevenLabs API key is required")
    
    def setup_google_tts(self, api_key: Optional[str]):
        """Setup Google Cloud TTS client"""
        if not api_key:
            raise ValueError("Google Cloud TTS API key is required")
        
        try:
            from google.cloud import texttospeech
            # Set up authentication
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = api_key
            self.google_client = texttospeech.TextToSpeechClient()
        except ImportError:
            raise Exception("Google Cloud TTS library not installed. Install with: pip install google-cloud-texttospeech")
    
    def synthesize_text(self, text: str, filename: str, output_dir: Path) -> str:
        """Synthesize text to audio using the configured provider"""
        
        output_path = output_dir / filename
        
        if self.provider == 'openai':
            return self._synthesize_openai(text, output_path)
        elif self.provider == 'google':
            return self._synthesize_google(text, output_path)
        elif self.provider == 'elevenlabs':
            return self._synthesize_elevenlabs(text, output_path)
        else:
            raise ValueError(f"Unsupported TTS provider: {self.provider}")
    
    def _synthesize_openai(self, text: str, output_path: Path) -> str:
        """Synthesize using OpenAI TTS"""
        try:
            response = self.openai_client.audio.speech.create(
                model="tts-1-hd",  # High quality model
                voice="alloy",     # Professional, clear voice
                input=text,
                response_format="mp3"
            )
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            return str(output_path)
            
        except Exception as e:
            raise Exception(f"OpenAI TTS synthesis failed: {str(e)}")
    
    def _synthesize_google(self, text: str, output_path: Path) -> str:
        """Synthesize using Google Cloud TTS"""
        try:
            from google.cloud import texttospeech
            
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Use a natural, professional voice
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-J",  # Professional female voice
                ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
            )
            
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.9,  # Slightly slower for educational content
                pitch=0.0
            )
            
            response = self.google_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            with open(output_path, 'wb') as f:
                f.write(response.audio_content)
            
            return str(output_path)
            
        except Exception as e:
            raise Exception(f"Google TTS synthesis failed: {str(e)}")
    
    def _synthesize_elevenlabs(self, text: str, output_path: Path) -> str:
        """Synthesize using ElevenLabs"""
        try:
            voice_settings = self.config.get('voice_settings', {})
            
            # Use Rachel voice (professional, clear)
            voice_id = voice_settings.get('voice_id', '21m00Tcm4TlvDq8ikWAM')
            
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_api_key
            }
            
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": voice_settings.get('stability', 0.75),
                    "similarity_boost": voice_settings.get('similarity_boost', 0.75),
                    "style": 0.2,  # Slightly expressive for educational content
                    "use_speaker_boost": True
                }
            }
            
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"ElevenLabs API error: {response.status_code} - {response.text}")
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            return str(output_path)
            
        except Exception as e:
            raise Exception(f"ElevenLabs TTS synthesis failed: {str(e)}")
    
    def normalize_audio_levels(self, audio_files: list) -> None:
        """Normalize volume levels across all audio files"""
        try:
            from pydub import AudioSegment
            
            # Calculate target RMS level (average across all files)
            rms_levels = []
            audio_segments = []
            
            for audio_file in audio_files:
                audio = AudioSegment.from_mp3(audio_file['audio_file'])
                audio_segments.append(audio)
                rms_levels.append(audio.rms)
            
            if not rms_levels:
                return
            
            target_rms = sum(rms_levels) / len(rms_levels)
            
            # Normalize each file to the target RMS
            for i, (audio_file, audio_segment) in enumerate(zip(audio_files, audio_segments)):
                if audio_segment.rms > 0:  # Avoid division by zero
                    import math
                    change_in_rms = target_rms / audio_segment.rms
                    normalized_audio = audio_segment.apply_gain(20 * math.log10(change_in_rms))
                    normalized_audio.export(audio_file['audio_file'], format="mp3")
                    
        except ImportError:
            print("Warning: pydub not available for audio normalization. Install with: pip install pydub")
        except Exception as e:
            print(f"Warning: Audio normalization failed: {e}")
