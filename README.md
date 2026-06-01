# System Design Interview Simulator

[![App CI](https://github.com/vitkarpov/systemdesigntrainer.com/actions/workflows/app-ci.yml/badge.svg)](https://github.com/vitkarpov/systemdesigntrainer.com/actions/workflows/app-ci.yml)
[![API CI](https://github.com/vitkarpov/systemdesigntrainer.com/actions/workflows/api-ci.yml/badge.svg)](https://github.com/vitkarpov/systemdesigntrainer.com/actions/workflows/api-ci.yml)

**Practice real system design interviews under pressure — before the real one.**

## 🔗 Links

- **Website**: [systemdesigntrainer.com](https://systemdesigntrainer.com)
- **App**: [app.systemdesigntrainer.com](https://app.systemdesigntrainer.com)
- **API**: [api.systemdesigntrainer.com](https://api.systemdesigntrainer.com)

A B2C SaaS platform that helps mid-to-senior software engineers prepare for system design interviews at top tech companies by simulating realistic 45-minute interview sessions with AI-powered interviewers.

## 🎯 The Problem

Most engineers fail system design interviews not because they lack technical knowledge, but because they:
- Panic under time pressure
- Don't know what to say at minute 15, 30, or 45
- Skip requirements gathering and jump straight to implementation
- Can't structure their answers effectively
- Get no actionable feedback from mock interviews

**Built for engineers who know the concepts but need to master the interview format.**

## 💡 The Solution

A realistic interview simulator that:
- **Enforces Real Pressure**: Automatic phase transitions force you to move on whether you're ready or not — just like real interviews
- **Rigid Time Constraints**: 5-15 minute limits per phase with forced transitions. No manual advancing. No second chances.
- **Tracks What Matters**: Monitors if you covered requirements, discussed trade-offs, mentioned scale, and structured your approach
- **Gives Actionable Feedback**: Tells you exactly where you lost points, which phases you ran out of time in, and what to improve
- **Builds Discipline**: Practice time management under pressure 5-10 times before your real interview

## 🎯 Target Users

**Mid → Senior Software Engineers** (5-8 years experience)
- Currently earning £60-90k, targeting £100-160k roles
- Preparing for FAANG/Big Tech interviews
- Strong technically but struggle with system design interviews
- Located in EU/UK or relocating to US
- Already spending money on courses, coaches, and mock interviews

## ✨ Core Features

### MVP (Week 1-6)
- **45-Minute Interview Simulation**: Fixed format covering all interview phases
- **AI Interviewer**: Asks questions, applies pressure, guides phase transitions naturally
- **Automatic Phase Transitions**: Background scheduler forces phase changes at time limits (checked every minute)
- **Simple Whiteboard**: Basic diagram editor for boxes, arrows, and labels
- **Signal Tracking**: Monitors requirements gathering, scale discussion, trade-offs
- **Phase Cutoff Tracking**: Records which phases you exceeded time limits in
- **Structured Feedback**: Actionable report including timing analysis and penalties for running out of time

### Interview Flow (Forced Time Limits)
1. **Problem Understanding** (0-5 min max) — Auto-advance at 5 minutes
2. **Requirements & Constraints** (5-15 min max) — Auto-advance at 10 minutes in phase
3. **High-Level Design** (15-25 min max) — Auto-advance at 10 minutes in phase
4. **Deep Dive** (25-40 min max) — Auto-advance at 15 minutes in phase
5. **Bottlenecks & Trade-offs** (40-45 min max) — Auto-advance at 5 minutes in phase
6. **Wrap-up** (45-50 min max) — Auto-complete at 5 minutes in phase

**Total Time**: ~50 minutes maximum with automatic enforcement

## 🏗️ Architecture

### Design Philosophy
- **State-Driven**: Interview state stored in backend, not in LLM
- **Flow > Intelligence**: Rigid interview flow with simple heuristics beats smart AI with no structure
- **Predictable & Debuggable**: Signals tracked by rules, not AI interpretation
- **One Case to Start**: Single well-designed case (URL shortener) to validate concept

### Tech Stack

**Backend (NestJS)**
- Interview Orchestrator: Manages phases and timing
- Phase Transition Scheduler: Background job (runs every minute) that auto-advances phases at time limits
- Prompt Engine: Generates context-aware AI prompts with phase transition handling
- State Store: Tracks signals, red flags, and phase cutoffs
- Feedback Generator: Produces structured reports with timing analysis

**Frontend (React + Vite)**
- Interview UI: Chat-based interview interface with real-time phase updates
- Whiteboard: Canvas-based diagram editor
- Timer Display: Visual countdown showing total and per-phase elapsed time
- Feedback Display: Report viewer with timing breakdown and penalties

**AI Layer**
- LLM: Interviewer persona (question generation, tone)
- Stateless: No memory, context provided by backend

**Database (PostgreSQL + Drizzle ORM)**
- InterviewSession: session state, current phase, phase start time
- TranscriptMessages: full conversation history with timestamps
- InterviewSignals: detected positive signals (requirements asked, scale mentioned, etc.)
- InterviewRedFlags: detected negative patterns (skipped requirements, went too deep early)
- InterviewPhaseCutoffs: phases that were force-transitioned due to time limits
- FeedbackReport: generated feedback with scores and timing analysis
- User: authentication and billing

### State Model

The core of the system is the `InterviewSession` state with normalized related data:

```typescript
InterviewSession {
  id: number
  userId: number
  caseId: number
  status: "not_started" | "in_progress" | "completed"
  currentPhase: "problem" | "requirements" | "high_level" | "deep_dive" | "bottlenecks" | "wrap_up"
  startedAt: Date
  phaseStartedAt: Date  // Reset on each phase transition
  completedAt: Date | null
}

// Separate tables for normalized data
InterviewSignal {
  sessionId: number
  signalName: "asked_functional_reqs" | "mentioned_scale" | ...
  detectedAt: Date
  phase: string
}

InterviewPhaseCutoff {
  sessionId: number
  phase: string
  cutoffAt: Date
  secondsElapsed: number
  exceededBySeconds: number  // How much over the limit
}
```

**Key Principles**:
- Signals are tracked by heuristics (keyword matching, timing rules), not AI interpretation
- Phase cutoffs stored separately for detailed timing analysis
- Background scheduler checks all active sessions every minute for forced transitions

### Project Structure

```
sd-sim-2/
├── api/                 # NestJS API server
│   ├── src/
│   │   ├── interview/   # Interview orchestrator
│   │   │   ├── services/          # Session, phase, signal services
│   │   │   ├── processors/        # Background job processors
│   │   │   └── controllers/       # API endpoints
│   │   ├── ai/          # LLM integration
│   │   └── feedback/    # Feedback generation
├── app/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Interview, feedback pages
│   │   └── hooks/       # Custom hooks
├── website/             # Astro website (landing + SEO pages)
│   └── src/
└── README.md
```

### Phase Transition System

**Automatic Enforcement**: The system uses a background scheduler (Bull queue) that runs every minute to enforce time limits:

1. **Scheduler Check** (every 60 seconds)
   - Queries all `in_progress` sessions
   - Calculates phase elapsed time for each
   - Compares against `maximumTimeSeconds` from phase config

2. **Force Transition** (when time exceeded)
   - Records phase cutoff event in `interview_phase_cutoffs` table
   - Updates session to next phase
   - Adds system message: "⏱️ Time's up for [Phase]. Moving to [Next Phase]."
   - AI acknowledges transition naturally in next response

3. **Feedback Impact**
   - -5 points per force-transitioned phase on Time Management score
   - Specific feedback: "You ran out of time in Requirements Gathering"
   - Actionable suggestions: "Practice with a timer at phase boundaries"

**No Manual Control**: Users cannot advance phases manually. The only manual control is "End Interview" to complete early.