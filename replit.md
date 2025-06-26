# PhysioGPT Platform - Comprehensive Physiotherapy Resource

## Overview

PhysioGPT is an advanced AI-powered physiotherapy platform that provides evidence-based clinical decision support, SOAP note generation, virtual patient analysis, exercise prescription, and comprehensive research integration. The platform combines modern web technologies with specialized AI models to deliver professional-grade physiotherapy tools for practitioners and students.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks and context for local state
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session management
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **API Design**: RESTful endpoints with comprehensive error handling

### Database Architecture
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Neon serverless with WebSocket support

## Key Components

### AI Integration
- **Primary AI**: OpenAI GPT-4o for clinical analysis and SOAP note generation
- **Virtual Patient Analysis**: Specialized AI models trained on expert physiotherapy approaches (Jo Gibson, Alison Grimaldi, Leanne Bisset, Clinical Edge, Physio Network, Sports Map)
- **Research Gap Analysis**: AI-powered identification of literature gaps
- **Exercise Generation**: Automated creation of evidence-based exercise prescriptions

### Clinical Documentation
- **SOAP Notes**: AI-enhanced generation with structured clinical formatting
- **Audio Transcription**: OpenAI Whisper integration for voice-to-text conversion
- **De-identification**: Automated PII removal for case sharing
- **Version Control**: Comprehensive tracking of note modifications

### Motion Capture & Virtual Patient System
- **Camera Integration**: WebRTC camera access with permission handling and error recovery
- **MediaPipe Integration**: Real-time pose detection with skeleton overlay visualization
- **Virtual Patient Generation**: AI-powered patient creation from captured movement data with clinical analysis
- **Movement Analysis**: Quality scoring, pattern recognition, and clinical recommendations
- **Case Studies**: AI-generated clinical scenarios across all body regions
- **Expert Frameworks**: Integration of renowned physiotherapist methodologies
- **Interactive Analysis**: Real-time diagnostic and treatment recommendations
- **Data Export**: Comprehensive motion data and virtual patient profile export functionality

### Exercise Prescription
- **Body Part Specific**: Comprehensive exercise database covering 11 body regions
- **Difficulty Scaling**: Progressive exercise prescriptions from beginner to advanced
- **Evidence-Based**: All exercises backed by current research literature
- **Specialized Programs**: Pilates, manual therapy, and sport-specific protocols

### Research Integration
- **Comprehensive Database**: 20+ research papers per body part with AI analysis
- **Bias Assessment**: Systematic evaluation of research quality and limitations
- **Gap Analysis**: Automated identification of research opportunities
- **Clinical Application**: Translation of research findings to practice

## Data Flow

### Authentication Flow
1. User registration/login via Passport.js local strategy
2. Session creation with PostgreSQL storage
3. Role-based access control for premium features
4. Secure session management with encrypted cookies

### SOAP Note Generation Flow
1. Audio file upload to local storage or S3
2. OpenAI Whisper transcription processing
3. Clinical insight extraction via GPT-4o
4. Structured SOAP note generation
5. Database storage with user association

### Virtual Patient Analysis Flow
1. Patient case input with clinical parameters
2. Expert framework selection (Gibson, Grimaldi, etc.)
3. AI analysis using specialized prompts
4. Evidence-based treatment recommendations
5. Research article correlation and suggestions

### Exercise Prescription Flow
1. Body part and difficulty level selection
2. AI-powered exercise generation via GPT-4o
3. Evidence-based validation against research database
4. User customization and modification capabilities
5. Progress tracking and adaptation recommendations

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o for clinical analysis, transcription, and content generation
- **API Key Management**: Environment variable configuration

### Cloud Storage
- **AWS S3**: File storage for audio recordings, images, and documents
- **Configuration**: Region-specific deployment (us-west-2)

### Payment Processing
- **PayPal SDK**: Subscription and payment management
- **Stripe Integration**: Alternative payment processing (configured but not primary)

### Database Services
- **Neon PostgreSQL**: Serverless database with connection pooling
- **SSL Configuration**: Secure connections with certificate validation

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TSX**: TypeScript execution for development
- **ESBuild**: Production bundling and optimization

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with HMR
- **Database**: Neon development instance
- **Port Configuration**: 5000 (backend), 5005 (frontend proxy)

### Production Deployment
- **Platform**: Replit autoscale deployment
- **Build Process**: Vite production build + ESBuild server bundling
- **Environment**: Node.js 20 with PostgreSQL 16 module
- **Process Management**: PM2-style process handling

### Environment Configuration
- **Development**: NODE_ENV=development with enhanced logging
- **Production**: NODE_ENV=production with optimized performance
- **Database**: Automatic SSL mode for production connections

### Security Considerations
- **Session Management**: Encrypted session secrets with PostgreSQL storage
- **CORS**: Configured for cross-origin requests in development
- **Input Validation**: Zod schema validation for all API endpoints
- **File Upload Security**: MIME type validation and size restrictions

## Recent Updates

- **January 25, 2025**: Implemented comprehensive Smart Exercise Recommendation Engine with AI-powered exercise prescription system. System analyzes movement abnormalities, patient parameters, and diagnostic results to generate evidence-based exercise prescriptions with loading parameters, progression plans, and home exercise adaptations
- **January 25, 2025**: Integrated Smart Exercise Engine into TreatmentProtocolEngine with tabbed interface providing both standard protocols and AI-generated prescriptions. Engine generates exercises based on movement patterns with research support, modification options, and clinical reasoning scores
- **January 25, 2025**: Enhanced motion capture diagnostic workflow with complete integration from movement analysis through AI-powered exercise prescription. System now provides end-to-end clinical decision support from pose detection to personalized treatment plans
- **January 25, 2025**: Fixed 3D skeleton visualization with proper Three.js rendering, enhanced debugging, and fallback test skeleton display
- **January 25, 2025**: Added three comprehensive assessments: Mark Laslett Back and SIJ Pain Assessment, Evidence-Based Hand Injury Assessment, and Evidence-Based Foot Injury Assessment
- **January 25, 2025**: Added Running Injury Assessment Protocol with comprehensive evaluation for common running injuries and evidence-based recommendations
- **January 25, 2025**: Added three additional expert clinical assessments: Leanne Bisset Elbow Assessment, Claire Patella Robertson Knee Pain Assessment, and Sue Mayer Ankle Pain Assessment with comprehensive clinical interpretations
- **January 25, 2025**: Enhanced assessment interface with full scrollable functionality for forms, templates, and results
- **January 25, 2025**: Added McKenzie Lower Back Pain Assessment with comprehensive clinical interpretation and treatment recommendations
- **January 25, 2025**: Fixed content positioning issues in Assessments and Protocols tabs - content now starts at top of page
- **January 25, 2025**: Enhanced AI motion capture with improved error handling for TensorFlow.js ROI width errors
- **June 24, 2025**: Motion capture system completed with MediaPipe pose detection and virtual patient creation
- **June 24, 2025**: Enhanced PhysioGPT with color-coding system and real-time evidence integration  
- **June 24, 2025**: Implemented comprehensive user authentication and 14-day trial system
- **June 24, 2025**: Initial platform setup with core AI integration and database architecture

## User Preferences

```
Preferred communication style: Simple, everyday language.
```