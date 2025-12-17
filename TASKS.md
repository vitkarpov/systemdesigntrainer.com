# Development Tasks & Progress

**Last Updated:** 2025-12-17

## 📍 Current Status: Week 3 - Feedback Generation Complete

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

## Week 3: Feedback Generation ✅ COMPLETE

### Feedback Analysis ✅ COMPLETE
- [x] Create `FeedbackService`
- [x] Analyze detected signals
- [x] Analyze red flags
- [x] Calculate scores (0-100):
  - [x] Overall score (weighted average of all scores)
  - [x] Requirements score (based on requirement signals)
  - [x] Design score (based on design signals and diagrams)
  - [x] Communication score (based on structured approach and clarity)
  - [x] Time management score (based on phase timing)
  - [x] Depth score (based on scale discussion and bottlenecks)

### Feedback Report Generation ✅ COMPLETE
- [x] Generate structured feedback report
- [x] Create feedback items (strengths, weaknesses, suggestions)
- [x] Generate actionable next steps
- [x] Store in `feedback_reports`, `feedback_items`, `feedback_next_steps` tables
- [x] `POST /api/sessions/:id/feedback` endpoint
- [x] `GET /api/sessions/:id/feedback` endpoint
- [x] Added to `test-api.sh` script

### Scoring Logic Implemented
- [x] Requirements: +15 for functional reqs, +15 for non-functional, +10 for constraints, -30 for skipping
- [x] Design: +15 for diagrams, +15 for data model, +10 for API, +10 for bottlenecks
- [x] Communication: +15 for structure, +15 for tradeoffs, +10 for questions
- [x] Time Management: Base 70, -40 for poor management, +10 for completion
- [x] Depth: +15 for scale, +15 for bottlenecks, +10 for tradeoffs, +10 for data model
- [x] Overall: Weighted average (requirements 25%, design 25%, communication 20%, time 15%, depth 15%)

---

## Week 4-6: Auth, Payments, Polish

### Authentication (WorkOS)
- [ ] WorkOS integration setup
- [ ] GitHub OAuth configuration via WorkOS
- [ ] User registration flow with WorkOS
- [ ] Session management with JWT
- [ ] Protected routes
- [ ] User profile sync (GitHub -> Database)

### Payments (Stripe)
- [ ] Stripe integration
- [ ] Free tier: 1 interview
- [ ] Pro tier: unlimited interviews ($39-59/month)
- [ ] Pay-per-interview: $15/interview
- [ ] Usage tracking

### Frontend (React + Vite) ✅ COMPLETE
- [x] Interview UI component
- [x] Chat interface
- [x] Timer component
- [x] Phase progress indicator
- [x] Feedback display
- [x] Home page with start interview
- [x] Tailwind CSS + Shadcn/ui setup
- [x] React Router navigation
- [x] API client integration
- [ ] Whiteboard (basic canvas) - deferred

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

## 🎯 Immediate Next Task

**Frontend Complete - Next: Authentication & User Management**

The core interview functionality is now complete with a working React frontend! The next priority is adding user authentication:

1. **Authentication System (WorkOS)**
   - WorkOS AuthKit integration
   - GitHub OAuth login via WorkOS
   - User registration and login flow
   - Session management with JWT
   - Protected routes

2. **User Dashboard**
   - View past interviews
   - Track progress over time
   - Access feedback history

**Recently Completed:**
- ✅ Full interview UI with chat interface
- ✅ Real-time timer and phase tracking
- ✅ Comprehensive feedback display with scores
- ✅ Tailwind CSS + Shadcn/ui components
- ✅ Complete API integration

---

## 📊 Progress Summary

- **Week 1:** ✅ 100% Complete (Foundation + REST API)
- **Week 2:** ✅ 100% Complete (AI Integration + Prompt Engine + Signal Tracking + Red Flags)
- **Week 3:** ✅ 100% Complete (Feedback Generation with scoring and recommendations)
- **Week 4:** ✅ 90% Complete (Frontend - Interview UI, Feedback Display; Auth pending)

**Overall MVP Progress:** ~75% (Core interview functionality complete)

**Status:**
- ✅ Backend API: All 15 endpoints working and tested
- ✅ Frontend: Full interview flow with React + Tailwind + Shadcn/ui
- ⏳ Auth: Not started
- ⏳ Payments: Not started
