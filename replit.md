# PhysioGPT Platform
An AI-powered physiotherapy platform providing clinical decision support, enhancing efficiency, accuracy, and educational capabilities for practitioners and students.

## Run & Operate
- `npm install`: Install dependencies.
- `npm run dev`: Start the development server.
- `npm run build`: Build the frontend and backend.
- `npm run typecheck`: Run TypeScript type checking.
- `npm run codegen`: Generate API client code.
- `npm run db:push`: Apply database schema changes (see Gotchas for non-interactive environments).

**Required Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string (Neon serverless).
- `OPENAI_API_KEY`: API key for OpenAI services.
- `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: For AWS S3 storage.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: For PayPal integration.
- `STRIPE_SECRET_KEY`: For Stripe integration.
- `SENDGRID_API_KEY`: For SendGrid email service.
- `SESSION_SECRET`: For Express session management.

## Stack
- **Frontend**: React 18 (TypeScript), Shadcn/ui, Radix UI, Tailwind CSS
- **Backend**: Node.js 20 (TypeScript), Express.js, Passport.js
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Build Tool**: Vite

## Where things live
- `client/`: Frontend React application.
- `server/`: Backend Node.js application.
- `shared/schema.ts`: Database schema definition (source of truth).
- `server/db.ts`: Drizzle ORM configuration and database connection.
- `client/src/utils/footLock.ts`: Foot lock logic for pose tracking.
- `server/api/`: Backend API routes.
- `client/src/components/ui/`: Shared UI components.

## Architecture decisions
- **WebSocket Transport for Drizzle**: The Drizzle pool uses WebSocket transport (`@neondatabase/serverless`) to avoid issues with the Replit-hosted Neon-compatible HTTP gateway (e.g., `rows: null` for empty results, dropped rows from `INSERT/UPDATE … RETURNING`).
- **On-Frame Check for MediaPipe Landmarks**: To prevent avatar contortions from extrapolated MediaPipe landmarks, `mediapipeTo3D.ts` enforces an "on-frame check" (`[-0.05, 1.05]`) for landmark visibility and confidence, and `bodyVisibility` flags (upper/lower) are used to gate joint writes.
- **Foot Lock System**: A sophisticated foot lock system is implemented in `client/src/utils/footLock.ts` using a two-stage IK pass and `hipOffset` adjustments to stabilize the avatar's feet during pose tracking.
- **Real-time 3D Biomechanics**: The platform integrates a biomechanical engine with a Time-Aware Force Engine and a trust layer, providing realistic segment-chain moment calculations using de Leva (1996) mass fractions and Marras (1995) L1/L2 → L5/S1 amplification.
- **Manual Therapy Simulation**: A dedicated "Treatment Mode" (Manual-Therapy Simulation) runs three deterministic engines (Mechanical, Neuromuscular, Clinical) in tandem to simulate manual therapy techniques, persist state, and integrate with the Plan Cart.

## Product
- AI-powered clinical decision support for physiotherapy.
- SOAP note generation and clinical documentation.
- Virtual patient analysis and management.
- Evidence-based exercise prescription and treatment planning.
- Real-time motion capture and biomechanical analysis.
- Advanced anatomical visualization with pathology layers.
- Research integration and evidence scoring.
- Simulated manual therapy and treatment timeline engine.
- Goal-driven recovery engine.
- Secure user authentication and data handling.

## User preferences
Preferred communication style: Simple, everyday language.

## Gotchas
- **`assessment_sessions` is a NEW table, not a rename.** Drizzle's rename detector previously asked whether `assessment_sessions` was a rename of `session`, `exercises`, or `temp_soap_note`. Decision: it is a fresh `CREATE TABLE`. To prevent the prompt from stalling non-interactive `db:push` runs, the legacy tables `session` (auth, 14 rows), `exercises` (272 rows), and `temp_soap_note` (1 row) are kept declared as bare stubs in `shared/schema.ts` (~L4628) alongside the `difficulty` and `exercise_type` enums. Do not delete those stubs — they exist purely so the rename detector sees both sides of the diff and skips the prompt.
- **PG enum name collision required `assessment_type` → `education_assessment_type`.** Both `shared/schema.ts` and `shared/movementAnalysisSchema.ts` defined a `pgEnum("assessment_type", …)` with different value sets — Drizzle treats that as one enum with conflicting definitions. The `schema.ts` copy was renamed to `educationAssessmentTypeEnum` (PG name `education_assessment_type`); the `movementAnalysisSchema.ts` copy keeps `assessment_type`. Renaming only the TS variable is not sufficient because Drizzle keys on the PG name.
- **Verified live (May 2026):** after the above + a one-time DB normalization pass, `npm run db:push --force` completed non-interactively (`[✓] Changes applied`) and `case_research_syntheses.treatment_state` is present as `jsonb`, queryable via `GET/PATCH /api/treatment-state/:caseId`.
- **If `db:push` stalls again:** pre-create new enums in DB; rename `*_key` → `*_unique` indexes; `DROP CASCADE` empty tables Drizzle wants to recreate; for data-bearing tables, fix type mismatches with explicit `ALTER … TYPE … USING` (drop the default first if it isn't castable); backfill `.notNull()` columns that contain NULLs (`'{}'::jsonb`, `'[]'::json`, `0`, `NOW()`, `''`); null out orphan FK rows; remap stray enum literals not in the schema enum (e.g. `body_part='lower_back'` → `'back'` on `exercise_images`).

## Pointers
- **React Documentation**: [https://react.dev/](https://react.dev/)
- **Node.js Documentation**: [https://nodejs.org/docs/](https://nodejs.org/docs/)
- **Express.js Documentation**: [https://expressjs.com/](https://expressjs.com/)
- **Drizzle ORM Documentation**: [https://orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
- **OpenAI API Documentation**: [https://platform.openai.com/docs/overview](https://platform.openai.com/docs/overview)
- **MediaPipe Pose Documentation**: [https://developers.google.com/mediapipe/solutions/vision/pose_landmarker](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- **Shadcn/ui Documentation**: [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **Tailwind CSS Documentation**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)