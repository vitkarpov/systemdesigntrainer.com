# System Design Interview Simulator

**Practice real system design interviews under pressure — before the real one.**

A B2C SaaS platform that helps mid-to-senior software engineers prepare for system design interviews at top tech companies by simulating realistic 45-minute interview sessions with AI-powered interviewers.

## 🎯 The Problem

Most engineers fail system design interviews not because they lack technical knowledge, but because they:
- Panic under time pressure
- Don't know what to say at minute 15, 30, or 45
- Skip requirements gathering and jump straight to implementation
- Can't structure their answers effectively
- Get no actionable feedback from mock interviews

## 💡 The Solution

A realistic interview simulator that:
- **Applies Real Pressure**: 45-minute timed sessions with an AI interviewer that interrupts, challenges, and pushes you
- **Tracks What Matters**: Monitors if you covered requirements, discussed trade-offs, mentioned scale, and structured your approach
- **Gives Actionable Feedback**: Tells you exactly where you lost points and what to improve next time
- **Builds Confidence**: Practice 5-10 interviews before your real one, not just 1-2 expensive mock sessions

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
- **AI Interviewer**: Asks questions, applies pressure, interrupts at key moments
- **Simple Whiteboard**: Basic diagram editor for boxes, arrows, and labels
- **Signal Tracking**: Monitors requirements gathering, scale discussion, trade-offs
- **Structured Feedback**: Actionable report on what went wrong and how to improve
- **Timer & Pressure**: Visual timer with phase transitions at 15/30/40 minutes

### Interview Flow
1. **Problem Statement** (0-5 min)
2. **Requirements & Constraints** (5-15 min)
3. **High-Level Design** (15-25 min)
4. **Deep Dive** (25-40 min)
5. **Bottlenecks & Trade-offs** (40-45 min)
6. **Wrap-up & Feedback**

## 🏗️ Architecture

### Design Philosophy
- **State-Driven**: Interview state stored in backend, not in LLM
- **Flow > Intelligence**: Rigid interview flow with simple heuristics beats smart AI with no structure
- **Predictable & Debuggable**: Signals tracked by rules, not AI interpretation
- **One Case to Start**: Single well-designed case (URL shortener) to validate concept

### Tech Stack

**Backend (NestJS)**
- Interview Orchestrator: Manages phases and timing
- Prompt Engine: Generates context-aware AI prompts
- State Store: Tracks signals and red flags
- Feedback Generator: Produces structured reports

**Frontend (React + Vite)**
- Interview UI: Chat-based interview interface
- Whiteboard: Canvas-based diagram editor
- Timer: Visual countdown with phase indicators
- Feedback Display: Report viewer

**AI Layer**
- LLM: Interviewer persona (question generation, tone)
- Stateless: No memory, context provided by backend

**Database**
- InterviewSession: session state, transcript, signals
- User: authentication and billing
- FeedbackReport: generated feedback

### State Model

The core of the system is the `InterviewSession` state:

```typescript
InterviewSession {
  id: string
  startedAt: number
  currentPhase: "problem" | "requirements" | "high_level" | "deep_dive" | "bottlenecks" | "wrap_up"
  phaseStartedAt: number
  transcript: Array<{role, text, timestamp}>
  signals: {
    askedFunctionalReqs: boolean
    askedNonFunctionalReqs: boolean
    mentionedScale: boolean
    proposedApi: boolean
    discussedTradeoffs: boolean
  }
  redFlags: {
    wentTooDeepEarly: boolean
    skippedRequirements: boolean
  }
}
```

**Key Principle**: Signals are tracked by heuristics (keyword matching, timing rules), not AI interpretation. This makes the system predictable and debuggable.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies for all packages
npm install
cd backend && npm install
cd ../ui && npm install
```

### Development

**Run both servers:**
```bash
npm run dev
```

**Or run individually:**
```bash
# Terminal 1 - Backend (http://localhost:3000)
cd backend && npm run start:dev

# Terminal 2 - Frontend (http://localhost:5173)
cd ui && npm run dev
```

### Project Structure

```
sd-sim-2/
├── backend/              # NestJS API server
│   ├── src/
│   │   ├── interview/    # Interview orchestrator
│   │   ├── ai/          # LLM integration
│   │   └── feedback/    # Feedback generation
├── ui/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Interview, feedback pages
│   │   └── hooks/       # Custom hooks
├── shared/              # Shared TypeScript types
│   └── types/
└── README.md
```

## 🛠️ Development Progress

**Current Status:** Week 1 Complete ✅ → Week 2 Starting 🔄

- **Week 1:** Foundation & Core Flow (REST API, State Machine, Database) - ✅ COMPLETE
- **Week 2:** AI Interviewer & Signal Tracking - 🔄 NEXT
- **Week 3:** Feedback Generation
- **Week 4-6:** Auth, Payments, Polish

**See [TASKS.md](TASKS.md) for detailed progress tracking and next steps.**

**Test the API:** Run `./backend/test-api.sh` to see the working endpoints.

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
```

## 📊 Success Metrics (MVP)

- ≥30% of users complete 2+ interviews
- ≥10% convert to paid
- Users report: "This felt real"

## 💰 Business Model

- **Free**: 1 interview
- **Pro**: $39-59/month (unlimited interviews)
- **Pay-per-interview**: $15/interview

Target: 100-300 signups, 10-30 paying users in first 30 days

## 🤝 Contributing

This is an early-stage project. For now, development is focused on reaching MVP.

### Development Guidelines
- **Type Safety**: Always use TypeScript
- **Flow First**: Prioritize rigid interview flow over AI intelligence
- **Simple Heuristics**: Use keyword matching and timing rules, not AI interpretation
- **One Thing Well**: Focus on one interview case, one flow, one ICP

## 📄 License

This project is licensed under the MIT License.

---

**Built for engineers who know the concepts but need to master the interview format.**
