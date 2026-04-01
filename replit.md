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
- **Authentication**: Passport.js
- **API Design**: RESTful

### Database
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Migrations**: Drizzle Kit

### Key Features & Design Patterns
- **AI Integration**: Leverages OpenAI GPT-4o for clinical analysis, content generation, virtual patient analysis, research gap analysis, exercise generation, real-time movement analysis, and privacy-preserving SOAP-to-Virtual-Patient conversion.
- **Biomechanical Systems**: Includes a bidirectional muscle-joint system, 3D force visualization, and a biomechanical clinical assessment system for patient digital twins and injury risk scoring. This system features an "Influence Ripple System" for cross-muscle effects (reciprocal inhibition, fascial chain, kinetic chain).
- **Multi-View Skeleton Visualization**: Simultaneous display of the skeleton from multiple angles with synchronized viewers.
- **Motion Capture & Virtual Patient System**: WebRTC camera integration for real-time pose detection, skeleton overlay, AI-powered virtual patient generation, and detailed movement analysis.
- **Focused Clinical Camera System**: Region-specific camera mode with GPT-4o Vision AI analysis for detecting clinical signs, real-time joint angle computation, and automatic mapping to 3D skeleton markers. Enhanced with view-aware postural analysis detecting kyphosis, lordosis, scoliosis, anterior pelvic tilt, forward head posture, pelvic obliquity/rotation, scapular elevation/protraction, and real-time scapulohumeral rhythm tracking. Auto-detects camera view (frontal/lateral/posterior) and shows relevant metrics with clinical thresholds.
- **Phone-to-Desktop Camera Link**: WebSocket-based phone camera relay for the Focused Clinical Camera System.
- **Virtual Patient Management System with Mixamo Integration**: CRUD interface for managing patient 3D models with procedural generation or Mixamo integration, customizable pathologies, and animation playback.
- **Enhanced Body Scanner X-Ray Alternative**: Medical-grade anatomical visualization with detailed structures and clinical measurements.
- **Comprehensive Running Gait Analysis**: Professional-grade biomechanical analysis with 25+ real-time metrics.
- **Clinical Documentation**: AI-enhanced SOAP note generation, OpenAI Whisper for audio transcription, automated PII de-identification, and version control.
- **PhysioGPT Clinical Enhancements**: Transforms the PhysioGPT page into a comprehensive clinical decision support system with a clinical context panel, integrated tools, and professional mode.
- **Exercise Prescription**: Comprehensive, body part-specific, difficulty-scaled, and evidence-based exercise database with AI-powered recommendations.
- **Research Integration**: AI-analyzed research database with bias assessment and clinical application insights. PubMed/PEDro-equivalent evidence is now wired into all AI clinical reasoning pipelines (PhysioGPT chat, Clinical Bubble, Treatment Synthesis) via `server/services/clinicalEvidenceService.ts`. Every recommendation can cite actual papers with PMIDs, evidence grades (A-D), and clickable PubMed links. The service uses in-memory TTL caching (15 min) and falls back to curated reference papers when PubMed is unreachable.
- **UI/UX Decisions**: Utilizes Shadcn/ui and Tailwind CSS for a modern, professional aesthetic with intuitive navigation and responsive design.
- **Security**: Encrypted session secrets, robust CORS configuration, Zod schema validation, and secure file upload handling.
- **Clinical Bubble on Pain Markers**: An AI-powered floating clinical info panel triggered by pain markers, offering differential diagnoses, assessments, treatments, and follow-up questions.
- **Kinetic Chain Connection System**: Analyzes connected regions for pain markers using a kinetic chain map, with a "Test the Chain" mode for pose analysis.
- **Zoom Tool with Anatomical Landmark System**: Allows deep zoom into specific anatomical structures with identification of over 147 anatomical virtual points.
- **Comprehensive Shoulder Assessment System**: A deep clinical shoulder assessment system with AI-powered differential diagnosis, including special tests, muscle tests, and ROM norms.
- **Interactive Skeleton-to-Text System**: The skeleton viewer reacts to clinical conversation content by highlighting body regions, pain types, pathologies, and severity.
- **Direct Bone Manipulation (Pose Mode)**: Enables click-and-drag skeleton posing without sliders.
- **Extended Pain Marker Types**: Supports five types of pain markers: Point, Area, Referred, Line, and Paint (free-draw).
- **15 Symptom Types System**: Beyond pain, supports various symptoms with unique colors and icons for visual distinction on the 3D skeleton.
- **Free-Draw Paint Mode**: Allows painting irregular symptom patterns directly on the 3D skeleton surface.
- **Postural-Pain Correlation System**: Auto-triggers when posture sliders change, computing force/muscle impacts and sending to AI for biomechanical analysis.
- **Real-Time Postural Force Analysis**: Calculates joint loading as a percentage of body weight based on skeleton pose.
- **Fascial Chain 3D Visualization (Body Tension)**: Renders myofascial chains as colored 3D lines on the skeleton, with tension levels driving visual effects.
- **Scar Tissue & Adhesion Mapping**: Click-to-place system for documenting scars and adhesion bands on the 3D skeleton, including clinical impact analysis.
- **Treatment Priority Engine**: Auto-generates ranked treatment targets with clinical status, actions, techniques (including evidence grades and references), root cause/compensation classification, and syndrome protocols. Includes a contraindication system.
- **Pathology Compensation Engine**: When a muscle has pathology, automatically computes clinically accurate compensation patterns, ROM restrictions, and postural deviations. Feeds directly into movement animations: pathology ROM restrictions become animation constraints that limit joint movement and redistribute blocked motion to compensating joints. Postural deviations serve as animation baselines. Visual "Pathology Compensation Active" badge shows affected joints during animation playback.
- **Unified Pain Investigation System**: Connects all analysis engines (forces, muscles, fascial chains, scars, kinetic chains) when a pain marker is placed, featuring a Pain Driver Ranking Engine and cross-system correlation.
- **Hypothesis-Driven Clinical Summary Chat Panel**: Clicking a hypothesis in the AI Reasoning panel opens a dedicated conversational chat panel with a streaming clinical summary focused on that diagnosis. Supports follow-up questions, a "Skeleton Data" toggle to include/exclude biomechanical context, and a "Pose to Hypothesis" button that instructs the AI to pose the 3D skeleton to the typical clinical presentation. Uses SSE streaming via `POST /api/physiogpt/hypothesis-chat/stream`. Component: `client/src/components/skeleton/HypothesisChatPanel.tsx`.
- **Clinical Text-to-Skeleton Auto-Visualization**: A text input panel in the right sidebar where practitioners type free-form patient descriptions (e.g. "45-year-old with right shoulder pain, rotator cuff weakness, forward head posture"). GPT-4o parses the text into structured data and automatically: (1) places pain markers at anatomical locations using ANATOMICAL_VIRTUAL_POINTS, (2) sets muscle states/pathology via MuscleOverride system, (3) adjusts posture sliders via modelConfig, (4) highlights affected regions via clinicalHighlights. Backend endpoint: `POST /api/clinical-text/parse`. Component: `client/src/components/skeleton/ClinicalTextInput.tsx`.
- **Tissue-Specific Pathology Layer**: A unified "Tissue View" system with 5 tissue modes (Muscle, Tendon, Joint, Nerve, Fascia) accessible via a toolbar toggle button. Each mode highlights relevant anatomical structures on the 3D skeleton with tissue-specific coloring. Tendon view includes Cook's tendinopathy staging (reactive/dysrepair/degenerative) with clinical management guidelines. Joint view includes Kellgren-Lawrence OA grading. Nerve view maps peripheral nerve pathways with entrapment sites and clinical tests. Fascia view shows myofascial chain layers. Clicking individual structures shows detailed info cards with clinical notes, ROM data, and pathology information. Data module: `client/src/lib/tissueViewData.ts`. Component: `client/src/components/skeleton/TissueViewSelector.tsx`. Viewer prop: `tissueViewOverlay` on `PureThreeGLBViewer`.
- **Pain & Symptom Intelligence Layer**: Transforms pain markers from simple dots into a diagnostic reasoning tool. Each pain marker automatically receives a mechanism classification (nociceptive/neuropathic/myofascial/central sensitization) via `classifyPainMechanism()`. When a marker is selected, the Pain Intelligence Panel (`PainIntelligencePanel.tsx`) shows: mechanism badge with color coding, nerve root analysis with dermatome/myotome/reflex data for neuropathic markers, trigger point referral patterns for myofascial markers, and AI-generated symptom behaviour analysis (flexion/extension/loading/rest/morning/fatigue responses via GPT-4o at `POST /api/pain-intelligence/behaviour`). Dermatome territory highlighting renders blue glow overlays on skeleton bones corresponding to affected nerve roots. Nerve root labels are rendered as 3D sprites on the skeleton for neuropathic markers. Referral zones for myofascial markers use distinct orange glow overlays (vs blue for dermatomes). The ClinicalBubble also includes a "Sx" (Symptom Behaviour) tab with the same behaviour analysis integrated. Data map: `client/src/lib/neurologyMap.ts` contains full C1-S5 nerve root profiles (28 levels) mapped to skeleton bones, 20 trigger point referral patterns for common muscles, and rule-based mechanism classification logic.

## External Dependencies

- **AI Services**: OpenAI API (GPT-4o, Whisper), Leonardo AI, Runway ML.
- **Cloud Storage**: AWS S3.
- **Payment Processing**: PayPal SDK, Stripe.
- **Database Services**: Neon PostgreSQL.
- **Email Service**: SendGrid.