# PhysioGPT Platform

## Overview

PhysioGPT is an advanced AI-powered physiotherapy platform designed to provide comprehensive clinical decision support for practitioners and students. It integrates modern web technologies with specialized AI models to offer tools for SOAP note generation, virtual patient analysis, evidence-based exercise prescription, and extensive research integration. The platform aims to revolutionize physiotherapy practice by enhancing efficiency, accuracy, and educational capabilities, ultimately improving patient outcomes and practitioner workflow. The business vision is to become the leading AI solution for physiotherapy, offering significant market potential by improving diagnostic precision and treatment efficacy.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Key Features & Design Patterns
- **AI Integration**: Leverages OpenAI GPT-4o for clinical analysis, content generation, virtual patient analysis, research gap analysis, exercise generation, real-time movement analysis, and privacy-preserving SOAP-to-Virtual-Patient conversion.
- **Biomechanical Systems**: Includes a bidirectional muscle-joint system, 3D force visualization, and a biomechanical clinical assessment system for patient digital twins and injury risk scoring.
- **Multi-View Skeleton Visualization**: Simultaneous display of the skeleton from multiple angles with fixed camera presets and synchronized viewers.
- **Expanded MuscleOverride System**: Allows for length override, inhibition, and pathology-specific modifiers.
- **Motion Capture & Virtual Patient System**: WebRTC camera integration for real-time pose detection, skeleton overlay, AI-powered virtual patient generation, and detailed movement analysis using a medical-grade 3D skeleton system.
- **Focused Clinical Camera System**: Region-specific camera mode (13 body regions: ankles, knees, hips, shoulders, elbows, cervical, lumbar, full legs) with GPT-4o Vision AI analysis for detecting swelling, alignment issues, skin changes, and deformity. Features front/rear camera switching for phone use, auto-analysis mode, real-time joint angle computation, and automatic mapping of findings to 3D skeleton markers with clinical reasoning integration.
- **Virtual Patient Management System with Mixamo Integration**: CRUD interface for managing patient 3D models with procedural generation or Mixamo integration, customizable pathologies, advanced controls, and animation playback.
- **Enhanced Body Scanner X-Ray Alternative**: Medical-grade anatomical visualization with detailed structures like the rib cage, hip/pelvis, knee, and elbow, including clinical measurements and alignment assessments.
- **Comprehensive Running Gait Analysis**: Professional-grade biomechanical analysis with 25+ real-time metrics for gait, joint angles, and efficiency.
- **Clinical Documentation**: AI-enhanced SOAP note generation, OpenAI Whisper for audio transcription, automated PII de-identification, version control, and an AI Automatic Paperwork System.
- **PhysioGPT Clinical Enhancements**: Transforms the PhysioGPT page into a comprehensive clinical decision support system with a clinical context panel, integrated tools, quick actions, professional mode, enhanced system prompts, and structured clinical response display.
- **Exercise Prescription**: Comprehensive, body part-specific, difficulty-scaled, and evidence-based exercise database with AI-powered recommendations.
- **Research Integration**: AI-analyzed research database with bias assessment and clinical application insights.
- **UI/UX Decisions**: Utilizes Shadcn/ui and Tailwind CSS for a modern, professional aesthetic with clear visual hierarchy, intuitive navigation, color-coded clinical feedback, and responsive design.
- **Security**: Encrypted session secrets, robust CORS configuration, Zod schema validation, and secure file upload handling.
- **Clinical Bubble on Pain Markers**: An AI-powered floating clinical info panel that appears when a pain marker is placed, offering differential diagnoses, questions, assessments, treatments, and exercises. It includes interactive follow-up questions, a severity selector, red flag alerts, and a "Deep Dive with AI" feature.
- **Kinetic Chain Connection System**: Analyzes connected regions for pain markers using a kinetic chain map, highlighting connected skeleton regions and allowing placement of secondary pain markers on connected areas. Includes a "Test the Chain" mode for pose analysis.
- **Zoom Tool with Anatomical Landmark System**: Allows deep zoom into specific anatomical structures with identification of over 147 anatomical virtual points. Clicking a landmark places a pain marker and opens the clinical bubble with structure-specific differential diagnoses.
- **Comprehensive Shoulder Assessment System**: A deep clinical shoulder assessment system with AI-powered differential diagnosis, including 21 special tests, muscle tests, ROM norms, differential diagnoses, and kinetic chain contributors. Features a guided assessment wizard, capsular pattern detection, and differential diagnosis scoring.
- **Interactive Skeleton-to-Text System**: The skeleton viewer reacts to clinical conversation content by highlighting body regions, pain types, pathologies, and severity with color-coded emissive glows.
- **Direct Bone Manipulation (Pose Mode)**: Enables click-and-drag skeleton posing without sliders, allowing manipulation of joints with real-time feedback and a reset function.
- **Extended Pain Marker Types**: Supports five types of pain markers: Point, Area, Referred, Line, and Paint (free-draw), for comprehensive pain and symptom documentation.
- **15 Symptom Types System**: Beyond pain, supports Numbness, Pins & Needles, Stiffness, Tightness, Weakness, Instability, Clicking/Crepitus, Locking, Swelling, Burning, Heaviness, Spasm/Cramping, Radiating, and Catching - each with unique colors and icons for visual distinction on the 3D skeleton.
- **Free-Draw Paint Mode**: Click and drag to paint irregular symptom patterns directly on the 3D skeleton surface, capturing real-world symptom distributions that don't conform to point/area shapes.
- **Postural-Pain Correlation System**: Auto-triggers when posture sliders change (≥3° deviation), computes force/muscle impacts, and sends to AI for biomechanical analysis showing causal chains from posture deviation to force impact to muscle effect to pain link.
- **Real-Time Postural Force Analysis**: Calculates joint loading as a percentage of body weight based on skeleton pose, providing real-time updates and color-coded status for 12 joints.

## External Dependencies

- **AI Services**: OpenAI API (GPT-4o, Whisper), Leonardo AI, Runway ML.
- **Cloud Storage**: AWS S3.
- **Payment Processing**: PayPal SDK, Stripe.
- **Database Services**: Neon PostgreSQL.
- **Email Service**: SendGrid.