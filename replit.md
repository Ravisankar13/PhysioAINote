# PhysioGPT Platform - Compressed

## Overview

PhysioGPT is an advanced AI-powered physiotherapy platform providing comprehensive clinical decision support for practitioners and students. It integrates modern web technologies with specialized AI models to offer tools for SOAP note generation, virtual patient analysis, evidence-based exercise prescription, and extensive research integration. The platform aims to revolutionize physiotherapy practice by enhancing efficiency, accuracy, and educational capabilities, ultimately improving patient outcomes and practitioner workflow. The business vision is to become the leading AI solution for physiotherapy, offering significant market potential by improving diagnostic precision and treatment efficacy.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Feb 15, 2026)
- **Interactive Skeleton-to-Text System**: Skeleton viewer now reacts to clinical conversation content:
  - Clinical text parser (client/src/lib/clinicalTextParser.ts) detects body regions, pain types, pathologies, and severity from messages
  - PureThreeGLBViewer highlightRegions prop applies colored emissive glow to affected mesh groups
  - Color coding: red=pain, amber=dysfunction, blue=referral, purple=weakness, yellow=stiffness
  - Auto-opens skeleton panel and zooms to primary affected region when clinical content is detected
  - Legend overlay on skeleton shows detected regions with color-coded type indicators
  - 300ms debounce on parsing to prevent UI jank during streaming
- **Voice Recording Bug Fixes**: Fixed stale isStreaming closure preventing final report generation, SpeechRecognition restart index, welcome screen streaming visibility
- **PhysioGPT Page Redesign**: Complete rewrite as ChatGPT-style clinical assistant:
  - ChatGPT-style layout: collapsible sidebar (conversation history), collapsible skeleton viewer panel (40% height), chat interface
  - Integrated PureThreeGLBViewer skeleton with zoomToRegion for body region focus, compact joint controls overlay
  - Voice recording: MediaRecorder → Whisper transcription → AI clinical analysis with structured thought process (differential diagnosis, treatment approach, evidence)
  - Streaming SSE responses with ClinicalResponseDisplay for structured clinical formatting
  - Quick actions toolbar: Assessment, Differentials, Manual Therapy, Exercise Rx, Patient Education, Red Flags
  - 9 body regions with special tests, red flags, and contextual suggestions
  - Conversation CRUD with sidebar, PDF download, evidence grades
- **Key Files**: client/src/pages/PhysioGPT.tsx, client/src/lib/clinicalTextParser.ts

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript)
- **UI Components**: Shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 20 (Express.js)
- **Language**: TypeScript (ES modules)
- **Authentication**: Passport.js (local strategy, session management)
- **API Design**: RESTful

### Database
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Migrations**: Drizzle Kit

### Deployment Considerations
- **Camera Access Requirements**: Movement Analysis page requires HTTPS for camera access.
- **Deployment**: Replit autoscale deployment with Vite for frontend and ESBuild for backend bundling on Node.js 20.

### Key Features & Design Patterns
- **AI Integration**: Leverages OpenAI GPT-4o for clinical analysis, content generation, specialized models for virtual patient analysis, research gap analysis, exercise generation, real-time movement analysis from webcam, and privacy-preserving SOAP-to-Virtual-Patient conversion.
- **Biomechanical Systems**:
    - **Bidirectional Muscle-Joint System**: Anatomically accurate system mapping 18 muscles to joints with force resolution, agonist/antagonist pairs, and joint coupling rules. Includes visual indicators and a toggle for effects.
    - **3D Force Visualization System**: Real-time biomechanical overlays on GLB skeleton using THREE.js, showing force vector arrows, joint stress indicators, and muscle activation glow with interactive hover labels.
    - **Biomechanical Clinical Assessment System**: Patient digital twin system with biomechanics calculation engine, injury risk scoring, and AI clinical assessment for treatment strategy generation.
- **Multi-View Skeleton Visualization**: Simultaneous display of skeleton from multiple angles with 4 fixed camera presets, synchronized viewers, and view toggle controls.
- **Expanded MuscleOverride System**: Includes length override, inhibition, and 7 pathology types with per-pathology tension/activation modifiers.
- **Motion Capture & Virtual Patient System**: WebRTC camera integration for real-time pose detection, skeleton overlay, AI-powered virtual patient generation from movement data, and detailed movement analysis. Includes a medical-grade 3D skeleton system with dynamic anatomical accuracy.
- **Virtual Patient Management System with Mixamo Integration**: Comprehensive CRUD interface for managing patient 3D models with persistent configurations, supporting both procedural skeleton generation and Mixamo rigged models. Features customizable pathologies, advanced slider controls, animation playback, and privacy-preserving integration with SOAP notes.
- **Enhanced Body Scanner X-Ray Alternative**: Medical-grade anatomical visualization with enhanced rib cage, detailed hip/pelvis, comprehensive knee joint, and enhanced elbow complex, including clinical measurements and alignment assessments.
- **Comprehensive Running Gait Analysis**: Professional-grade biomechanical analysis with 25+ real-time metrics including cadence, stride length, ground contact time, foot strike pattern, vertical oscillation, joint angles, body position metrics, symmetry analysis, and efficiency indicators.
- **Clinical Documentation**: AI-enhanced SOAP note generation, OpenAI Whisper for audio transcription, automated PII de-identification, version control, and an AI Automatic Paperwork System. Includes a temporary SOAP Notes system with auto-expiry and auto-save.
- **PhysioGPT Clinical Enhancements**: Transformed PhysioGPT page into a comprehensive clinical decision support system with clinical context panel, integrated clinical tools (outcome measures, prediction rules), clinical quick actions, professional mode for technical documentation, enhanced system prompts, and structured clinical response display.
- **Exercise Prescription**: Comprehensive, body part-specific, difficulty-scaled, and evidence-based exercise database with AI-powered recommendations.
- **Research Integration**: AI-analyzed research database with bias assessment and clinical application insights.
- **UI/UX Decisions**: Shadcn/ui and Tailwind CSS for a modern, professional aesthetic with clear visual hierarchy, intuitive navigation, color-coded clinical feedback, and responsive design.
- **Security**: Encrypted session secrets, robust CORS configuration, Zod schema validation, and secure file upload handling.

## External Dependencies

- **AI Services**: OpenAI API (GPT-4o, Whisper), Leonardo AI, Runway ML.
- **Cloud Storage**: AWS S3.
- **Payment Processing**: PayPal SDK, Stripe.
- **Database Services**: Neon PostgreSQL.
- **Email Service**: SendGrid.