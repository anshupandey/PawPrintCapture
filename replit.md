# PowerPoint to Learning Module Converter

## Overview

This is a full-stack web application that transforms PowerPoint presentations into high-quality self-learning modules. The application extracts content from uploaded PPTX files and uses AI to generate educational narration, which is then synthesized into audio and embedded back into the presentation. The system also creates video and PDF outputs for comprehensive learning experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript running on Vite
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: TailwindCSS with CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Node.js Server**: Express.js with TypeScript
- **Python Processing**: FastAPI-based microservices for PowerPoint processing
- **File Handling**: Multer for multipart file uploads with validation
- **API Layer**: RESTful endpoints with proper error handling and logging

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM (configured but using in-memory storage currently)
- **File Storage**: Temporary local storage with automatic cleanup
- **Session Management**: In-memory storage for processing jobs

## Key Components

### File Upload System
- Drag-and-drop interface with file validation
- Supports only .pptx files up to 50MB
- Real-time file size and type validation
- Visual feedback for upload status

### API Configuration
- Multi-provider text-to-speech support (OpenAI, Google Cloud TTS, ElevenLabs)
- Secure API key handling with input masking
- Provider-specific configuration options
- Voice customization settings

### Processing Pipeline
- **Content Extraction**: Uses python-pptx to extract text and images
- **AI Transcript Generation**: OpenAI GPT-4o for educational narration
- **Audio Synthesis**: Multi-provider TTS with quality optimization
- **Media Integration**: Embeds audio into PowerPoint slides
- **Format Conversion**: PDF and MP4 video generation

### Progress Tracking
- Real-time job status updates
- Step-by-step progress visualization
- Error handling with user-friendly messages
- Polling-based status updates

## Data Flow

1. **Upload Phase**
   - User uploads PPTX file with API credentials
   - Server validates file format and size
   - Creates processing job with unique ID

2. **Processing Phase**
   - Python service extracts slide content
   - AI generates educational transcripts
   - TTS synthesizes audio files
   - Media files are embedded and converted

3. **Output Phase**
   - Generates narrated PowerPoint
   - Creates synchronized MP4 video
   - Produces PDF reference version
   - Provides download links for all outputs

4. **Status Updates**
   - Client polls server for job progress
   - Real-time updates on processing stages
   - Error reporting and recovery options

## External Dependencies

### AI and Speech Services
- **OpenAI API**: GPT-4o for transcript generation and TTS
- **Google Cloud TTS**: Alternative speech synthesis
- **ElevenLabs**: High-quality voice synthesis option

### Processing Libraries
- **python-pptx**: PowerPoint file manipulation
- **LibreOffice**: Document conversion to PDF
- **FFmpeg**: Video processing and rendering
- **PyTesseract**: OCR for image text extraction

### Development Tools
- **Replit Integration**: Development environment support
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the application

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Express server with automatic restart
- Python services run as child processes
- File uploads stored in temporary directories

### Production Considerations
- Static file serving through Express
- Process management for Python services
- Database persistence with PostgreSQL
- File cleanup and storage optimization
- Environment variable configuration for API keys

### File Management
- Temporary working directories per job
- Automatic cleanup after processing completion
- Size limits and format validation
- Progress tracking through status files

The application is designed as a monorepo with clear separation between frontend (React), backend (Express), and processing services (Python), allowing for scalable development and deployment.