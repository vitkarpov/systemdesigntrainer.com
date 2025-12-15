# Development Tasks & Progress

**Last Updated:** 2025-12-15

## 📍 Current Status: Week 1 Complete → Week 2 Starting

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

### 3. Signal Tracking Heuristics (Priority: MEDIUM)
- [ ] Create `SignalService`
- [ ] Implement keyword detection for signals:
  - [ ] `asked_functional_reqs` - "requirements", "features", "users need"
  - [ ] `asked_non_functional_reqs` - "scale", "performance", "availability"
  - [ ] `mentioned_scale` - "million users", "requests per second"
  - [ ] `proposed_api` - "API", "endpoint", "REST", "GraphQL"
  - [ ] `discussed_tradeoffs` - "trade-off", "vs", "alternatively"
- [ ] Store detected signals in `interview_signals` table
- [ ] Track when signals detected (phase, elapsed time, message ID)
- [ ] `GET /api/sessions/:id/signals` endpoint

### 4. Red Flag Detection (Priority: MEDIUM)
- [ ] Create `RedFlagService`
- [ ] Implement detection logic:
  - [ ] `went_too_deep_early` - implementation details in requirements phase
  - [ ] `skipped_requirements` - no requirement signals by minute 15
  - [ ] `no_scale_mention` - no scale discussion by minute 20
  - [ ] `poor_time_management` - still in problem phase at minute 10
- [ ] Store red flags in `interview_red_flags` table
- [ ] `GET /api/sessions/:id/red-flags` endpoint

### 5. Time-Based Features (Priority: LOW)
- [ ] Auto-advance phases at key timestamps (optional)
- [ ] AI prompts that create pressure at phase boundaries
- [ ] Warning messages when time is running out
- [ ] Phase duration recommendations

### 6. Integration & Testing
- [ ] Update `test-api.sh` with AI endpoints
- [ ] Test complete interview flow with AI
- [ ] Verify signals are detected correctly
- [ ] Verify red flags are triggered

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

## 🎯 Immediate Next Task (~1 hour)

**Signal Tracking Implementation**

1. **Create SignalService (30 min)**
   - Create `src/interview/services/signal.service.ts`
   - Implement keyword detection for key signals
   - Store detected signals in `interview_signals` table
   - Track timing and context of signal detection

2. **Integrate with AI Response (30 min)**
   - Hook signal detection into `/api/sessions/:id/ai-response` endpoint
   - Automatically detect signals in candidate messages
   - Add `GET /api/sessions/:id/signals` endpoint
   - Test signal detection with mock interviews

**Deliverable:** Automatic signal detection during interviews that tracks when candidates mention requirements, scale, trade-offs, etc.

---

## 📊 Progress Summary

- **Week 1:** ✅ 100% Complete (Foundation + REST API)
- **Week 2:** ✅ 33% Complete (AI Integration + Prompt Engine done; Signals, Red Flags, Time-based features remaining)
- **Week 3:** ⏳ 0% Complete (Feedback)
- **Week 4-6:** ⏳ 0% Complete (Auth + Payments + Polish)

**Overall MVP Progress:** ~22% (1.3 out of 6 weeks)
