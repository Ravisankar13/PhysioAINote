# PhysioGPT Platform

## Overview
PhysioGPT is an AI-powered physiotherapy platform providing clinical decision support for practitioners and students. Its purpose is to enhance efficiency, accuracy, and educational capabilities in physiotherapy, improving patient outcomes and practitioner workflow. Key capabilities include SOAP note generation, virtual patient analysis, evidence-based exercise prescription, and extensive research integration. The project aims to be a leading AI solution in physiotherapy with significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
The platform features a React 18 (TypeScript) frontend utilizing Shadcn/ui and Radix UI with Tailwind CSS. The backend is built with Node.js 20 (Express.js) in TypeScript, using Passport.js for authentication and a RESTful API. Data is stored in a PostgreSQL database (Neon serverless) managed by Drizzle ORM. The Drizzle pool uses the `@neondatabase/serverless` **WebSocket transport** (`neonConfig.poolQueryViaFetch = false` in `server/db.ts`); the HTTP-fetch transport is intentionally disabled because the Replit-hosted Neon-compatible HTTP gateway returns `rows: null` for empty result sets and drops the rows from `INSERT/UPDATE … RETURNING` responses, both of which crash or silently corrupt Drizzle queries.

### Key Features & Design Patterns
- **AI Integration**: Leverages OpenAI GPT-4o for clinical analysis, content generation, and decision support, including virtual patient analysis, exercise generation, and real-time movement analysis.
- **Biomechanical Systems**: Incorporates a bidirectional muscle-joint system, 3D force visualization, biomechanical clinical assessment, patient digital twins, injury risk scoring, and an "Influence Ripple System."
- **Motion Capture & Virtual Patient System**: Integrates WebRTC for real-time pose detection, AI-powered virtual patient generation, detailed movement analysis, and a Focused Clinical Camera System with GPT-4o Vision AI for detecting clinical signs and automated postural analysis. Supports WebSocket-based phone-to-desktop camera linking. A **Foot Lock** layer (`client/src/utils/footLock.ts`, default ON) detects per-foot support phase from MediaPipe ankle/heel/foot-index velocity, visibility, and floor-proximity (with hysteresis: 3 frames to plant, 2 to swing). On each planted frame it captures an anchor and applies a two-stage lock: (1) a true 2-bone IK pass (`solveLegIK`) re-solves the planted leg's knee position so FK from the hip lands the foot exactly on the anchor (raw knee landmark as pole hint, falling back to camera-forward when degenerate; heel and foot-index landmarks are translated by the same delta so dorsi/inversion stays coherent), and (2) the planted-foot `hipOffset` (in hipMidNorm coord space) is folded into `hipMidNorm` *before* `globalTranslation` is computed, so the avatar root stops drifting with raw hip noise. Mirror mode negates `lateralShift` downstream, which correctly mirrors the folded offset. The tracker also low-pass-filters the torsoUp/Forward/Right basis (α=0.18) before hip/knee dot products are taken, and `Posesmoother` damps leg joints adaptively — multiplying planted-leg joint noise by 2.5×, plus an additional up-to-3× multiplier when lower-body depth confidence drops below 0.5 (e.g., head-on view). Trackers reset on every camera start/stop. Wired through both `CameraPoseCapture` and `FocusedCameraCapture` (local + phone full_body paths) with a "Foot lock" toggle and per-foot planted/swinging Badges.
- **Virtual Patient Management**: Provides CRUD operations for 3D patient models, procedural generation or Mixamo integration, customizable pathologies, and animation playback.
- **Enhanced Anatomical Visualization**: Features a high-fidelity muscled skeleton GLB model with Multi-View Skeleton Visualization, an Enhanced Body Scanner X-Ray Alternative, and a Tissue-Specific Pathology Layer for specialized clinical insights.
- **Advanced Clinical Analysis**:
    - **Running Gait Analysis**: Professional biomechanical analysis with real-time metrics.
    - **Clinical Bubble**: AI-powered floating panel for differential diagnoses and treatment guidance.
    - **Kinetic Chain Connection System**: Analyzes connected regions for pain markers.
    - **Shoulder Assessment System**: Deep clinical shoulder assessment with AI-powered differential diagnosis.
    - **Pain & Symptom Intelligence Layer**: Classifies pain mechanisms and provides nerve root analysis and trigger point referral patterns.
    - **Injury Mechanism Engine**: Explains injury causation through causal chain flowcharts.
    - **What-If Clinical Simulation**: Allows simulation of interventions and prediction of changes in risk scores.
    - **Treatment Simulation Timeline Engine**: Projects recovery based on prescribed treatments with a visual multi-phase timeline, recovery curve charts, milestone tracking, and dynamic treatment plan adjustments.
    - **Goal-Driven Recovery Engine**: Defines measurable recovery targets and drives treatments to achieve them, using local-first computation with background AI refinement. Includes pathology-aware goal overrides and skeleton-aware goal setting based on current ROM, scar data, fascial tensions, and posture.
    - **Patient Factors & Condition Recovery Engine**: Personalizes recovery predictions using patient-specific factors and evidence-based condition recovery profiles.
    - **Sling Engine**: Analyzes functional slings to detect weaknesses and generate per-sling treatment targets.
    - **Time-Aware Force Engine**: Upgraded biomechanics engine with a trust layer (cumulative dose, asymmetry index, anthropometric confidence, patient-state thresholds, inline citations) and a time layer (rate of loading, inertial/impact forces, linked-segment chain, live SVG GRF arrow overlay). Includes a segment-chain moment primitive (`computeChainMoment`) using de Leva (1996) mass fractions: bending the elbow folds the forearm + hand back toward the GH joint and *reduces* shoulder load (correcting a prior bug where elbow flexion erroneously increased it), and the elbow no longer inherits ghost moments from shoulder abduction. The chain helper drives shoulder, elbow, wrist, hip and knee, and feeds a hand-load × horizontal-distance amplifier at L1/L2 → L5/S1 (Marras 1995). A HUD "Load" circle exposes 0/2.5/5/10/20 kg presets with a left/both/right hand selector so clinicians can simulate carried-weight scenarios live.
    - **Plan Cart & AI Treatment Orchestrator**: Allows clinicians to add generated items to a session-scoped cart, which can then be organized by AI to provide intra-session order, duration, frequency, multi-week schedule, and conflict flags.
    - **Electrophysical Agents (EPA) Engine**: Provides AI-generated recommendations for EPA modalities, including structured dosing parameters and reasoning chips, with a curated catalog excluding certain therapies.
    - **Lifestyle & Adjunct Rx Engine Tab**: Bundles recommendations for pacing, bracing, NSAID/pharmacology referral, education, sleep hygiene, ergonomics, and self-management strategies, mapping to treatment profiles for recovery curve adjustment.
    - **Natural Progression Layer**: Anchors recovery simulation baselines to literature-derived diagnosis priors, composing them with patient-specific shifters to adjust capacity-gain multipliers and probabilities.
    - **Treatment Timeline Builder**: A clinician-facing Gantt panel for scheduling interventions, dragging bars to reschedule, and receiving AI-powered plan reviews for effectiveness and conflict detection.
- **Clinical Documentation**: AI-enhanced SOAP note generation, audio transcription via OpenAI Whisper, automated PII de-identification, and an Interactive Skeleton-to-Text System.
- **Treatment & Exercise Management**: AI-powered, evidence-based exercise prescription, Treatment Priority Engine, Evidence Engine for scoring treatment options, an 8-module Treatment Decision Engine, and a Treatment Plan Generator. An Intake & Extraction Engine consolidates clinical data.
- **Dynamic 3D Interactions**: Includes a Zoom Tool with Anatomical Landmark System, Direct Bone Manipulation (Pose Mode), Extended Pain Marker Types, Symptom Types, Postural-Pain Correlation System, Real-Time Postural Force Analysis, Fascial Chain 3D Visualization, Scar Tissue & Adhesion Mapping, and a Pathology Compensation Engine.
- **Research Integration**: AI-analyzed research database with bias assessment and clinical application insights, providing evidence and citations.
- **Security**: Implements encrypted session secrets, robust CORS, Zod schema validation, and secure file upload handling.

## External Dependencies
- **AI Services**: OpenAI API (GPT-4o, Whisper), Leonardo AI, Runway ML.
- **Cloud Storage**: AWS S3.
- **Payment Processing**: PayPal SDK, Stripe.
- **Database Services**: Neon PostgreSQL.
- **Email Service**: SendGrid.