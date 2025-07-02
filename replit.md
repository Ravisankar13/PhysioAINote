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

- **January 02, 2025**: Fixed critical navigation routing issues causing Exercise Library and Peer Exchange (Forum) pages to display blank screens. Converted SharedCasesPage.tsx and ExerciseListNew component from React Router to wouter navigation system, replacing useNavigate with useLocation and navigate() calls with setLocation(). All navigation links in header dropdown menu now function properly without blank page redirects.
- **January 01, 2025**: Added History tab to main Competitions page with complete competition history functionality including detailed results, scores, rankings, question-by-question AI feedback, performance analytics, and expandable detailed analysis for each competition.
- **January 01, 2025**: Created 10 challenging clinical diagnosis competitions for advanced clinical reasoning assessment. Added competitions covering shoulder pain with neurological symptoms, knee pain diagnostic challenges, lower back pain with red flags, chronic neck pain and headaches, hip pain in athletes, elbow pain in tennis players, ankle instability, post-surgical knee complications, shoulder impingement vs instability, and multi-level spine pathology. All competitions set to advanced difficulty with 45-minute time limits, using existing complex case studies from the database. Total complex case competitions increased from 2 to 12, all accessible through the admin preview tab for user "Fateofjustice".
- **January 01, 2025**: Successfully implemented mandatory email requirement for user registration. Updated registration form validation schema to require email input with proper error handling, changed form label from "Email (Optional)" to "Email", and verified functionality through testing. All new user registrations now require a valid email address with immediate client-side validation preventing form submission without email.
- **January 01, 2025**: Renamed "Complex Cases" tab to "Practice Case Studies" for better clarity and user experience. Updated navigation interface to reflect the new naming while maintaining all existing functionality for multi-stage clinical reasoning challenges.
- **June 29, 2025**: Implemented automatic seeding system for complex case studies - no user interaction required. System now automatically generates 10 advanced multi-stage clinical reasoning cases during server startup covering Digital Therapeutics for Chronic Low Back Pain, Machine Learning-Guided Knee Osteoarthritis Management, Virtual Reality Proprioceptive Training for Shoulder Instability, Blood Flow Restriction Training for Post-ACL Surgery, Biopsychosocial Integration for Chronic Neck Pain, Fascial Manipulation for Plantar Fasciitis, Precision Medicine in Rotator Cuff Repair, Wearable Sensor Technology for Hip Osteoarthritis, Regenerative Medicine for Chronic Achilles Tendinopathy, and AI-Powered Telerehabilitation for Post-Stroke Recovery. Created additionalComplexCases2024.ts with predefined case configurations and integrated automatic case generation into server/index.ts startup sequence. Complex cases are now available immediately upon system deployment without requiring manual creation or admin intervention.
- **June 29, 2025**: Successfully implemented and tested Enhanced Evidence-Based AI Scoring System for competitions. OpenAI GPT-4o now analyzes competition responses with detailed clinical reasoning assessment, providing evidence-based feedback that directly references specific research papers from our comprehensive database. System features multi-dimensional scoring (Clinical Reasoning 40%, Assessment Skills 25%, Treatment Planning 25%, Communication 10%) with time efficiency bonuses. Live testing confirmed 70% accuracy scores, detailed rationales explaining scoring decisions, and 830+ character comprehensive feedback with research citations. Competition participants now receive professional-grade clinical assessment with specific learning recommendations.
- **December 29, 2025**: Successfully verified AI analysis system for complex case study responses is working correctly. OpenAI GPT-4o properly analyzes user answers and provides detailed feedback including category-specific scores (Clinical Reasoning, Assessment Skills, Treatment Planning, Communication), personalized strengths and improvement areas, recommended learning resources, and actionable next steps. The scoring system combines AI analysis with time efficiency calculations for comprehensive performance evaluation.
- **June 29, 2025**: Fixed critical routing conflicts and JavaScript errors throughout the application. Systematically converted all React Router dependencies to wouter, updated AuthPage.tsx to use wouter's navigation and location handling, converted Header, Footer, HeroSection, FeaturesSection, CTASection components to use wouter Link syntax, updated CompetitionParticipationPage and ActiveCompetitions routing, and converted protected-route to use wouter's Redirect instead of Navigate. Resolved "TypeError: D.some is not a function" error in CompetitionParticipationPage by adding proper null checks for participationData.caseAttempts array. Updated all case study titles from diagnosis-revealing names (e.g., "ACL Rupture in Soccer Player") to symptom-based descriptions (e.g., "Soccer Player with Severe Knee Injury") for realistic clinical assessment. Modified AI case study generator to produce symptom-focused titles for future cases. Verified that previously failing competitions "Knee Diagnostics" (ID: 2) and "Speed Diagnosis Challenge" (ID: 1) now redirect and function properly without blank page errors.
- **December 29, 2025**: Fixed competition submission internal server error by resolving OpenAI integration issues in competitionService.ts. Switched from text-based fallback scoring back to OpenAI-powered analysis as requested. Added comprehensive error handling with fallback scoring system, proper try-catch blocks, and detailed logging. Competition scoring now uses OpenAI GPT-4o for advanced clinical reasoning analysis while providing reliable fallback scores if API calls fail. All case study titles updated to symptom-based descriptions to prevent diagnosis revelation.
- **June 28, 2025**: Completed comprehensive competitive clinical reasoning platform implementation with full database schema, AI-powered scoring system, and frontend interfaces. System includes multiple competition formats (daily challenges, speed challenges, accuracy contests, differential races, treatment planning competitions, tournaments, specialty leagues), advanced scoring algorithms analyzing accuracy, speed, reasoning, differential diagnosis, and treatment quality, achievement system with progress tracking, global leaderboards with various categories and timeframes, and complete integration with existing AI case studies. Added navigation and routing for `/competitions` page with modern tabbed interface for active competitions, leaderboards, achievements, and competition history.
- **January 28, 2025**: Enhanced postural analysis cameras with real-time alignment assessment using MediaPipe pose detection. System now displays green lines for proper alignment and red lines for deviations, including shoulder/hip level analysis, knee valgus detection, forward head posture assessment, and center of mass evaluation. Added professional visual overlays with quantified measurements for precise postural assessment across anterior, posterior, and lateral views.
- **January 28, 2025**: Fixed critical symptom analysis bug where OpenAI responses wrapped in markdown code blocks (```json...```) were causing JSON parsing failures and fallback to generic responses. Implemented comprehensive response cleaning with regex patterns to properly remove markdown formatting. System now correctly differentiates between anatomical locations - front knee pain generates Patellofemoral Pain Syndrome analysis while back knee pain generates Popliteal cyst analysis, ensuring location-specific diagnostic accuracy throughout the intelligent assessment workflow.
- **January 28, 2025**: Enhanced multi-plane postural analysis with comprehensive camera selection for each view. System now supports both front-camera and rear-camera options for anterior, posterior, and lateral views with automatic camera type recommendations, intelligent camera categorization, and persistent camera settings per view. Added visual indicators showing recommended camera types and enhanced user controls for optimal postural assessment capture.
- **January 28, 2025**: Implemented revolutionary Intelligent Assessment System with AI-powered symptom analysis, multi-plane postural assessment, movement prediction, and clinical visualization framework. System includes advanced NLP symptom processing, automated movement test selection, comprehensive postural analysis with multi-camera support, and foundation for AI-generated anatomical pathology illustrations. Added dedicated server routes (/api/analyze-symptoms, /api/analyze-posture) with OpenAI GPT-4o integration for clinical reasoning and assessment recommendations.
- **January 28, 2025**: Added flexible step-by-step navigation to integrated clinical assessment with Previous/Next buttons, free movement between all steps without completion requirements, visual progress indicators, and enhanced user workflow allowing users to jump to any assessment stage
- **January 28, 2025**: Implemented comprehensive camera selection functionality for both Motion Capture and Static Postural Analysis components with front/rear camera switching, device-specific selection dropdown, camera status indicators, and mobile device compatibility
- **January 25, 2025**: Increased camera height for full body capture: changed aspect ratio from 16:9 to 4:5, increased camera resolution to 1280x1600, enhanced display height to 900px minimum, and updated 3D skeleton coordinate system to properly handle taller camera dimensions for better leg and full-body movement detection
- **January 25, 2025**: Enhanced motion capture for full body detection: increased camera resolution to 1280x720, optimized AI models with MoveNet Thunder for better leg tracking, added visual positioning guides and setup instructions to help users properly frame their entire body
- **January 25, 2025**: Simplified motion capture configuration by removing "Enhanced AI" and "Multi-Camera" options, keeping only standard capture mode for streamlined user experience
- **June 26, 2025**: Enhanced diagnostic-to-treatment pathway visibility with prominent action buttons, visual progress indicators, and comprehensive diagnostic summary in treatment planning. Added "Proceed to Diagnosis" and "Create Treatment Plan" buttons with clear workflow guidance from motion analysis through clinical diagnosis to personalized treatment protocols.
- **January 25, 2025**: Implemented advanced motion capture technical improvements including enhanced pose detection models (BlazePose, MoveNet, PoseNet ensemble), multi-camera setup with synchronized capture and pose fusion, and comprehensive advanced filtering system with Kalman filters, temporal smoothing, outlier detection, confidence-based validation, and anatomical constraints. System now provides professional-grade motion analysis with real-time quality metrics and movement pattern recognition.
- **January 25, 2025**: Added comprehensive standardized outcome measures to PhysioGPT Assessment tabs including DASH, Oswestry Disability Index (ODI), WOMAC, Neck Disability Index (NDI), KOOS, SPADI, PEM, FAAM, Roland Morris Low Back Pain Questionnaire, Harris Hip Score, Constant-Murley Shoulder Score, and Patient-Rated Wrist Evaluation (PRWE). These evidence-based assessment tools provide standardized scoring and clinical interpretation for comprehensive patient evaluation.
- **January 25, 2025**: Added Motion Capture as prominent action button in navigation header alongside PhysioGPT, AI Notes, and Research for easy access to motion capture and diagnostic features
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