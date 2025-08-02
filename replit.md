# PhysioGPT Platform - Compressed

## Overview

PhysioGPT is an advanced AI-powered physiotherapy platform designed to provide comprehensive clinical decision support for practitioners and students. It integrates modern web technologies with specialized AI models to offer tools for SOAP note generation, virtual patient analysis, evidence-based exercise prescription, and extensive research integration. The platform aims to revolutionize physiotherapy practice by enhancing efficiency, accuracy, and educational capabilities, ultimately improving patient outcomes and practitioner workflow.

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
- **AI Integration**: Leverages OpenAI GPT-4o for clinical analysis, content generation, and specialized models for virtual patient analysis based on expert physiotherapy methodologies (Jo Gibson, Alison Grimaldi, Leanne Bisset, Clinical Edge, Physio Network, Sports Map). Includes AI-powered research gap analysis and exercise generation.
- **Clinical Documentation**: AI-enhanced SOAP note generation, OpenAI Whisper for audio transcription, automated PII de-identification, and version control for notes. Features an AI Automatic Paperwork System for generating various clinical documents.
- **Motion Capture & Virtual Patient System**: WebRTC camera integration for real-time pose detection via MediaPipe, skeleton overlay visualization, AI-powered virtual patient generation from movement data, and detailed movement analysis (quality scoring, pattern recognition). Includes AI-generated clinical scenarios and interactive analysis with expert framework integration. Features a medical-grade 3D skeleton system with dynamic anatomical accuracy and limb scaling.
- **Exercise Prescription**: Comprehensive, body part-specific, difficulty-scaled, and evidence-based exercise database. Supports specialized programs and AI-powered exercise recommendations.
- **Research Integration**: AI-analyzed research database with bias assessment and clinical application insights.
- **Game-Based Competition System**: Features 9 innovative competition formats (e.g., Lightning Diagnosis, Treatment Speed Run, Progressive Diagnostic Challenge) with AI-powered scoring, real-time leaderboards, automated scheduling, and educational feedback. Includes a comprehensive tournament system with real-time 1v1 elimination brackets.
- **Intelligent Assessment System**: AI-powered symptom analysis, multi-plane postural assessment with real-time alignment feedback, and movement prediction using NLP and advanced pose detection models (BlazePose, MoveNet, PoseNet ensemble). Integrates standardized outcome measures.
- **UI/UX Decisions**: Shadcn/ui and Tailwind CSS for a modern, professional aesthetic. Emphasis on clear visual hierarchy, intuitive navigation (e.g., 3-column layout for virtual patient page), and color-coded indicators for clinical feedback. Responsive design across devices.
- **Security**: Encrypted session secrets, robust CORS configuration, Zod schema validation for API endpoints, and secure file upload handling.
- **Deployment**: Utilizes Replit autoscale deployment with Vite for frontend and ESBuild for backend bundling on Node.js 20.

## External Dependencies

- **AI Services**: OpenAI API (GPT-4o, Whisper), Leonardo AI (for 3D skeleton animation video generation), Runway ML (alternative text-to-video).
- **Cloud Storage**: AWS S3.
- **Payment Processing**: PayPal SDK, Stripe.
- **Database Services**: Neon PostgreSQL.
- **Email Service**: SendGrid (for notifications).