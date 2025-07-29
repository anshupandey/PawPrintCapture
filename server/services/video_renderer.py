"""
Video rendering service for creating synchronized MP4 videos
Combines slide images with audio narration
"""

import os
import subprocess
from pathlib import Path
from typing import List, Dict, Any
import json
import tempfile

class VideoRenderer:
    def __init__(self):
        self.temp_dir = None
    
    def create_video(self, pptx_path: str, audio_files: List[Dict[str, Any]], work_dir: Path) -> str:
        """Create synchronized MP4 video from actual PowerPoint slides and audio"""
        
        try:
            # Convert slides to high-quality images using the actual PowerPoint content
            slide_images = self._convert_slides_to_images(pptx_path, work_dir)
            
            if not slide_images:
                raise Exception("No slide images were generated")
            
            # Create video segments for each slide with audio
            video_segments = []
            for audio_data in audio_files:
                slide_num = audio_data['slide_number']
                audio_file = audio_data['audio_file']
                image_file = slide_images.get(slide_num)
                
                if image_file and os.path.exists(image_file) and os.path.exists(audio_file):
                    segment = self._create_video_segment(image_file, audio_file, work_dir, slide_num)
                    if segment and os.path.exists(segment):
                        video_segments.append(segment)
                else:
                    print(f"Warning: Missing files for slide {slide_num} - Image: {image_file}, Audio: {audio_file}")
            
            if not video_segments:
                raise Exception("No video segments were created successfully")
            
            # Concatenate all segments into final video
            final_video = self._concatenate_segments(video_segments, work_dir)
            
            return final_video
            
        except Exception as e:
            raise Exception(f"Video rendering failed: {str(e)}")
    
    def _convert_slides_to_images(self, pptx_path: str, work_dir: Path) -> Dict[int, str]:
        """Convert PowerPoint slides to high-resolution images using LibreOffice and pdftoppm"""
        
        images_dir = work_dir / "slide_images"
        images_dir.mkdir(exist_ok=True)
        
        # Use LibreOffice as the primary method for better fidelity
        return self._convert_slides_with_libreoffice(pptx_path, images_dir)
    
    def _render_shape_to_image(self, shape, draw, offset_x, offset_y, scale):
        """Render a PowerPoint shape to PIL image"""
        try:
            from pptx.shapes.base import BaseShape
            from pptx.enum.shapes import MSO_SHAPE_TYPE
            from PIL import ImageFont
            
            # Get shape position and size
            left = int((shape.left * scale) + offset_x) if hasattr(shape, 'left') else 0
            top = int((shape.top * scale) + offset_y) if hasattr(shape, 'top') else 0
            width = int(shape.width * scale) if hasattr(shape, 'width') else 100
            height = int(shape.height * scale) if hasattr(shape, 'height') else 100
            
            # Handle text shapes
            if hasattr(shape, 'text_frame') and shape.text_frame:
                text = shape.text_frame.text
                if text.strip():
                    try:
                        font = ImageFont.load_default()
                        draw.text((left, top), text, fill='black', font=font)
                    except:
                        draw.text((left, top), text, fill='black')
            
            # Handle other shape types (simplified)
            elif hasattr(shape, 'shape_type'):
                # Draw a placeholder rectangle for other shapes
                if width > 0 and height > 0:
                    draw.rectangle([left, top, left + width, top + height], outline='gray')
        
        except Exception as e:
            # Skip problematic shapes
            pass
    
    def _convert_slides_with_libreoffice(self, pptx_path: str, images_dir: Path) -> Dict[int, str]:
        """Primary method using LibreOffice to convert slides to high-quality images"""
        
        try:
            print(f"Converting PPTX to PDF: {pptx_path}")
            
            # First, convert PPTX to PDF using LibreOffice
            cmd = [
                "libreoffice",
                "--headless",
                "--convert-to", "pdf",
                "--outdir", str(images_dir),
                pptx_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            if result.returncode != 0:
                raise Exception(f"LibreOffice PDF conversion failed: {result.stderr}")
            
            # Find the generated PDF
            pdf_files = list(images_dir.glob("*.pdf"))
            if pdf_files:
                pdf_path = pdf_files[0]
                print(f"PDF created: {pdf_path}")
            else:
                raise Exception("PDF not created by LibreOffice")
            
            # Convert PDF pages to high-quality PNG images using pdftoppm
            slide_images = {}
            print(f"Converting PDF to images using pdftoppm...")
            
            try:
                # Use pdftoppm for high-quality conversion
                cmd = [
                    "pdftoppm",
                    "-png",
                    "-r", "200",  # Higher DPI for better quality
                    "-cropbox",   # Use crop box for better framing
                    str(pdf_path),
                    str(images_dir / "slide")
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                
                if result.returncode == 0:
                    print(f"pdftoppm conversion successful")
                    # Map generated images to slide numbers
                    for image_file in sorted(images_dir.glob("slide-*.png")):
                        try:
                            # pdftoppm creates files like "slide-1.png", "slide-2.png"
                            slide_num = int(image_file.stem.split('-')[-1])
                            slide_images[slide_num] = str(image_file)
                            print(f"Mapped slide {slide_num}: {image_file}")
                        except (ValueError, IndexError):
                            continue
                else:
                    print(f"pdftoppm failed: {result.stderr}")
                    
            except FileNotFoundError:
                print("pdftoppm not found, trying ImageMagick...")
                # Try ImageMagick as fallback
                try:
                    cmd = [
                        "convert",
                        "-density", "200",
                        "-quality", "95",
                        str(pdf_path),
                        str(images_dir / "slide_%03d.png")
                    ]
                    
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                    
                    if result.returncode == 0:
                        print("ImageMagick conversion successful")
                        for image_file in sorted(images_dir.glob("slide_*.png")):
                            try:
                                # ImageMagick creates files like "slide_000.png", "slide_001.png"
                                slide_num = int(image_file.stem.split('_')[-1]) + 1  # Convert 0-based to 1-based
                                slide_images[slide_num] = str(image_file)
                                print(f"Mapped slide {slide_num}: {image_file}")
                            except (ValueError, IndexError):
                                continue
                    else:
                        print(f"ImageMagick failed: {result.stderr}")
                
                except FileNotFoundError:
                    raise Exception("Neither pdftoppm nor ImageMagick found for PDF to image conversion")
            
            # Clean up PDF
            if pdf_path.exists():
                pdf_path.unlink()
            
            if not slide_images:
                raise Exception("No slide images were generated")
            
            print(f"Successfully converted {len(slide_images)} slides to images")
            return slide_images
            
        except subprocess.TimeoutExpired:
            raise Exception("LibreOffice conversion timed out")
        except FileNotFoundError:
            raise Exception("LibreOffice not found. Please install LibreOffice.")
        except Exception as e:
            raise Exception(f"Failed to convert slides to images with LibreOffice: {str(e)}")
    
    def _create_video_segment(self, image_file: str, audio_file: str, work_dir: Path, slide_num: int) -> str:
        """Create a video segment from an image and audio file"""
        
        output_file = work_dir / f"segment_{slide_num:03d}.mp4"
        
        try:
            # Get audio duration
            audio_duration = self._get_audio_duration(audio_file)
            
            # Create video segment using FFmpeg
            cmd = [
                "ffmpeg",
                "-y",  # Overwrite output files
                "-loop", "1",  # Loop the image
                "-i", image_file,  # Input image
                "-i", audio_file,  # Input audio
                "-c:v", "libx264",  # Video codec
                "-tune", "stillimage",  # Optimize for still images
                "-c:a", "aac",  # Audio codec
                "-b:a", "192k",  # Audio bitrate
                "-pix_fmt", "yuv420p",  # Pixel format for compatibility
                "-shortest",  # Stop when shortest input ends
                "-t", str(audio_duration),  # Duration
                "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black",  # Scale and pad to 1080p
                str(output_file)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                raise Exception(f"FFmpeg failed for slide {slide_num}: {result.stderr}")
            
            return str(output_file)
            
        except subprocess.TimeoutExpired:
            raise Exception(f"Video segment creation timed out for slide {slide_num}")
        except FileNotFoundError:
            raise Exception("FFmpeg not found. Please install FFmpeg.")
        except Exception as e:
            raise Exception(f"Failed to create video segment for slide {slide_num}: {str(e)}")
    
    def _get_audio_duration(self, audio_file: str) -> float:
        """Get the duration of an audio file in seconds"""
        
        try:
            cmd = [
                "ffprobe",
                "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                audio_file
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                raise Exception(f"FFprobe failed: {result.stderr}")
            
            return float(result.stdout.strip())
            
        except subprocess.TimeoutExpired:
            raise Exception("Audio duration detection timed out")
        except (ValueError, FileNotFoundError) as e:
            raise Exception(f"Failed to get audio duration: {str(e)}")
    
    def _concatenate_segments(self, video_segments: List[str], work_dir: Path) -> str:
        """Concatenate video segments into final MP4"""
        
        if not video_segments:
            raise Exception("No video segments to concatenate")
        
        concat_file = work_dir / "concat_list.txt"
        output_file = work_dir / "final_video.mp4"
        
        try:
            # Create concatenation file list
            with open(concat_file, 'w') as f:
                for segment in video_segments:
                    f.write(f"file '{segment}'\n")
            
            # Concatenate using FFmpeg
            cmd = [
                "ffmpeg",
                "-y",  # Overwrite output files
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",  # Copy streams without re-encoding
                str(output_file)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                raise Exception(f"Video concatenation failed: {result.stderr}")
            
            return str(output_file)
            
        except subprocess.TimeoutExpired:
            raise Exception("Video concatenation timed out")
        except FileNotFoundError:
            raise Exception("FFmpeg not found. Please install FFmpeg.")
        except Exception as e:
            raise Exception(f"Failed to concatenate video segments: {str(e)}")
    
    def add_intro_outro(self, video_file: str, intro_text: str = "", outro_text: str = "") -> str:
        """Add intro and outro slides to the video"""
        
        if not intro_text and not outro_text:
            return video_file
        
        try:
            # This would create intro/outro slides and add them to the video
            # Implementation would depend on specific requirements
            # For now, return the original video
            return video_file
            
        except Exception as e:
            print(f"Warning: Failed to add intro/outro: {e}")
            return video_file
