#!/usr/bin/env python3
"""
Main PowerPoint processing orchestrator
Coordinates all the processing steps for converting PPTX to learning modules
"""

import sys
import json
import os
import time
import traceback
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List
import requests

# Import from utils directory
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from transcript_generator import TranscriptGenerator
from audio_synthesizer import AudioSynthesizer
from video_renderer import VideoRenderer
from utils.file_manager import FileManager

class PowerPointProcessor:
    def __init__(self, file_path: str, job_id: str, config: Dict[str, Any]):
        self.file_path = file_path
        self.job_id = job_id
        self.config = config
        self.work_dir = Path(tempfile.mkdtemp(prefix=f"ppt_job_{job_id}_"))
        self.file_manager = FileManager(self.work_dir)
        
        # Initialize services
        self.transcript_generator = TranscriptGenerator(config['openai_api_key'])
        self.audio_synthesizer = AudioSynthesizer(config)
        self.video_renderer = VideoRenderer()
        
        self.slides_data = []
        self.transcripts = []
        self.audio_files = []
        
    def update_job_status(self, status: str, progress: int, error_message: str = ""):
        """Update job status via API call"""
        try:
            update_data = {
                'status': status,
                'progress': progress
            }
            if error_message:
                update_data['error_message'] = error_message
                
            # In a real implementation, this would make an HTTP request to update the job
            # For now, we'll write to a status file that the server can monitor
            status_file = self.work_dir / f"job_{self.job_id}_status.json"
            with open(status_file, 'w') as f:
                json.dump(update_data, f)
                
        except Exception as e:
            print(f"Failed to update job status: {e}")

    def extract_content(self):
        """Extract text and images from PowerPoint slides"""
        try:
            self.update_job_status('extracting', 10)
            
            # Extract slides using python-pptx
            from pptx import Presentation
            import pytesseract
            from PIL import Image
            import io
            
            prs = Presentation(self.file_path)
            
            for slide_idx, slide in enumerate(prs.slides):
                slide_data = {
                    'slide_number': slide_idx + 1,
                    'text_content': [],
                    'image_text': [],
                    'notes': ''
                }
                
                # Extract text from shapes
                for shape in slide.shapes:
                    if hasattr(shape, "text") and hasattr(shape.text, 'strip') and shape.text.strip():
                        slide_data['text_content'].append(shape.text.strip())
                
                # Extract images and perform OCR
                for shape in slide.shapes:
                    if shape.shape_type == 13:  # Picture shape type
                        try:
                            if hasattr(shape, 'image') and hasattr(shape.image, 'blob'):
                                image = Image.open(io.BytesIO(shape.image.blob))
                                ocr_text = pytesseract.image_to_string(image).strip()
                                if ocr_text:
                                    slide_data['image_text'].append(ocr_text)
                        except Exception as e:
                            print(f"OCR failed for slide {slide_idx + 1}: {e}")
                
                # Extract notes
                if hasattr(slide, 'notes_slide') and slide.notes_slide and hasattr(slide.notes_slide, 'notes_text_frame') and slide.notes_slide.notes_text_frame:
                    slide_data['notes'] = slide.notes_slide.notes_text_frame.text.strip()
                
                self.slides_data.append(slide_data)
            
            # Convert to PDF for reference
            self.file_manager.convert_pptx_to_pdf(self.file_path)
            
            self.update_job_status('generating_transcript', 25)
            
        except Exception as e:
            error_msg = f"Content extraction failed: {str(e)}"
            self.update_job_status('error', 10, error_msg)
            raise Exception(error_msg)

    def generate_transcripts(self):
        """Generate educational transcripts using AI"""
        try:
            self.update_job_status('generating_transcript', 30)
            
            for i, slide_data in enumerate(self.slides_data):
                transcript = self.transcript_generator.generate_slide_transcript(slide_data)
                self.transcripts.append({
                    'slide_number': slide_data['slide_number'],
                    'transcript': transcript,
                    'duration_estimate': len(transcript.split()) * 0.6  # Rough estimate: 0.6 seconds per word
                })
                
                # Update progress
                progress = 30 + (i + 1) / len(self.slides_data) * 15
                self.update_job_status('generating_transcript', int(progress))
            
            self.update_job_status('refining_transcript', 45)
            
        except Exception as e:
            error_msg = f"Transcript generation failed: {str(e)}"
            self.update_job_status('error', 30, error_msg)
            raise Exception(error_msg)

    def refine_transcripts(self):
        """Refine transcripts for better instructional design"""
        try:
            self.update_job_status('refining_transcript', 50)
            
            for i, transcript_data in enumerate(self.transcripts):
                refined_transcript = self.transcript_generator.refine_transcript(
                    transcript_data['transcript'],
                    transcript_data['slide_number']
                )
                transcript_data['transcript'] = refined_transcript
                
                # Update progress
                progress = 50 + (i + 1) / len(self.transcripts) * 10
                self.update_job_status('refining_transcript', int(progress))
            
            self.update_job_status('synthesizing_audio', 60)
            
        except Exception as e:
            error_msg = f"Transcript refinement failed: {str(e)}"
            self.update_job_status('error', 50, error_msg)
            raise Exception(error_msg)

    def synthesize_audio(self):
        """Convert transcripts to audio files"""
        try:
            self.update_job_status('synthesizing_audio', 65)
            
            for i, transcript_data in enumerate(self.transcripts):
                audio_file = self.audio_synthesizer.synthesize_text(
                    transcript_data['transcript'],
                    f"slide_{transcript_data['slide_number']}.mp3",
                    self.work_dir
                )
                
                self.audio_files.append({
                    'slide_number': transcript_data['slide_number'],
                    'audio_file': audio_file,
                    'transcript': transcript_data['transcript']
                })
                
                # Update progress
                progress = 65 + (i + 1) / len(self.transcripts) * 15
                self.update_job_status('synthesizing_audio', int(progress))
            
            self.update_job_status('embedding_audio', 80)
            
        except Exception as e:
            error_msg = f"Audio synthesis failed: {str(e)}"
            self.update_job_status('error', 65, error_msg)
            raise Exception(error_msg)

    def embed_audio_in_pptx(self):
        """Embed audio files into PowerPoint slides"""
        try:
            self.update_job_status('embedding_audio', 85)
            
            narrated_pptx = self.file_manager.embed_audio_in_slides(
                self.file_path,
                self.audio_files
            )
            
            self.update_job_status('converting_pdf', 90)
            return narrated_pptx
            
        except Exception as e:
            error_msg = f"Audio embedding failed: {str(e)}"
            self.update_job_status('error', 85, error_msg)
            raise Exception(error_msg)

    def render_video(self, narrated_pptx_path: str):
        """Create synchronized MP4 video"""
        try:
            self.update_job_status('rendering_video', 95)
            
            video_file = self.video_renderer.create_video(
                narrated_pptx_path,
                self.audio_files,
                self.work_dir
            )
            
            return video_file
            
        except Exception as e:
            error_msg = f"Video rendering failed: {str(e)}"
            self.update_job_status('error', 95, error_msg)
            raise Exception(error_msg)

    def save_outputs(self, narrated_pptx: str, video_file: str):
        """Save all output files and update job with file paths"""
        try:
            # Create outputs directory
            outputs_dir = Path("outputs") / self.job_id
            outputs_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy files to outputs directory
            final_pptx = outputs_dir / "narrated_presentation.pptx"
            final_video = outputs_dir / "learning_module.mp4"
            final_pdf = outputs_dir / "original_presentation.pdf"
            final_transcripts = outputs_dir / "transcripts.json"
            
            shutil.copy2(narrated_pptx, final_pptx)
            shutil.copy2(video_file, final_video)
            shutil.copy2(self.work_dir / "presentation.pdf", final_pdf)
            
            # Save transcripts as JSON
            with open(final_transcripts, 'w') as f:
                json.dump(self.transcripts, f, indent=2)
            
            # Update job with output file paths
            output_files = {
                'narrated_pptx': f"/api/download/{self.job_id}/narrated_pptx",
                'video_mp4': f"/api/download/{self.job_id}/video_mp4",
                'pdf': f"/api/download/{self.job_id}/pdf",
                'transcripts_json': f"/api/download/{self.job_id}/transcripts_json"
            }
            
            # Write final status
            status_file = self.work_dir / f"job_{self.job_id}_status.json"
            with open(status_file, 'w') as f:
                json.dump({
                    'status': 'completed',
                    'progress': 100,
                    'output_files': output_files,
                    'completed_at': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ', time.gmtime())
                }, f)
            
        except Exception as e:
            error_msg = f"Failed to save outputs: {str(e)}"
            self.update_job_status('error', 98, error_msg)
            raise Exception(error_msg)

    def cleanup(self):
        """Clean up temporary files"""
        try:
            if self.work_dir.exists():
                shutil.rmtree(self.work_dir)
        except Exception as e:
            print(f"Cleanup failed: {e}")

    def process(self):
        """Main processing pipeline"""
        try:
            self.extract_content()
            self.generate_transcripts()
            self.refine_transcripts()
            self.synthesize_audio()
            narrated_pptx = self.embed_audio_in_pptx()
            video_file = self.render_video(narrated_pptx)
            self.save_outputs(narrated_pptx, video_file)
            
            self.update_job_status('completed', 100)
            
        except Exception as e:
            print(f"Processing failed: {e}")
            traceback.print_exc()
        finally:
            self.cleanup()

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 powerpoint_processor.py <file_path> <job_id> <config_json>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    job_id = sys.argv[2]
    config = json.loads(sys.argv[3])
    
    processor = PowerPointProcessor(file_path, job_id, config)
    processor.process()

if __name__ == "__main__":
    main()
