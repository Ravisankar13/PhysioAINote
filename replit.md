# PhysioGPT Platform - Compressed

## Overview

PhysioGPT is an advanced AI-powered physiotherapy platform designed to provide comprehensive clinical decision support for practitioners and students. It integrates modern web technologies with specialized AI models to offer tools for SOAP note generation, virtual patient analysis, evidence-based exercise prescription, and extensive research integration. The platform aims to revolutionize physiotherapy practice by enhancing efficiency, accuracy, and educational capabilities, ultimately improving patient outcomes and practitioner workflow.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Dec 25, 2025)
- **Multi-View Skeleton Visualization**: Simultaneous display of skeleton from multiple angles for comprehensive clinical assessment:
  - 4 Fixed Camera Presets: Front, Left Side, Right Side, Back views with precise camera positioning and lookAt targets
  - MultiViewSkeletonLayout Component: Grid display with synchronized skeleton viewers sharing same modelConfig, animationState, and biomechanicsData
  - View Toggle Controls: Individual switches to enable/disable each view angle, expand/collapse button for full-width mode
  - Camera Angle Props: PureThreeGLBViewer now accepts cameraAngle and disableControls props for fixed-angle views
  - Pointer-Events Locking: Fully blocks mouse/touch interactions on fixed-angle views using CSS pointer-events
  - Integration: Multi-View toggle button in TestSkeletonNew page, spans 2 columns when active
- **Key Files**: client/src/components/skeleton/MultiViewSkeletonLayout.tsx (multi-view component), client/src/components/skeleton/PureThreeGLBViewer.tsx (camera presets), client/src/pages/TestSkeletonNew.tsx (integration)
- **3D Force Visualization System**: Real-time biomechanical overlays on GLB skeleton using pure THREE.js:
  - Force Vector Arrows: THREE.ArrowHelper showing compression/shear direction and magnitude at lumbar spine, hips, and knees with clinical threshold-based coloring
  - Joint Stress Indicators: Spherical overlays at joints with green/yellow/red color coding based on NIOSH limits (3400N safe, 6400N critical for lumbar) and clinical thresholds
  - Muscle Activation Glow: Intensity-based spherical glows showing active muscle groups (erector spinae, glutes, quads, hamstrings) with blue-to-red color gradient
  - Interactive Hover Labels: Raycasting-based tooltips displaying exact force values in Newtons with status badges (safe/warning/critical)
  - UI Toggle Controls: Three switches (Forces, Stress, Muscles) in skeleton viewer header for controlling visualization layers
  - ForceVisualizationManager Class: Manages THREE.js objects with proper memory cleanup, stores force metadata for tooltips, handles raycasting
- **Biomechanical Clinical Assessment System**: Complete patient digital twin system with:
  - Biomechanics Calculation Engine: Joint forces (lumbar compression/shear, hip/knee compression, patellofemoral loading), muscle activation estimates (erector spinae, glutes, quads, hamstrings), ground reaction forces with weight distribution analysis
  - Injury Risk Scoring: FMS-style movement quality scores (stability, mobility, control), load asymmetry detection with clinical thresholds (NIOSH limits, patellofemoral safe limits), comprehensive risk factor identification
  - AI Clinical Assessment: OpenAI-powered treatment strategy generation with evidence-based recommendations including exercises with sets/reps/frequency, manual therapy techniques, precautions, and prognosis
  - Patient Assessment Dashboard: Comprehensive view at /patient-assessment combining all metrics, risk factors, movement quality analysis, and AI treatment planning
  - BiomechanicsPanel Component: 5-tab interface (Forces, Muscles, Risks, Quality, AI Plan) integrated into TestSkeletonNew page
- **Database Schema Extensions**: Added biomechanicalAssessments, injuryRiskScores, and treatmentStrategies tables linked to virtualPatientConfigs for persistent assessment storage

## Recent Changes (Jan 31, 2025)
- **Navigation Bar Update**: Removed "Competitions" and "Smart Assessment" buttons from main navigation. Added "Body Scanner", "Movement Analysis", and "Virtual Patients" buttons for direct access to core clinical features. Maintained "Research" button. New navigation order: PhysioGPT → Body Scanner → Movement Analysis → Virtual Patients → Enhanced SOAP → Research.
- **PhysioGPT Clinical Enhancements**: Transformed PhysioGPT page into comprehensive clinical decision support system with:
  - Clinical Context Panel for body region and condition type selection
  - Integrated Clinical Tools Panel with outcome measure calculators (ODI, DASH), prediction rules (Ottawa, C-Spine), and special tests library
  - Clinical Quick Actions toolbar for rapid SOAP generation, reasoning pathways, evidence checking, red flag screening, and exercise prescription
  - Professional Mode toggle for technical documentation with ICD/CPT codes
  - Enhanced system prompts with physiotherapy-specific clinical reasoning frameworks, red flag protocols, and treatment hierarchies
  - Structured clinical response display with automatic parsing of assessment, clinical reasoning, treatment plans, and contraindications
  - Context-aware suggestions based on conversation content and clinical focus

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
- **Camera Access Requirements**: Movement Analysis page requires HTTPS for camera access in production. Replit automatically provides HTTPS for deployments at `https://your-app.replit.app`. Users must grant camera permissions when prompted.

### Key Features & Design Patterns
- **AI Integration (Phase 5 - Completed Jan 2025)**: Leverages OpenAI GPT-4o for clinical analysis, content generation, and specialized models for virtual patient analysis based on expert physiotherapy methodologies (Jo Gibson, Alison Grimaldi, Leanne Bisset, Clinical Edge, Physio Network, Sports Map). Includes AI-powered research gap analysis, exercise generation, real-time movement analysis from webcam capture, automatic virtual patient generation from movement data, and PRIVACY-PRESERVING SOAP-to-Virtual-Patient conversion (extracts only de-identified clinical patterns needed for 3D models - no patient data stored).
- **Comprehensive Running Gait Analysis (Jan 31, 2025)**: Professional-grade biomechanical analysis with 25+ real-time metrics including cadence, stride length, step width, ground contact time (ms), flight time (ms), contact time ratio, foot strike pattern (heel/midfoot/forefoot) with angle measurement, vertical oscillation (cm) with vertical ratio calculation, joint angles (knee flexion, hip extension, ankle dorsiflexion), body position metrics (trunk lean, lateral lean, pelvic drop, pelvic rotation), symmetry analysis (step length asymmetry %, contact time asymmetry %, arm swing symmetry %), efficiency indicators (overstriding detection, crossover gait detection, overall efficiency score 0-100), and dynamic metrics (leg stiffness spring model, propulsive power estimate). Enhanced step detection with ground contact tracking, foot strike type determination, and comprehensive asymmetry analysis for injury prevention.
- **Enhanced Body Scanner X-Ray Alternative (Jan 31, 2025)**: Medical-grade anatomical visualization with enhanced rib cage (costovertebral joints, costochondral junctions, floating ribs 11-12, sternal angle at T4-T5, xiphoid process, intercostal spaces, rib angles), detailed hip/pelvis (ASIS/PSIS landmarks, acetabular angles, Shenton's line, Klein's line, sacroiliac joints, ischial tuberosities), comprehensive knee joint (intercondylar notch, tibial plateau compartments, proximal tibiofibular joint, Gerdy's tubercle, tibial tuberosity, Hoffa's fat pad, fabella when present), and enhanced elbow complex (coronoid process, radial head, capitellum/trochlea, olecranon fossa, radiocapitellar line, anterior humeral line). All structures include clinical measurements and alignment assessments for educational visualization.
- **Clinical Documentation**: AI-enhanced SOAP note generation, OpenAI Whisper for audio transcription, automated PII de-identification, and version control for notes. Features an AI Automatic Paperwork System for generating various clinical documents. NEW (Jan 2025): Temporary SOAP Notes system with 24-hour auto-expiry for both standard and continuous recording modes, automatic navigation between notes, and auto-save functionality.
- **Motion Capture & Virtual Patient System (Phase 2 - Completed Jan 2025)**: WebRTC camera integration for real-time pose detection via MediaPipe, skeleton overlay visualization, AI-powered virtual patient generation from movement data, and detailed movement analysis (quality scoring, pattern recognition). Includes AI-generated clinical scenarios and interactive analysis with expert framework integration. Features a medical-grade 3D skeleton system with dynamic anatomical accuracy and limb scaling. Movement capture integrated into Virtual Patients Management with dedicated "Capture" tab.
- **Virtual Patient Management System with Mixamo Integration (Jan 2025)**: Comprehensive CRUD interface for managing individual patient 3D models with persistent configurations. NEW: Hybrid visualization system supporting both procedural skeleton generation and professional Mixamo rigged models. Features include real-time 3D preview with toggle between model types, customizable pathologies (spinal, shoulder, lower limb), advanced slider controls for joint restrictions and limb proportions that work with both model types, animation playback for clinical movements, auto-save functionality, and privacy-preserving integration with SOAP notes. Virtual patients store only de-identified clinical patterns (movement restrictions, joint angles, pathology indicators) needed for 3D models - no patient names, ages, dates, or personal history. Database schema includes modelConfig (limbScales, shoulderPathology, spinalPathology, lowerLimbPathology) stored as JSONB. Mixamo integration provides industry-standard rigging with fallback to procedural generation if models unavailable.
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