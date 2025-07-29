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
        """Generate educational transcript for a single slide"""
        
        # Combine all text content
        all_text = []
        if slide_data['text_content']:
            all_text.extend(slide_data['text_content'])
        if slide_data['image_text']:
            all_text.extend(slide_data['image_text'])
        if slide_data['notes']:
            all_text.append(f"Notes: {slide_data['notes']}")
        
        combined_text = "\n".join(all_text)
        
        prompt = f"""
You are an expert instructional designer creating narration for an educational presentation. 
Your task is to write a clear, engaging, conversational transcript for slide {slide_data['slide_number']}.

SLIDE CONTENT:
{combined_text}

INSTRUCTIONS:
1. Write in a conversational tone using "we" or "you" to engage the learner
2. Start with a brief overview of what this slide covers
3. Break complex information into digestible pieces
4. Include examples or scenarios when appropriate
5. Use clear signposting language (e.g., "First, let's explore...", "Next, we'll examine...")
6. End with a brief summary or transition to maintain flow
7. Match the pace to allow learners time to absorb visual information
8. Make it sound natural when spoken aloud
9. Keep the narration informative but not overly dense
10. Maintain an encouraging, professional tone

The transcript should be approximately 30-60 seconds when spoken (roughly 75-150 words).

Respond with only the transcript text, no additional formatting or metadata.
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
