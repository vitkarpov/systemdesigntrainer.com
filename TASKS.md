# Development Tasks & Progress

**Last Updated:** 2025-12-16

## 📍 Current Status: Week 2 - Signal Tracking & Red Flags Complete

---

## Week 1: Foundation & Core Flow ✅ COMPLETE

### Backend Infrastructure
- [x] PostgreSQL setup in Docker
- [x] Drizzle ORM integration
- [x] Database schema with 13 normalized tables
- [x] Migrations working
- [x] Seed data (URL Shortener case with 11 expectations)
- [x] NestJS database module with dependency injection

### Interview State Machine
- [x] Session state model (status, phase, timing)
- [x] Phase enum: problem → requirements → high_level → deep_dive → bottlenecks → wrap_up
- [x] Session status: not_started → in_progress → completed
- [x] Phase transitions with validation
- [x] Elapsed time tracking (session + phase)

### Services Implemented
- [x] `InterviewSessionService` - Session CRUD, state management, elapsed time
- [x] `TranscriptService` - Message management, chronological ordering
- [x] `PhaseService` - Phase transitions, metadata, progress calculation

### REST API (7 endpoints)
- [x] `POST /api/sessions` - Create new session
- [x] `POST /api/sessions/:id/start` - Start session
- [x] `GET /api/sessions/:id` - Get session state + metadata
- [x] `GET /api/sessions/:id/phases` - Get all phases with progress
- [x] `GET /api/sessions/:id/transcript` - Get full transcript
- [x] `PATCH /api/sessions/:id/phase` - Advance to next phase
- [x] `POST /api/sessions/:id/messages` - Add transcript message

### Testing
- [x] Test script: `./backend/test-api.sh`
- [x] End-to-end session flow verified

---

## Week 2: AI Interviewer & Pressure 🔄 IN PROGRESS

### 1. AI Integration (Priority: HIGH) ✅ COMPLETE
- [x] Install Anthropic SDK (`@anthropic-ai/sdk`)
- [x] Create `AiModule` and `AiService`
- [x] Set up API key in `.env`
- [x] Create `POST /api/sessions/:id/ai-response` endpoint
- [x] Basic LLM call working
- [x] Added to `test-api.sh` script

### 2. Prompt Engine (Priority: HIGH) ✅ COMPLETE
- [x] Create `PromptService` for context building
- [x] Build prompt context from:
  - [x] Current phase metadata
  - [x] Session elapsed time
  - [x] Recent transcript (last 10 messages)
  - [x] Interview case details
- [x] Phase-specific system prompts
- [x] Interviewer persona and tone

### 3. Signal Tracking Heuristics (Priority: MEDIUM) ✅ COMPLETE
- [x] Create `SignalService`
- [x] Implement keyword detection for signals:
  - [x] `asked_functional_reqs` - "requirements", "features", "users need"
  - [x] `asked_non_functional_reqs` - "scale", "performance", "availability"
  - [x] `mentioned_scale` - "million users", "requests per second"
  - [x] `proposed_api` - "API", "endpoint", "REST", "GraphQL"
  - [x] `discussed_tradeoffs` - "trade-off", "vs", "alternatively"
  - [x] Plus 6 more signals: `clarified_constraints`, `drew_high_level_diagram`, `discussed_data_model`, `addressed_bottlenecks`, `structured_approach`, `asked_clarifying_questions`
- [x] Store detected signals in `interview_signals` table
- [x] Track when signals detected (phase, elapsed time, message ID)
- [x] `GET /api/sessions/:id/signals` endpoint
- [x] Integrated signal detection into AI response flow
- [x] Added to `test-api.sh` script

### 4. Red Flag Detection (Priority: MEDIUM) ✅ COMPLETE
- [x] Create `RedFlagService`
- [x] Implement detection logic:
  - [x] `went_too_deep_early` - implementation details in requirements phase (keyword detection)
  - [x] `skipped_requirements` - no requirement signals by minute 15
  - [x] `no_scale_mention` - no scale discussion by minute 20
  - [x] `poor_time_management` - still in problem phase at minute 10
  - [x] Plus `misunderstood_problem` placeholder for future use
- [x] Store red flags in `interview_red_flags` table
- [x] `GET /api/sessions/:id/red-flags` endpoint
- [x] Integrated red flag checks into AI response flow
- [x] Integrated red flag checks into phase transitions
- [x] Added to `test-api.sh` script

### 5. Time-Based Features (Priority: LOW)
- [ ] Auto-advance phases at key timestamps (optional)
- [ ] AI prompts that create pressure at phase boundaries
- [ ] Warning messages when time is running out
- [ ] Phase duration recommendations

### 6. Integration & Testing
- [x] Update `test-api.sh` with AI endpoints
- [x] Test complete interview flow with AI
- [x] Verify signals are detected correctly
- [x] Verify red flags are triggered

---

## Week 3: Feedback Generation

### Feedback Analysis
- [ ] Create `FeedbackService`
- [ ] Analyze detected signals
- [ ] Analyze red flags
- [ ] Calculate scores (0-100):
  - [ ] Overall score
  - [ ] Requirements score
  - [ ] Design score
  - [ ] Communication score
  - [ ] Time management score
  - [ ] Depth score

### Feedback Report Generation
- [ ] Generate structured feedback report
- [ ] Create feedback items (strengths, weaknesses, suggestions)
- [ ] Generate actionable next steps
- [ ] Store in `feedback_reports` table
- [ ] `POST /api/sessions/:id/feedback` endpoint
- [ ] `GET /api/sessions/:id/feedback` endpoint

### Communication Scoring
- [ ] Analyze message clarity
- [ ] Count clarifying questions
- [ ] Assess structured thinking
- [ ] Evaluate explanation quality

---

## Week 4-6: Auth, Payments, Polish

### Authentication
- [ ] Email + magic link auth
- [ ] User registration flow
- [ ] Session management
- [ ] Protected routes

### Payments (Stripe)
- [ ] Stripe integration
- [ ] Free tier: 1 interview
- [ ] Pro tier: unlimited interviews ($39-59/month)
- [ ] Pay-per-interview: $15/interview
- [ ] Usage tracking

### Frontend (React + Vite)
- [ ] Interview UI component
- [ ] Chat interface
- [ ] Timer component
- [ ] Phase progress indicator
- [ ] Whiteboard (basic canvas)
- [ ] Feedback display

### Landing Page
- [ ] Hero section
- [ ] Problem/solution explanation
- [ ] Pricing section
- [ ] Call to action

### Polish
- [ ] Onboarding flow
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design
- [ ] First user testing

---

## 🎯 Immediate Next Task (~1-2 hours)

**Feedback Generation - Score Calculation**

1. **Create FeedbackService (45 min)**
   - Create `src/feedback/services/feedback.service.ts`
   - Implement score calculation based on signals and red flags
   - Calculate 6 scores: overall, requirements, design, communication, time_management, depth
   - Scoring logic: signals add points, red flags subtract points

2. **Generate Feedback Report (45 min)**
   - Generate structured feedback based on session analysis
   - Create feedback items (strengths, weaknesses, suggestions)
   - Store feedback in `feedback_reports`, `feedback_items`, `feedback_next_steps` tables
   - Add `POST /api/sessions/:id/feedback` endpoint
   - Add `GET /api/sessions/:id/feedback` endpoint
   - Test feedback generation with completed interviews

**Deliverable:** Automatic feedback generation with actionable insights and scores after interview completion.

---

## 📊 Progress Summary

- **Week 1:** ✅ 100% Complete (Foundation + REST API)
- **Week 2:** ✅ 67% Complete (AI Integration + Prompt Engine + Signal Tracking + Red Flags done; Time-based features optional)
- **Week 3:** ⏳ 0% Complete (Feedback)
- **Week 4-6:** ⏳ 0% Complete (Auth + Payments + Polish)

**Overall MVP Progress:** ~28% (1.67 out of 6 weeks)
