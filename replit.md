# PhysioGPT Platform

## Overview
PhysioGPT is an AI-powered physiotherapy platform designed to provide clinical decision support for practitioners and students. Its primary purpose is to enhance efficiency, accuracy, and educational capabilities in physiotherapy, ultimately improving patient outcomes and practitioner workflow. Key capabilities include SOAP note generation, virtual patient analysis, evidence-based exercise prescription, and extensive research integration. The project aims to become a leading AI solution in physiotherapy, with significant market potential for improving diagnostic precision and treatment efficacy.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
The platform is built with a React 18 (TypeScript) frontend using Shadcn/ui and Radix UI for components, styled with Tailwind CSS, and managed with React hooks. The backend utilizes Node.js 20 (Express.js) with TypeScript, employing Passport.js for authentication and a RESTful API design. Data is stored in a PostgreSQL database (Neon serverless) managed with Drizzle ORM.

### Key Features & Design Patterns
- **AI Integration**: Leverages OpenAI GPT-4o for a wide range of clinical analyses, content generation, and decision support, including virtual patient analysis, exercise generation, and real-time movement analysis.
- **Biomechanical Systems**: Incorporates a bidirectional muscle-joint system, 3D force visualization, and a biomechanical clinical assessment system for patient digital twins and injury risk scoring, featuring an "Influence Ripple System."
- **Motion Capture & Virtual Patient System**: Integrates WebRTC for real-time pose detection and skeleton overlay, AI-powered virtual patient generation, and detailed movement analysis. This includes a Focused Clinical Camera System with GPT-4o Vision AI for detecting clinical signs, joint angle computation, and automated postural analysis. A WebSocket-based phone-to-desktop camera link is supported.
- **Virtual Patient Management**: Provides CRUD operations for managing 3D patient models, with procedural generation or Mixamo integration, customizable pathologies, and animation playback.
- **Enhanced Anatomical Visualization**: Features a high-fidelity 138MB muscled skeleton GLB model with 94 bones and 25+ named muscle meshes, offering Multi-View Skeleton Visualization and an Enhanced Body Scanner X-Ray Alternative. A Tissue-Specific Pathology Layer provides unified "Tissue View" modes with specialized clinical insights.
- **Advanced Clinical Analysis**:
    - **Running Gait Analysis**: Professional-grade biomechanical analysis with 25+ real-time metrics.
    - **Clinical Bubble**: An AI-powered floating panel for differential diagnoses and treatment guidance.
    - **Kinetic Chain Connection System**: Analyzes connected regions for pain markers.
    - **Shoulder Assessment System**: Deep clinical shoulder assessment with AI-powered differential diagnosis.
    - **Pain & Symptom Intelligence Layer**: Classifies pain mechanisms and provides nerve root analysis and trigger point referral patterns.
    - **Injury Mechanism Engine**: Explains injury causation through causal chain flowcharts and load redistribution analysis.
    - **What-If Clinical Simulation**: Allows simulation of interventions and prediction of changes in risk scores.
    - **Treatment Simulation Timeline Engine**: Projects recovery based on prescribed treatments, featuring a visual multi-phase timeline, recovery curve charts, milestone tracking, and a Treatment Progression Re-query Engine that dynamically adjusts treatment plans based on recovery phases.
    - **Goal-Driven Recovery Engine**: Defines measurable recovery targets per condition and drives treatments to close the gap, integrating AI-generated recovery goals that adapt to patient factors.
    - **Patient Factors & Condition Recovery Engine**: Personalizes recovery predictions using 17 patient-specific factors and 15 evidence-based condition recovery profiles, adjusting timelines based on patient-specific modifiers.
    - **Sling Engine**: Analyzes 5 functional slings to detect weak links, force rerouting, and cross-sling compensation, generating per-sling treatment targets.
- **Clinical Documentation**: AI-enhanced SOAP note generation, OpenAI Whisper for audio transcription, automated PII de-identification, and an Interactive Skeleton-to-Text System that visualizes clinical conversations on the skeleton.
- **Treatment & Exercise Management**:
    - **Exercise Prescription**: AI-powered, evidence-based recommendations from a comprehensive exercise database.
    - **Treatment Priority Engine**: Auto-generates ranked treatment targets with clinical status and techniques.
    - **Evidence Engine**: A unified queryable catalog consolidating core and expert libraries, scoring treatment options by relevance.
    - **Treatment Decision Engine**: An 8-module pipeline transforming clinical reasoning into actionable, evidence-graded treatment plans.
    - **Treatment Plan Generator**: Creates adaptive, phased rehabilitation plans from Decision Engine output.
    - **Intake & Extraction Engine**: Consolidates clinical data from various inputs into a structured `ClinicalExtractionResult`.
- **Dynamic 3D Interactions**: Includes a Zoom Tool with Anatomical Landmark System, Direct Bone Manipulation (Pose Mode), Extended Pain Marker Types, 15 Symptom Types, Postural-Pain Correlation System, Real-Time Postural Force Analysis, Fascial Chain 3D Visualization, Scar Tissue & Adhesion Mapping, and a Pathology Compensation Engine.
- **Research Integration**: AI-analyzed research database with bias assessment and clinical application insights, providing PubMed/PEDro-equivalent evidence and citations within AI clinical reasoning.
- **Security**: Implements encrypted session secrets, robust CORS configuration, Zod schema validation, and secure file upload handling.

## External Dependencies
- **AI Services**: OpenAI API (GPT-4o, Whisper), Leonardo AI, Runway ML.
- **Cloud Storage**: AWS S3.
- **Payment Processing**: PayPal SDK, Stripe.
- **Database Services**: Neon PostgreSQL.
- **Email Service**: SendGrid.