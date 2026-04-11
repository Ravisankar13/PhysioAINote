# PhysioGPT Platform

## Overview

PhysioGPT is an AI-powered physiotherapy platform providing clinical decision support for practitioners and students. It offers tools for SOAP note generation, virtual patient analysis, evidence-based exercise prescription, and extensive research integration. The platform aims to enhance efficiency, accuracy, and educational capabilities in physiotherapy, improving patient outcomes and practitioner workflow. The vision is to become a leading AI solution in physiotherapy, with significant market potential for improving diagnostic precision and treatment efficacy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript)
- **UI Components**: Shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context
- **Build Tool**: Vite
- **Code Splitting**: All routes lazy-loaded via React.lazy() with Suspense fallbacks; heavy sub-components in PhysioGPT lazy-loaded (21 panels/tabs); Vite manual chunks for three.js, tensorflow, recharts, pdf/docx vendors
- **Performance**: PhysioGPT shows branded loading screen with progress bar during 138MB GLB model download; PDF generation dynamically imported on demand

### Backend
- **Runtime**: Node.js 20 (Express.js)
- **Language**: TypeScript (ES modules)
- **Authentication**: Passport.js
- **API Design**: RESTful

### Database
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Migrations**: Drizzle Kit

### Core Features & Design Patterns
- **AI Integration**: Leverages OpenAI GPT-4o for clinical analysis, content generation, virtual patient analysis, research gap analysis, exercise generation, real-time movement analysis, and privacy-preserving SOAP-to-Virtual-Patient conversion.
- **Biomechanical Systems**: Includes a bidirectional muscle-joint system, 3D force visualization, and a biomechanical clinical assessment system for patient digital twins and injury risk scoring, featuring an "Influence Ripple System."
- **Motion Capture & Virtual Patient System**: WebRTC camera integration for real-time pose detection, skeleton overlay, AI-powered virtual patient generation, and detailed movement analysis. This includes a Focused Clinical Camera System with GPT-4o Vision AI for detecting clinical signs, real-time joint angle computation, and automated postural analysis (kyphosis, lordosis, scoliosis, etc.). A WebSocket-based phone-to-desktop camera link is also supported.
- **Virtual Patient Management**: CRUD interface for managing patient 3D models with procedural generation or Mixamo integration, customizable pathologies, and animation playback.
- **Enhanced Anatomical Visualization**: Medical-grade anatomical visualization using a high-fidelity 138MB muscled skeleton GLB model with 94 bones and 25+ individually named muscle meshes (Deltoid, Trapezius, Pec Major/Minor, Lat Dorsi, Gluteus Maximus/Medius/Minimus, Piriformis, Rectus Abdominus, Obliques, etc.). Includes Multi-View Skeleton Visualization and an Enhanced Body Scanner X-Ray Alternative with detailed structures and clinical measurements. A Tissue-Specific Pathology Layer provides unified "Tissue View" modes (Muscle, Tendon, Joint, Nerve, Fascia) with specialized clinical insights and visualizations. Muscle mesh classification uses both name-based (for 25+ named anatomical meshes) and bone-weight-based approaches.
- **Advanced Clinical Analysis**:
    - **Running Gait Analysis**: Professional-grade biomechanical analysis with 25+ real-time metrics.
    - **Clinical Bubble**: An AI-powered floating clinical info panel for differential diagnoses, assessments, treatments, and follow-up questions.
    - **Kinetic Chain Connection System**: Analyzes connected regions for pain markers with a "Test the Chain" mode.
    - **Shoulder Assessment System**: Deep clinical shoulder assessment with AI-powered differential diagnosis, including special tests and ROM norms.
    - **Pain & Symptom Intelligence Layer**: Transforms pain markers into diagnostic tools by classifying mechanisms (nociceptive/neuropathic/myofascial/central sensitization) and providing nerve root analysis, trigger point referral patterns, and AI-generated symptom behavior analysis.
    - **Injury Mechanism Engine**: Synthesizes data to explain injury causation, producing causal chain flowcharts, load redistribution analysis, and compensation pattern cards.
    - **What-If Clinical Simulation**: Allows practitioners to simulate clinical interventions and see predicted changes in risk scores, joint forces, and compensation patterns.
    - **Treatment Simulation Timeline Engine**: Projects recovery forward through time by mapping prescribed treatments (from Exercise Engine and Manual Therapy tabs) to biomechanical effects using existing intervention tables. Features a visual multi-phase timeline with week scrubber that updates the 3D skeleton, phase transition markers, recovery curve chart (risk/pain/sling integrity), milestone tracking, and before/after summary. Core engine: `client/src/lib/simulationTimelineEngine.ts`, UI panel: `client/src/components/skeleton/SimulationTimelinePanel.tsx`. Accessible via the "Timeline" tab in the Injury Mechanism panel.
    - **Patient Factors & Condition Recovery Engine**: Personalized recovery prediction system that captures 17 patient-specific factors (age, BMI, diabetes, thyroid, smoking, steroid injection history, previous episodes, chronicity, irritability, compliance, psychological risk, sleep quality, activity level, side affected, medication use, comorbidities) and computes 7 recovery modifier multipliers (healing rate, pain sensitivity, compliance, recurrence risk, tissue quality, psychosocial, overall recovery). Includes a library of 15 evidence-based condition recovery profiles (Rotator Cuff Tendinopathy, Frozen Shoulder, ACL Reconstruction, Lumbar Disc Herniation, Lateral Epicondylalgia, Patellofemoral Pain, Achilles Tendinopathy, Lateral Ankle Sprain, Cervical Radiculopathy, Plantar Fasciitis, Subacromial Impingement, Hip OA, Gluteal Tendinopathy, Meniscal Injury, Whiplash) with phased recovery timelines and treatment responsiveness data. Auto-populates from the clinical pipeline (ClinicalExtractionResult + StructuredReasoningResult) and auto-detects condition profiles via keyword matching. Adjusts recovery timelines based on patient-specific modifiers. Core engine: `client/src/lib/patientFactorsEngine.ts`, UI integrated into `SimulationTimelinePanel.tsx`.
    - **Sling Engine**: System-level force-transfer interpreter analyzing 5 functional slings (Posterior Oblique, Anterior Oblique, Lateral, Deep Longitudinal, Scapular/Shoulder). Detects weak links, force rerouting, cross-sling compensation patterns, and generates per-sling treatment targets. Includes 3D pathway visualization on the skeleton and feeds sling context into the Treatment Decision Engine. Core engine: `client/src/lib/slingEngine.ts`, UI panel: `client/src/components/skeleton/SlingAnalysisPanel.tsx`.
- **Clinical Documentation**: AI-enhanced SOAP note generation, OpenAI Whisper for audio transcription, automated PII de-identification, and version control. An Interactive Skeleton-to-Text System allows the skeleton viewer to react to clinical conversations. A Clinical Text-to-Skeleton Auto-Visualization panel parses free-form patient descriptions to automatically place pain markers, set muscle states, adjust posture, and highlight affected regions.
- **Treatment & Exercise Management**:
    - **Exercise Prescription**: Comprehensive, body part-specific, difficulty-scaled, and evidence-based exercise database with AI-powered recommendations.
    - **Treatment Priority Engine**: Auto-generates ranked treatment targets with clinical status, actions, techniques (including evidence grades and references), and contraindication system.
    - **Evidence Engine**: Unified queryable evidence catalog (`server/services/evidenceEngine.ts`) that consolidates the core CANDIDATE_LIBRARY, SHARED_TECHNIQUE_DB, and 6 expert libraries (Bisset Elbow, Grimaldi Hip, Jo Gibson Shoulder, Clinical Edge, Physio Network, Sports Map) into a single catalog. Provides `POST /api/evidence-engine/query` and `GET /api/evidence-engine/stats` endpoints with Zod validation. Scores treatment options by relevance (problem class, mechanism, evidence grade, region, diagnosis keyword matching) and surfaces stage/irritability risk flags. Consumed by the Treatment Decision Engine and displayed in the "Evidence" tab in the PhysioGPT right panel with category/grade filters, expandable cards, mechanism-of-action details, and literature references.
    - **Treatment Decision Engine**: An 8-module pipeline that bridges clinical reasoning to actionable treatment direction, producing three-tier intervention lists with evidence grades, dosage, rationale, and risk flags. Now integrates Evidence Engine context (total options, grade distribution, expert approaches) into its output.
    - **Treatment Plan Generator**: An 8-module pipeline that transforms Decision Engine output into adaptive, phased rehabilitation plans with exercises, manual therapy, patient education, and progression criteria.
    - **Intake & Extraction Engine**: Unified clinical data capture pipeline consolidating manual form inputs, free-text clinical notes, voice transcription, and pain marker data into a structured `ClinicalExtractionResult` with 12+ clinical fields (body regions, symptoms, duration, onset, mechanism, aggravating/easing factors, red flags, irritability, functional limitations) plus missing-field prompts and source-attribution badges. Uses pattern-matching for structured inputs and focused GPT-4o for unstructured text.
- **Dynamic 3D Interactions**:
    - **Zoom Tool with Anatomical Landmark System**: Deep zoom into specific anatomical structures with identification of over 147 virtual points.
    - **Direct Bone Manipulation (Pose Mode)**: Enables click-and-drag skeleton posing.
    - **Extended Pain Marker Types**: Supports Point, Area, Referred, Line, and Paint (free-draw) markers.
    - **15 Symptom Types System**: Beyond pain, supports various symptoms with unique visual distinctions on the 3D skeleton.
    - **Postural-Pain Correlation System**: Auto-triggers biomechanical analysis when posture sliders change.
    - **Real-Time Postural Force Analysis**: Calculates joint loading based on skeleton pose.
    - **Fascial Chain 3D Visualization (Body Tension)**: Renders myofascial chains as colored 3D lines.
    - **Scar Tissue & Adhesion Mapping**: Click-to-place system for documenting scars and adhesion bands.
    - **Pathology Compensation Engine**: Computes compensation patterns, ROM restrictions, and postural deviations when a muscle has pathology, feeding into movement animations.
- **Research Integration**: AI-analyzed research database with bias assessment and clinical application insights. PubMed/PEDro-equivalent evidence is wired into all AI clinical reasoning pipelines, providing citations with PMIDs and evidence grades.
- **Security**: Encrypted session secrets, robust CORS configuration, Zod schema validation, and secure file upload handling.

## External Dependencies

- **AI Services**: OpenAI API (GPT-4o, Whisper), Leonardo AI, Runway ML.
- **Cloud Storage**: AWS S3.
- **Payment Processing**: PayPal SDK, Stripe.
- **Database Services**: Neon PostgreSQL.
- **Email Service**: SendGrid.