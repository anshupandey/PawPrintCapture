"""
AI-powered transcript generation for educational content
Uses OpenAI GPT-4o to create engaging, instructional narratives
"""

import json
import os
from typing import Dict, Any, List
from openai import OpenAI

class TranscriptGenerator:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        self.model = "gpt-4o"
    
    def generate_slide_transcript(self, slide_data: Dict[str, Any]) -> str:
        """Generate educational transcript for a single slide with natural conversation style and image analysis"""
        
        # Combine all text content
        all_text = []
        if slide_data['text_content']:
            all_text.extend(slide_data['text_content'])
        if slide_data['image_text']:
            all_text.extend(slide_data['image_text'])
        if slide_data['notes']:
            all_text.append(f"Notes: {slide_data['notes']}")
        
        combined_text = "\n".join(all_text)
        
        # Analyze slide content to determine appropriate length
        has_images = len(slide_data.get('image_text', [])) > 0
        text_length = len(combined_text.strip())
        is_title_slide = slide_data['slide_number'] == 1 or any(
            keyword in combined_text.lower() 
            for keyword in ['title', 'overview', 'agenda', 'outline', 'introduction']
        )
        
        # Determine target length based on content
        if is_title_slide:
            target_words = "30-50"
            target_seconds = "15-25"
        elif text_length < 100:  # Minimal text
            target_words = "40-70"
            target_seconds = "20-35"
        elif not has_images:  # Text-heavy slide
            target_words = "80-120"
            target_seconds = "40-60"
        else:  # Balanced content
            target_words = "60-100"
            target_seconds = "30-50"
        
        # Use slide image for better context if available
        if slide_data.get('slide_image_base64'):
            return self._generate_transcript_with_image(slide_data, combined_text, target_words, target_seconds, is_title_slide, has_images)
        else:
            return self._generate_transcript_text_only(slide_data, combined_text, target_words, target_seconds, is_title_slide, has_images)
    
    def _generate_transcript_with_image(self, slide_data: Dict[str, Any], combined_text: str, target_words: str, target_seconds: str, is_title_slide: bool, has_images: bool) -> str:
        """Generate transcript using both text content and slide image for better context"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert instructional designer creating natural, conversational narration for educational presentations. You can see both the slide content and the visual layout to create the perfect narration."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"""
Create natural, conversational narration for slide {slide_data['slide_number']} that sounds like a friendly teacher speaking.

SLIDE TEXT CONTENT:
{combined_text}

CONTENT ANALYSIS:
- Slide type: {'Title/Introduction slide' if is_title_slide else 'Content slide with images' if has_images else 'Text-focused slide'}
- Target length: {target_words} words ({target_seconds} seconds when spoken)

INSTRUCTIONS:
1. Write in natural, conversational tone like you're speaking to a friend
2. Use contractions (we'll, let's, you're) to sound more natural
3. Include natural speech patterns with brief pauses indicated by commas and periods
4. For title slides: Keep it brief, welcoming, and set expectations
5. For text-light slides: Don't over-explain, focus on key points
6. For image-heavy slides: Give time for visual absorption with thoughtful pacing
7. Use transitional phrases that feel natural: "Now,", "So,", "Here's the thing,", "What's interesting is..."
8. Include legitimate pauses with punctuation for natural breathing
9. End sentences with periods for natural stops, use commas for brief pauses
10. Sound enthusiastic but not overly excited - like an engaging teacher
11. Consider the visual layout you can see - reference visual elements naturally

SPEECH PATTERNS TO INCLUDE:
- Use "So," or "Now," at the beginning of sentences
- Add "you know" or "you see" occasionally for conversational flow
- Include brief thinking pauses: "Well,", "Actually,", "In fact,"
- Reference what learners can see: "As you can see here,", "Looking at this slide,", "Notice that..."

Respond with only the transcript text that will sound natural when spoken aloud.
                                """
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{slide_data['slide_image_base64']}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            return content.strip() if content else ""
            
        except Exception as e:
            print(f"Warning: Failed to generate transcript with image for slide {slide_data['slide_number']}: {str(e)}")
            # Fallback to text-only generation
            return self._generate_transcript_text_only(slide_data, combined_text, target_words, target_seconds, is_title_slide, has_images)
    
    def _generate_transcript_text_only(self, slide_data: Dict[str, Any], combined_text: str, target_words: str, target_seconds: str, is_title_slide: bool, has_images: bool) -> str:
        """Generate transcript using only text content (fallback method)"""
        
        prompt = f"""
You are an expert instructional designer creating natural, conversational narration for an educational presentation. 
Your task is to write engaging transcript for slide {slide_data['slide_number']} that sounds like a friendly teacher speaking.

SLIDE CONTENT:
{combined_text}

CONTENT ANALYSIS:
- Slide type: {'Title/Introduction slide' if is_title_slide else 'Content slide with images' if has_images else 'Text-focused slide'}
- Target length: {target_words} words ({target_seconds} seconds when spoken)

INSTRUCTIONS:
1. Write in natural, conversational tone like you're speaking to a friend
2. Use contractions (we'll, let's, you're) to sound more natural
3. Include natural speech patterns with brief pauses indicated by commas and periods
4. For title slides: Keep it brief, welcoming, and set expectations
5. For text-light slides: Don't over-explain, focus on key points
6. For image-heavy slides: Give time for visual absorption with thoughtful pacing
7. Use transitional phrases that feel natural: "Now,", "So,", "Here's the thing,", "What's interesting is..."
8. Include legitimate pauses with punctuation for natural breathing
9. End sentences with periods for natural stops, use commas for brief pauses
10. Sound enthusiastic but not overly excited - like an engaging teacher

SPEECH PATTERNS TO INCLUDE:
- Use "So," or "Now," at the beginning of sentences
- Add "you know" or "you see" occasionally for conversational flow
- Include brief thinking pauses: "Well,", "Actually,", "In fact,"

Respond with only the transcript text that will sound natural when spoken aloud.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert instructional designer creating engaging educational narration."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            return content.strip() if content else ""
            
        except Exception as e:
            raise Exception(f"Failed to generate transcript for slide {slide_data['slide_number']}: {str(e)}")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert instructional designer creating engaging educational narration."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            return content.strip() if content else ""
            
        except Exception as e:
            raise Exception(f"Failed to generate transcript for slide {slide_data['slide_number']}: {str(e)}")
    
    def refine_transcript(self, transcript: str, slide_number: int) -> str:
        """Refine and improve the generated transcript"""
        
        critique_prompt = f"""
Please review and improve this educational narration for slide {slide_number}.

CURRENT TRANSCRIPT:
{transcript}

IMPROVEMENT CRITERIA:
1. Clarity: Is the language clear and easy to understand?
2. Flow: Does it transition smoothly and maintain engagement?
3. Instructional Design: Does it follow best practices for learning?
4. Natural Speech: Will it sound natural when spoken aloud?
5. Pacing: Is the information density appropriate?
6. Engagement: Does it actively involve the learner?

Provide an improved version that addresses any issues while maintaining the original intent and key information.

Respond with only the refined transcript text.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert instructional designer focused on creating the highest quality educational narration."},
                    {"role": "user", "content": critique_prompt}
                ],
                max_tokens=350,
                temperature=0.5
            )
            
            content = response.choices[0].message.content
            return content.strip() if content else ""
            
        except Exception as e:
            print(f"Warning: Failed to refine transcript for slide {slide_number}: {str(e)}")
            return transcript  # Return original if refinement fails
    
    def generate_course_overview(self, all_slides_data: List[Dict[str, Any]]) -> str:
        """Generate an overview transcript for the entire course/module"""
        
        slides_summary = []
        for slide_data in all_slides_data:
            slide_text = " ".join(slide_data['text_content'][:2])  # First 2 text elements
            slides_summary.append(f"Slide {slide_data['slide_number']}: {slide_text[:100]}...")
        
        overview_content = "\n".join(slides_summary)
        
        prompt = f"""
Create an engaging introduction for this learning module based on the slide content below.

SLIDE OVERVIEW:
{overview_content}

Write a welcoming introduction that:
1. Greets the learner warmly
2. Provides a clear overview of what they'll learn
3. Explains the value and benefits of the content
4. Sets expectations for the learning experience
5. Encourages engagement and active learning
6. Uses an enthusiastic but professional tone

Keep it to approximately 45-90 seconds when spoken (100-200 words).

Respond with only the introduction transcript.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert instructional designer creating welcoming, engaging course introductions."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.8
            )
            
            content = response.choices[0].message.content
            return content.strip() if content else ""
            
        except Exception as e:
            raise Exception(f"Failed to generate course overview: {str(e)}")
