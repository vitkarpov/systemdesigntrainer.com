# RFC: AI-Powered Interview Feedback Generation

**Status**: Draft
**Author**: Viktor Karpov
**Created**: 2026-01-10
**Last Updated**: 2026-01-10

---

## Executive Summary

This RFC proposes replacing the current rule-based feedback system with an AI-powered feedback generation system that produces realistic, detailed, and actionable interview feedback. The new system will generate written feedback that mirrors what a real interviewer would send to a hiring committee, including a hire/no-hire recommendation, detailed performance analysis, and concrete improvement suggestions.

**Key Benefits**:
- More realistic interview experience
- Actionable, personalized feedback based on actual conversation content
- Detailed written evaluations that help candidates improve
- Hire/no-hire verdicts with justification
- Better alignment with real-world interview feedback

---

## Problem Statement

### Current Limitations

The existing feedback system has significant limitations:

1. **Generic and Templated**: Feedback items are predefined templates that trigger based on signal presence/absence. All users who miss the same signal get identical feedback.

2. **Lacks Context**: The system doesn't analyze what the candidate actually said, only whether certain keywords were present. A candidate could ask "What are the functional requirements?" and get credit, even if they didn't follow up meaningfully.

3. **Not Representative of Real Interviews**: Real interviewers write nuanced feedback that references specific moments in the conversation, discusses the candidate's thought process, and provides detailed reasoning for their hire/no-hire decision.

4. **Limited Actionability**: Generic suggestions like "Practice asking clarifying questions" don't help candidates understand specifically what they did wrong or how to improve.

5. **No Hire/No-Hire Decision**: The current system only provides scores. Real interview feedback includes a clear recommendation with justification.

### User Pain Points

Based on the current implementation analysis:

- Users receive feedback like "Great job gathering requirements" even if their requirements gathering was superficial
- Identical feedback for different interview performances (if same signals triggered)
- No specific examples or references to what they said during the interview
- Unclear how their performance translates to real interview outcomes
- Difficult to prioritize improvement areas

---

## Goals & Non-Goals

### Goals

1. **Generate realistic written feedback** that resembles what a senior engineer/hiring manager would write after a real interview
2. **Include hire/no-hire verdict** with clear justification based on company standards (FAANG vs non-FAANG)
3. **Provide specific, actionable feedback** that references actual moments from the conversation
4. **Maintain dimensional scoring** (requirements, design, communication, time management, depth) but enhance the narrative explanation
5. **Scale to handle growing user base** without manual review
6. **Preserve existing signal/red flag detection** as input signals for AI generation

### Non-Goals

1. **Not replacing the scoring system entirely** - dimensional scores remain as structured data
2. **Not removing signal/red flag detection** - these remain valuable structured signals
3. **Not providing real-time feedback during the interview** - generation happens post-interview
4. **Not personalizing based on user history** (v1) - feedback based solely on current session
5. **Not supporting multi-session learning** (v1) - each interview evaluated independently

---

## Current State Analysis

### Existing Feedback Generation Flow

```
Interview Completion
    ↓
POST /sessions/:id/feedback
    ↓
Queue feedback generation job (Bull)
    ↓
FeedbackProcessor.generateFeedback()
    ↓
FeedbackService.calculateScores()
    → Load signals and red flags
    → Apply BASE_SCORES + SIGNAL_SCORING - RED_FLAG_SCORING
    → Calculate weighted overall score
    ↓
FeedbackService.generateFeedbackItems()
    → Map signals → strength items (predefined templates)
    → Map red flags → weakness items (predefined templates)
    → Generate suggestions based on missing signals
    ↓
FeedbackService.generateNextSteps()
    → Identify weakest dimension
    → Return prioritized improvement suggestions (predefined templates)
    ↓
FeedbackService.generateOverallSummary()
    → Map score range to summary text:
        85+: "Excellent performance"
        70-85: "Good performance"
        55-70: "Decent attempt"
        <55: "Significant gaps"
    ↓
Store in database:
    - feedbackReports (scores + overallSummary)
    - feedbackItems (strengths, weaknesses, suggestions)
    - feedbackNextSteps (improvement priorities)
```

### Available Input Data

When generating feedback, we have access to:

1. **Structured Signals** (11 types):
   - ASKED_FUNCTIONAL_REQS, ASKED_NON_FUNCTIONAL_REQS
   - CLARIFIED_CONSTRAINTS, MENTIONED_SCALE
   - PROPOSED_API, DREW_HIGH_LEVEL_DIAGRAM
   - DISCUSSED_DATA_MODEL, ADDRESSED_BOTTLENECKS
   - DISCUSSED_TRADEOFFS, STRUCTURED_APPROACH
   - ASKED_CLARIFYING_QUESTIONS

2. **Red Flags** (5 types):
   - WENT_TOO_DEEP_EARLY, SKIPPED_REQUIREMENTS
   - NO_SCALE_MENTION, POOR_TIME_MANAGEMENT
   - MISUNDERSTOOD_PROBLEM

3. **Full Interview Transcript**:
   - All candidate and interviewer messages
   - Phase information for each message
   - Timestamps and seconds elapsed

4. **Interview Metadata**:
   - Company style (FAANG, non-FAANG, etc.)
   - Engineer level (junior, mid, senior)
   - Interview case (problem statement)
   - Session duration and phase progression

5. **Diagram Data** (if available):
   - Nodes, edges, annotations
   - Visual representation of their design

6. **Calculated Scores**:
   - Overall, requirements, design, communication, time management, depth

---

## Proposed Solution

### High-Level Approach

Replace the rule-based feedback generation with an AI-powered system that:

1. **Analyzes the full interview transcript** to understand what the candidate actually discussed
2. **Considers signals and red flags** as structured input signals (not sole determinants)
3. **Generates written feedback** in the style of a senior engineer's hiring committee feedback
4. **Includes a hire/no-hire recommendation** with justification
5. **Provides specific examples** from the conversation to illustrate strengths and weaknesses
6. **Offers actionable improvement suggestions** tailored to their specific performance

### Feedback Structure

The AI-generated feedback will follow a standardized structure commonly used in tech interviews:

```
1. RECOMMENDATION: [STRONG HIRE | HIRE | MAYBE | NO HIRE | STRONG NO HIRE]

2. OVERALL ASSESSMENT (2-3 paragraphs)
   - Summary of performance
   - Key strengths and weaknesses
   - How performance compares to hiring bar for level/company

3. DIMENSIONAL BREAKDOWN

   Requirements Gathering (Score: X/100)
   - What they did well
   - What they missed
   - Specific examples from conversation

   System Design (Score: X/100)
   - Design quality and completeness
   - Trade-offs discussed
   - Specific examples

   Communication (Score: X/100)
   - Clarity and structure
   - Collaboration with interviewer
   - Specific examples

   Time Management (Score: X/100)
   - Pacing through phases
   - Areas where too much/little time spent

   Technical Depth (Score: X/100)
   - Depth of technical discussion
   - Understanding of scale and trade-offs
   - Specific examples

4. KEY STRENGTHS (3-5 bullets)
   - Specific things they did well with examples

5. AREAS FOR IMPROVEMENT (3-5 bullets)
   - Specific weaknesses with examples
   - Why these matter in real interviews

6. RECOMMENDED NEXT STEPS (3-5 bullets)
   - Concrete actions to improve
   - Prioritized by impact

7. EXAMPLE IMPROVEMENTS
   - 2-3 specific examples of what they should have said/done
```

### Example Output

**Before (Current System)**:
```
Overall Score: 72/100
Overall Summary: "Good performance with room for improvement."

Strengths:
- Great job gathering both functional and non-functional requirements upfront
- You discussed trade-offs between different approaches

Weaknesses:
- You didn't discuss scale or provide concrete numbers
- You went into implementation details too early

Next Steps:
1. Practice mentioning scale and concrete numbers early
2. Focus on high-level design before diving deep
```

**After (AI-Generated)**:
```
RECOMMENDATION: HIRE (Borderline)

OVERALL ASSESSMENT:

The candidate demonstrated solid fundamentals in system design but showed some gaps in scale considerations and pacing. They started strong by asking about both functional requirements ("What features do users need?") and non-functional requirements ("How many users are we expecting?"). Their high-level design was reasonable, proposing a REST API with a PostgreSQL database and Redis cache.

However, the candidate struggled with concrete scale calculations. When discussing the database, they mentioned "we'll need to handle a lot of users" without quantifying what "a lot" means or calculating storage requirements. They also spent 18 minutes in the requirements phase, leaving insufficient time for bottleneck analysis. Despite these issues, their communication was clear and they actively collaborated with the interviewer.

For a mid-level engineer role at a non-FAANG company, this performance is acceptable but borderline. At a FAANG company, the lack of detailed scale analysis would be more concerning.

---

DIMENSIONAL BREAKDOWN:

Requirements Gathering (75/100):
The candidate did well asking about core functionality and user expectations. Early in the interview (around 3:45), they asked "What are the key features users need?" and followed up with "What about non-functional requirements like availability?" This showed good structure.

However, they missed important constraints. They never asked about existing infrastructure, budget limitations, or team size—questions that often matter in real-world system design. When the interviewer mentioned "millions of users," they didn't probe for more specifics (millions per day? Per month? Active users?).

System Design (68/100):
Their high-level design was reasonable: API Gateway → Application Servers → Database + Cache. They proposed a sensible data model with users, posts, and comments tables. The decision to use PostgreSQL for relational data and Redis for caching showed appropriate technology choices.

The weakness was in justification. They said "we'll use Redis for caching" but didn't explain what to cache, cache invalidation strategy, or TTL considerations. When asked about the database, they didn't discuss indexing, partitioning, or read replicas—all important for scale. They also didn't draw a diagram, which would have helped communicate their design more clearly.

Communication (78/100):
The candidate communicated clearly and structured their approach well. They explicitly stated "Let me start by understanding the requirements" and transitioned between phases deliberately. They asked clarifying questions when uncertain and acknowledged gaps in their knowledge ("I'm not sure about the best caching strategy here").

Their collaboration with the interviewer was good but could be stronger. They sometimes went silent for 30-40 seconds without verbalizing their thought process, making it hard for the interviewer to help guide them.

Time Management (58/100):
This was the weakest area. The candidate spent 18 minutes on requirements gathering, which is too long for a 45-minute interview. By the time they reached bottleneck discussion, only 8 minutes remained, forcing them to rush through scale considerations.

A better approach would be: 5-7 minutes for requirements, 15-20 minutes for high-level design, 10-15 minutes for deep dive and bottlenecks. They need to be more aware of time and comfortable moving forward even with incomplete information.

Technical Depth (64/100):
The candidate showed decent technical knowledge but lacked depth in critical areas. They mentioned "we'll need to handle millions of users" but never calculated:
- QPS (queries per second)
- Storage requirements (users × data per user)
- Bandwidth needs
- Database capacity planning

When discussing bottlenecks, they identified "the database could be a bottleneck" but didn't propose concrete solutions like read replicas, sharding, or CQRS. They also didn't discuss monitoring, observability, or how to detect when the system is struggling.

---

KEY STRENGTHS:

1. Strong requirements gathering: Asked about both functional and non-functional requirements early, showing good interview structure
2. Clear communication: Explained their thought process and transitioned between phases explicitly
3. Reasonable technology choices: PostgreSQL for relational data and Redis for caching are appropriate
4. Self-awareness: Acknowledged when they were uncertain and asked for guidance

---

AREAS FOR IMPROVEMENT:

1. Scale calculations: Never quantified scale with concrete numbers (QPS, storage, bandwidth). In real interviews, saying "millions of users" without calculations is a red flag
2. Time management: Spent too long on requirements (18 minutes), leaving insufficient time for bottlenecks and deep dive
3. Solution depth: Identified problems (e.g., "database bottleneck") without proposing concrete solutions (sharding, replication, etc.)
4. Visual communication: Didn't draw a diagram, which would have made their design clearer and helped identify gaps
5. Trade-off analysis: Rarely discussed trade-offs (e.g., why PostgreSQL over MongoDB? Why not use a CDN?)

---

RECOMMENDED NEXT STEPS:

1. Practice back-of-the-envelope calculations: For every design, calculate QPS, storage, and bandwidth. Use round numbers (1M users, 100 bytes per record) to make math easy. This is non-negotiable for senior roles.

2. Time-box interview phases: Set mental timers (requirements: 7 min, high-level: 20 min, deep dive: 15 min). Practice moving forward with incomplete information. Perfectionism kills system design interviews.

3. Study common bottlenecks and solutions: Learn standard patterns for database scaling (replication, sharding, partitioning), caching strategies (cache-aside, write-through), and load balancing. You should have 2-3 solutions ready for each common bottleneck.

4. Always draw diagrams: Even simple boxes-and-arrows diagrams help. They force you to think through data flow and help interviewers follow your logic.

5. Verbalize trade-offs: For every major decision (database choice, caching strategy, etc.), state at least one alternative and explain why you chose your approach. This shows depth of thinking.

---

EXAMPLE IMPROVEMENTS:

1. When discussing scale, you should have said:
   "We have 10 million users, let's assume 10% are active daily. That's 1 million DAU. If each user makes 10 requests per day on average, that's 10 million requests/day or about 116 QPS. We should plan for 3x peak traffic, so 350 QPS. A single PostgreSQL instance can handle that, but we'll want read replicas for redundancy."

2. When identifying database as bottleneck, you should have said:
   "The database could bottleneck at scale. Three approaches: (1) Read replicas for read-heavy workloads, (2) Horizontal sharding by user_id if writes are the issue, (3) CQRS with separate read/write databases. I'd start with read replicas since they're simpler and cover 80% of cases."

3. Instead of spending 18 minutes on requirements, you should have said around minute 7:
   "I think I have enough context on requirements. Let me move to high-level design and we can clarify details as needed."
```

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Interview Completion                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │  POST /sessions/:id/feedback       │
        │  (SessionsController)              │
        └────────────────┬───────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │  Queue "feedback-generation" job   │
        │  (Bull Queue)                      │
        └────────────────┬───────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │  FeedbackProcessor                 │
        │  (Background Worker)               │
        └────────────────┬───────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │  FeedbackGenerationService         │
        │  (New Service)                     │
        └────────────────┬───────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ↓                               ↓
┌─────────────────┐           ┌──────────────────┐
│ Calculate       │           │ Prepare AI       │
│ Scores          │           │ Prompt           │
│ (existing logic)│           │ (new)            │
└────────┬────────┘           └────────┬─────────┘
         │                             │
         │                             ↓
         │              ┌──────────────────────────┐
         │              │ AiService.generateFeedback│
         │              │ (Claude API)              │
         │              └────────┬─────────────────┘
         │                       │
         │                       ↓
         │              ┌──────────────────────────┐
         │              │ Parse AI Response        │
         │              │ (Extract sections)       │
         │              └────────┬─────────────────┘
         │                       │
         └───────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │  Store in Database                 │
        │  - feedbackReports                 │
        │  - feedbackSections (new table)    │
        └────────────────────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │  Return Success                    │
        └────────────────────────────────────┘
```

### New Service: FeedbackGenerationService

```typescript
// api/src/interview/services/feedback-generation.service.ts

@Injectable()
export class FeedbackGenerationService {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly aiService: AiService,
    private readonly transcriptService: TranscriptService,
    private readonly signalService: SignalService,
    private readonly redFlagService: RedFlagService,
    private readonly diagramService: DiagramService,
    private readonly interviewSessionService: InterviewSessionService,
  ) {}

  async generateAiFeedback(sessionId: number): Promise<FeedbackReport> {
    // 1. Load all necessary data
    const session = await this.interviewSessionService.findById(sessionId);
    const signals = await this.signalService.getSignalsBySession(sessionId);
    const redFlags = await this.redFlagService.getRedFlagsBySession(sessionId);
    const transcript = await this.transcriptService.getFullTranscript(sessionId);
    const diagram = await this.diagramService.getDiagramData(sessionId);
    const interviewCase = await this.interviewSessionService.getInterviewCase(session.caseId);

    // 2. Calculate scores (existing logic)
    const scores = await this.feedbackService.calculateScores(sessionId);

    // 3. Prepare AI prompt
    const prompt = this.buildFeedbackPrompt({
      session,
      interviewCase,
      transcript,
      signals,
      redFlags,
      diagram,
      scores,
    });

    // 4. Generate feedback using AI
    const aiFeedback = await this.aiService.generateFeedback(prompt);

    // 5. Parse and validate AI response
    const parsedFeedback = this.parseFeedbackResponse(aiFeedback);

    // 6. Store in database
    const feedbackReport = await this.saveFeedback({
      sessionId,
      scores,
      parsedFeedback,
    });

    return feedbackReport;
  }

  private buildFeedbackPrompt(data: FeedbackPromptData): string {
    // Detailed prompt construction (see Prompt Engineering section)
  }

  private parseFeedbackResponse(response: string): ParsedFeedback {
    // Extract recommendation, assessment, dimensional breakdown, etc.
  }
}
```

---

## Data Model Changes

### New Table: feedback_sections

Stores the AI-generated feedback sections for flexible rendering.

```typescript
// api/db/schema/feedback.schema.ts

export const feedbackSections = pgTable('feedback_sections', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => feedbackReports.id, { onDelete: 'cascade' }),
  sectionType: varchar('section_type', { length: 50 }).notNull(),
  // Values: 'recommendation', 'overall_assessment', 'dimensional_breakdown',
  //         'key_strengths', 'areas_for_improvement', 'next_steps', 'examples'
  dimension: varchar('dimension', { length: 50 }), // For dimensional_breakdown
  // Values: 'requirements', 'design', 'communication', 'time_management', 'depth'
  content: text('content').notNull(),
  displayOrder: integer('display_order').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Modified Table: feedback_reports

Add new fields for AI-generated content.

```typescript
export const feedbackReports = pgTable('feedback_reports', {
  // ... existing fields (id, sessionId, scores, createdAt)

  // NEW FIELDS
  recommendation: varchar('recommendation', { length: 50 }),
  // Values: 'strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'

  overallAssessment: text('overall_assessment'), // AI-generated summary (2-3 paragraphs)

  generationMethod: varchar('generation_method', { length: 20 }).notNull().default('rule_based'),
  // Values: 'rule_based', 'ai_generated'

  aiModel: varchar('ai_model', { length: 50 }), // e.g., 'claude-opus-4-5'

  generationDurationMs: integer('generation_duration_ms'), // For monitoring

  overallSummary: text('overall_summary'), // DEPRECATED (keep for backward compatibility)
});
```

### Backward Compatibility

- Keep `feedbackItems` and `feedbackNextSteps` tables for backward compatibility
- Frontend can detect `generationMethod` and render accordingly
- Gradual migration: Rule-based → AI-generated over time

---

## API Design

### Existing Endpoint (No Changes)

```
POST /api/sessions/:id/feedback
```

Behavior:
- Queues feedback generation job
- Returns immediately with 202 Accepted
- Frontend polls GET /api/sessions/:id/feedback for completion

### New Internal Method

```typescript
// api/src/interview/services/feedback-generation.service.ts

async generateAiFeedback(sessionId: number): Promise<FeedbackReport>
```

Called by `FeedbackProcessor` instead of the old rule-based method.

### Frontend Changes (Minimal)

The feedback display component should detect `generationMethod`:

```typescript
// app/src/pages/Feedback/Feedback.tsx

if (feedbackReport.generationMethod === 'ai_generated') {
  return <AiGeneratedFeedback report={feedbackReport} />;
} else {
  return <RuleBasedFeedback report={feedbackReport} />; // Legacy
}
```

---

## Prompt Engineering Strategy

### Prompt Structure

The AI prompt will be carefully structured to produce consistent, high-quality feedback.

```typescript
const FEEDBACK_GENERATION_PROMPT = `
You are a senior software engineer conducting system design interviews at a ${companyStyle} company.
You just completed a ${session.level}-level interview for the following problem:

INTERVIEW PROBLEM:
${interviewCase.description}

The interview lasted ${sessionDurationMinutes} minutes and progressed through these phases:
${phaseTimeline}

CANDIDATE TRANSCRIPT:
${formattedTranscript}

DETECTED SIGNALS (positive indicators):
${signalsSummary}

DETECTED RED FLAGS (negative indicators):
${redFlagsSummary}

${diagramData ? `CANDIDATE'S DIAGRAM:\n${diagramDescription}` : 'The candidate did not create a diagram.'}

CALCULATED SCORES:
- Requirements: ${scores.requirements}/100
- Design: ${scores.design}/100
- Communication: ${scores.communication}/100
- Time Management: ${scores.timeManagement}/100
- Technical Depth: ${scores.depth}/100
- Overall: ${scores.overall}/100

---

Your task is to write detailed interview feedback as you would for a hiring committee. Your feedback should:

1. Reference specific moments from the conversation (quote the candidate when relevant)
2. Explain WHY certain things matter (not just list what they did/didn't do)
3. Provide actionable, concrete suggestions for improvement
4. Include a hire/no-hire recommendation with clear justification
5. Be honest but constructive in tone

Use this exact structure:

RECOMMENDATION: [STRONG HIRE | HIRE | MAYBE | NO HIRE | STRONG NO HIRE]

OVERALL ASSESSMENT:
[2-3 paragraphs summarizing performance, key strengths/weaknesses, and how it compares to the hiring bar for a ${session.level} engineer at a ${companyStyle} company]

---

DIMENSIONAL BREAKDOWN:

Requirements Gathering (${scores.requirements}/100):
[2-3 paragraphs with specific examples from the conversation]

System Design (${scores.design}/100):
[2-3 paragraphs with specific examples]

Communication (${scores.communication}/100):
[2-3 paragraphs with specific examples]

Time Management (${scores.timeManagement}/100):
[2-3 paragraphs explaining pacing issues with timestamps]

Technical Depth (${scores.depth}/100):
[2-3 paragraphs with specific examples of depth/lack thereof]

---

KEY STRENGTHS:
1. [Specific strength with example]
2. [Specific strength with example]
3. [Specific strength with example]
[... up to 5 bullets]

---

AREAS FOR IMPROVEMENT:
1. [Specific weakness with example and why it matters]
2. [Specific weakness with example and why it matters]
3. [Specific weakness with example and why it matters]
[... up to 5 bullets]

---

RECOMMENDED NEXT STEPS:
1. [Concrete action with explanation]
2. [Concrete action with explanation]
3. [Concrete action with explanation]
[... up to 5 bullets]

---

EXAMPLE IMPROVEMENTS:
1. [Specific example of what they should have said/done]
2. [Specific example of what they should have said/done]
3. [Specific example of what they should have said/done]

---

IMPORTANT GUIDELINES:
- Be specific: Reference actual quotes and moments from the interview
- Be balanced: Acknowledge strengths even when recommending "no hire"
- Be actionable: Generic advice like "practice more" is not helpful
- Be honest: Don't sugarcoat significant gaps
- Be constructive: Frame weaknesses as learning opportunities
- Adjust expectations for level: ${session.level} engineers have different expectations
- Consider company style: ${companyStyle} companies have different bars and priorities
`;
```

### Prompt Components

1. **Context Setting**:
   - Company style (FAANG vs non-FAANG)
   - Engineer level (junior, mid, senior)
   - Interview problem description

2. **Candidate Performance Data**:
   - Full transcript with timestamps
   - Phase progression timeline
   - Signals and red flags detected
   - Diagram data (if available)
   - Calculated dimensional scores

3. **Output Structure**:
   - Exact format specification
   - Required sections with descriptions
   - Tone guidance (specific, balanced, actionable)

4. **Few-Shot Examples** (optional):
   - 1-2 example feedback reports
   - Shows desired level of detail
   - Demonstrates good vs bad feedback

### Handling Different Levels and Company Styles

The prompt dynamically adjusts expectations:

```typescript
const LEVEL_EXPECTATIONS = {
  junior: {
    requirements: 'Should ask basic questions about features and scale',
    design: 'Should propose a reasonable high-level architecture',
    depth: 'Not expected to know advanced patterns, but should understand basics',
  },
  mid: {
    requirements: 'Should gather comprehensive requirements including constraints',
    design: 'Should design scalable systems with appropriate technology choices',
    depth: 'Should discuss common scaling patterns and trade-offs',
  },
  senior: {
    requirements: 'Should ask insightful questions that reveal hidden complexities',
    design: 'Should design systems that handle scale, failure modes, and evolution',
    depth: 'Should demonstrate deep expertise in distributed systems and trade-offs',
  },
};

const COMPANY_STYLE_BARS = {
  faang: {
    bar: 'very high',
    scaleEmphasis: 'Strong emphasis on handling massive scale (millions to billions of users)',
    depthEmphasis: 'Deep technical discussions expected, including advanced patterns',
  },
  non_faang: {
    bar: 'moderate to high',
    scaleEmphasis: 'Scale discussions important but not as extreme (thousands to millions of users)',
    depthEmphasis: 'Practical engineering skills valued over theoretical depth',
  },
};
```

These are injected into the prompt to calibrate feedback appropriately.

---

## Quality & Safety Considerations

### 1. Output Validation

AI-generated content must be validated before storage:

```typescript
interface FeedbackValidation {
  hasRecommendation: boolean;
  hasOverallAssessment: boolean;
  hasDimensionalBreakdown: boolean;
  hasAllDimensions: boolean; // requirements, design, communication, time, depth
  hasKeyStrengths: boolean;
  hasAreasForImprovement: boolean;
  hasNextSteps: boolean;
  hasExamples: boolean;
  meetsMinimumLength: boolean; // e.g., overall assessment > 200 chars
  meetsMaximumLength: boolean; // e.g., total feedback < 10,000 chars
}
```

If validation fails:
- Log error with session ID and validation failures
- Fall back to rule-based feedback
- Alert engineering team for prompt refinement

### 2. Toxicity and Bias Filtering

Prevent harmful or biased feedback:

```typescript
const PROHIBITED_CONTENT = [
  'stupid', 'dumb', 'idiot', 'incompetent',
  'too old', 'too young', 'cultural fit',
  // ... extensive list
];

function validateFeedbackTone(feedback: string): boolean {
  // Check for prohibited language
  // Check for overly harsh tone
  // Check for discriminatory language
  return isValid;
}
```

If toxic content detected:
- Regenerate with additional tone constraints
- If regeneration fails, fall back to rule-based

### 3. Cost Management

Claude API usage can be expensive at scale:

```typescript
// Estimate: 45-min interview = ~15K tokens transcript
// + prompt overhead = ~20K input tokens
// + generated feedback = ~3K output tokens
// Cost per feedback (Claude Opus): $0.30-0.50

// Mitigation strategies:
const COST_CONTROLS = {
  maxInputTokens: 25000, // Truncate transcript if needed
  maxOutputTokens: 4000,
  model: 'claude-haiku-4-5', // Start with cheaper model
  // Upgrade to claude-opus-4-5 only for premium users (future)
};
```

### 4. Latency Management

Feedback generation should complete within reasonable time:

```typescript
const GENERATION_CONFIG = {
  timeout: 60000, // 60 seconds max
  retries: 2, // Retry on timeout or server errors
  fallbackToRuleBased: true, // If all retries fail
};
```

### 5. A/B Testing

Gradual rollout with quality monitoring:

```typescript
// Phase 1: 10% of users get AI feedback
// Phase 2: If quality metrics good, increase to 50%
// Phase 3: Full rollout

const AI_FEEDBACK_ROLLOUT_PERCENTAGE = 10;

function shouldUseAiFeedback(userId: number): boolean {
  return (userId % 100) < AI_FEEDBACK_ROLLOUT_PERCENTAGE;
}
```

---

## Success Metrics

### Primary Metrics

1. **User Satisfaction**:
   - Feedback rating (thumbs up/down on feedback page)
   - "Was this feedback helpful?" survey
   - Target: >80% positive ratings

2. **Feedback Quality** (Manual Review Sample):
   - Specificity score (references actual conversation moments)
   - Actionability score (provides concrete next steps)
   - Accuracy score (aligns with actual performance)
   - Target: >4.0/5.0 average across dimensions

3. **User Engagement**:
   - Time spent on feedback page (should increase)
   - Repeat interview rate (users motivated to improve)
   - Target: +20% time on feedback page, +15% repeat rate

### Secondary Metrics

4. **System Performance**:
   - Feedback generation latency (p50, p95, p99)
   - Success rate (AI generation vs fallback to rule-based)
   - Target: <30s p95 latency, >95% success rate

5. **Cost Efficiency**:
   - Cost per feedback generation
   - Token usage trends
   - Target: <$0.30 per feedback with Haiku model

### Monitoring and Alerts

```typescript
// CloudWatch metrics
const METRICS = {
  'Feedback.Generation.Duration': histogram,
  'Feedback.Generation.Success': counter,
  'Feedback.Generation.Fallback': counter,
  'Feedback.Validation.Failure': counter,
  'Feedback.Cost': gauge,
  'Feedback.Rating.Positive': counter,
  'Feedback.Rating.Negative': counter,
};

// Alerts
const ALERTS = {
  highFailureRate: 'Success rate < 90% for 10 minutes',
  highLatency: 'p95 latency > 45s for 10 minutes',
  highCost: 'Daily cost > $100',
  toxicContent: 'Any toxic content detected',
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Build core AI feedback generation without frontend changes

- [ ] Create `FeedbackGenerationService`
- [ ] Implement prompt construction logic
- [ ] Add database schema changes (migration)
- [ ] Integrate Claude API for feedback generation
- [ ] Add output validation and parsing
- [ ] Implement fallback to rule-based feedback
- [ ] Add comprehensive logging and monitoring

**Testing**:
- Unit tests for prompt construction
- Integration tests with mocked AI responses
- Manual testing with real interview sessions

**Deliverable**: AI feedback generation works end-to-end (backend only)

---

### Phase 2: A/B Testing Infrastructure (Week 3)

**Goal**: Enable gradual rollout with quality monitoring

- [ ] Add feature flag system for AI feedback
- [ ] Implement A/B testing logic (percentage-based rollout)
- [ ] Add feedback rating UI (thumbs up/down)
- [ ] Create admin dashboard for monitoring feedback quality
- [ ] Implement manual review queue for sample feedback

**Testing**:
- Verify feature flag controls AI vs rule-based
- Test feedback rating collection
- Validate admin dashboard metrics

**Deliverable**: Can roll out AI feedback to X% of users with monitoring

---

### Phase 3: Frontend Display (Week 4)

**Goal**: Beautiful UI for AI-generated feedback

- [ ] Design new feedback page layout
- [ ] Implement `AiGeneratedFeedback` component
- [ ] Add section-by-section rendering
- [ ] Add hire/no-hire recommendation badge
- [ ] Implement collapsible dimensional breakdown
- [ ] Add "Copy feedback" and "Share" features

**Testing**:
- Visual regression tests
- Responsive design testing
- Accessibility testing (WCAG compliance)

**Deliverable**: AI feedback displays beautifully on frontend

---

### Phase 4: Quality Refinement (Week 5-6)

**Goal**: Iterate on prompt and quality based on user feedback

- [ ] Analyze feedback ratings and user surveys
- [ ] Review sample feedback for quality issues
- [ ] Refine prompt based on common issues
- [ ] Add few-shot examples to prompt
- [ ] Implement advanced validation rules
- [ ] Add tone calibration for different levels/companies

**Testing**:
- Before/after quality comparison
- User satisfaction surveys
- Manual expert review of feedback samples

**Deliverable**: AI feedback quality meets >80% satisfaction target

---

### Phase 5: Scale and Optimization (Week 7-8)

**Goal**: Optimize for cost and latency at scale

- [ ] Optimize token usage (truncate transcript intelligently)
- [ ] Implement caching for similar interviews
- [ ] Add batch processing for off-peak generation
- [ ] Optimize database queries
- [ ] Add CDN caching for feedback pages
- [ ] Implement cost monitoring and alerts

**Testing**:
- Load testing (100+ concurrent feedback requests)
- Cost analysis (actual vs projected)
- Latency optimization validation

**Deliverable**: System handles production load efficiently

---

## Open Questions

### 1. Model Selection

**Question**: Should we use Claude Haiku (fast, cheap) or Claude Opus (high quality, expensive) for feedback generation?

**Options**:
- **Option A**: Start with Haiku, upgrade to Opus for premium users only
- **Option B**: Use Opus for everyone, optimize token usage aggressively
- **Option C**: Hybrid: Haiku for initial feedback, Opus for "regenerate feedback" feature

**Recommendation**: Option A (Haiku for all initially)
- Haiku is 10x cheaper and 2x faster
- Quality difference may be minimal for structured feedback tasks
- Can upgrade selectively based on user feedback

---

### 2. Feedback Regeneration

**Question**: Should users be able to regenerate feedback if unsatisfied?

**Options**:
- **Option A**: No regeneration (feedback is final)
- **Option B**: Limited regeneration (1-2 times) with cooldown
- **Option C**: Unlimited regeneration for premium users

**Recommendation**: Option B (1 regeneration allowed)
- Provides user agency without excessive cost
- Collects valuable data on when/why users regenerate
- Prevents abuse

---

### 3. Historical Context

**Question**: Should future interviews consider past performance for improvement tracking?

**Options**:
- **Option A**: Each interview independent (v1)
- **Option B**: Show improvement trends across interviews (v2)
- **Option C**: AI considers past feedback when generating new feedback (v3)

**Recommendation**: Start with Option A, plan for Option B in v2
- V1: Simpler, no cross-session complexity
- V2: Add improvement tracking dashboard ("You improved on requirements gathering!")
- V3: Too complex for initial launch, revisit later

---

### 4. Hire/No-Hire Calibration

**Question**: How strict should the hire/no-hire recommendations be?

**Options**:
- **Option A**: Strict (realistic interview standards)
- **Option B**: Lenient (encourage users, most get "hire")
- **Option C**: Calibrated to user's target company/level

**Recommendation**: Option C (calibrated)
- FAANG: Stricter standards (75+ for "hire")
- Non-FAANG: More lenient (65+ for "hire")
- Adjustable by level (senior: higher bar)
- Transparent about calibration in feedback

---

### 5. Feedback Privacy

**Question**: Should users be able to share their feedback publicly (e.g., LinkedIn)?

**Options**:
- **Option A**: Private only
- **Option B**: Shareable with anonymized company/level
- **Option C**: Full social sharing features

**Recommendation**: Option B (shareable, anonymized)
- Users want to showcase improvement
- Anonymize company style → "Tech Company" and level → "Mid-Level"
- Add watermark: "Generated by [YourProduct] - AI Interview Simulator"
- Viral marketing opportunity

---

## Alternatives Considered

### Alternative 1: Hybrid Rule-Based + AI

**Approach**: Use rule-based scoring, but AI only for narrative generation

**Pros**:
- Deterministic scores (easier to debug)
- Lower cost (smaller prompts)
- Faster generation

**Cons**:
- AI narrative may not align with rule-based scores
- Misses opportunity for AI to catch subtle patterns
- Less impressive to users

**Decision**: Not chosen. Full AI generation provides better coherence and can catch nuances that rules miss.

---

### Alternative 2: Fine-Tuned Model

**Approach**: Fine-tune an open-source model (Llama, Mistral) on interview feedback examples

**Pros**:
- Lower per-request cost
- More control over outputs
- No dependency on Anthropic

**Cons**:
- High upfront cost (data collection, training, infrastructure)
- Ongoing maintenance burden
- Likely lower quality than Claude Opus
- Requires ML expertise

**Decision**: Not chosen for v1. Revisit if cost becomes prohibitive at scale.

---

### Alternative 3: Template-Based AI

**Approach**: AI fills in templates with specific examples, but structure is fixed

**Pros**:
- More predictable outputs
- Easier validation
- Lower token usage

**Cons**:
- Less flexible and natural
- Limits AI's ability to provide unique insights
- Users may perceive as "less intelligent"

**Decision**: Not chosen. Full generation is more impressive and valuable.

---

## Dependencies and Risks

### Dependencies

1. **Anthropic Claude API**:
   - Risk: API downtime or rate limits
   - Mitigation: Fallback to rule-based feedback, queue retries

2. **Database Schema Migration**:
   - Risk: Migration fails or breaks existing feedback
   - Mitigation: Backward-compatible schema, extensive testing

3. **Frontend Changes**:
   - Risk: Breaking existing feedback display
   - Mitigation: Feature flag, gradual rollout, backward compatibility

### Risks

1. **Cost Overrun**:
   - Risk: AI feedback costs exceed budget at scale
   - Mitigation: Start with cheaper model, monitor closely, implement cost caps

2. **Quality Issues**:
   - Risk: AI generates low-quality or toxic feedback
   - Mitigation: Validation, manual review, user ratings, rollback capability

3. **User Expectations**:
   - Risk: Users expect feedback to be perfect/comprehensive
   - Mitigation: Set expectations clearly, offer regeneration, continuous improvement

4. **Latency**:
   - Risk: Feedback generation takes too long
   - Mitigation: Async generation with notifications, optimize prompts, caching

---

## Appendix

### A. Current Feedback Templates (For Reference)

**Signals → Strengths Mapping**:
```typescript
const SIGNAL_FEEDBACK = {
  ASKED_FUNCTIONAL_REQS: 'Great job gathering both functional and non-functional requirements upfront',
  DREW_HIGH_LEVEL_DIAGRAM: 'You created a clear high-level system diagram',
  DISCUSSED_TRADEOFFS: 'You discussed trade-offs between different approaches',
  // ... 11 total
};
```

**Red Flags → Weaknesses Mapping**:
```typescript
const RED_FLAG_FEEDBACK = {
  SKIPPED_REQUIREMENTS: 'You didn't spend enough time gathering requirements',
  NO_SCALE_MENTION: "You didn't discuss scale or provide concrete numbers",
  WENT_TOO_DEEP_EARLY: 'You went into implementation details too early',
  // ... 5 total
};
```

**Next Steps by Dimension**:
```typescript
const NEXT_STEPS = {
  requirements: [
    'Practice asking clarifying questions at the start of interviews',
    'Study common functional and non-functional requirements',
  ],
  design: [
    'Practice drawing high-level architecture diagrams',
    'Study common system design patterns (caching, load balancing, etc.)',
  ],
  // ... 5 dimensions
};
```

---

### B. Interview Phases and Time Limits

```typescript
const PHASE_TIME_LIMITS = {
  problem: 5 * 60, // 5 minutes
  requirements: 10 * 60, // 10 minutes
  'high-level': 15 * 60, // 15 minutes
  'deep-dive': 10 * 60, // 10 minutes
  bottlenecks: 5 * 60, // 5 minutes
  'wrap-up': 2 * 60, // 2 minutes
};
// Total: 47 minutes (typical interview: 45 minutes)
```

---

### C. Signal Detection Patterns (Sample)

```typescript
const SIGNAL_PATTERNS = {
  ASKED_FUNCTIONAL_REQS: [
    /(functional\s+)?requirements?/i,
    /what\s+features?/i,
    /users?\s+(need|want|expect)/i,
    /what\s+should\s+the\s+system\s+do/i,
  ],
  MENTIONED_SCALE: [
    /\d+\s*(million|billion|thousand)/i,
    /\d+\s*qps/i,
    /queries?\s+per\s+second/i,
    /requests?\s+per\s+second/i,
    /users?\s+per\s+(day|month|second)/i,
  ],
  // ... 11 total signals
};
```

---

### D. Scoring Formula

```typescript
// Base scores
const BASE_SCORES = {
  REQUIREMENTS: 50,
  DESIGN: 50,
  COMMUNICATION: 50,
  TIME_MANAGEMENT: 70,
  DEPTH: 50,
};

// Apply signal bonuses
for (const signal of signals) {
  const bonuses = SIGNAL_SCORING[signal.signalName];
  if (bonuses) {
    scores.requirements += bonuses.requirements || 0;
    scores.design += bonuses.design || 0;
    // ... etc
  }
}

// Apply red flag penalties
for (const redFlag of redFlags) {
  const penalties = RED_FLAG_SCORING[redFlag.flagName];
  if (penalties) {
    scores.requirements += penalties.requirements || 0; // negative values
    // ... etc
  }
}

// Clamp to 0-100
scores = clamp(scores, 0, 100);

// Calculate overall (weighted average)
const WEIGHTS = {
  requirements: 0.25,
  design: 0.25,
  communication: 0.20,
  timeManagement: 0.15,
  depth: 0.15,
};

scores.overall = Math.round(
  scores.requirements * WEIGHTS.requirements +
  scores.design * WEIGHTS.design +
  scores.communication * WEIGHTS.communication +
  scores.timeManagement * WEIGHTS.timeManagement +
  scores.depth * WEIGHTS.depth
);
```

---

### E. Sample Transcript Format

```
[00:03:45] [REQUIREMENTS] Candidate:
"What are the key features users need from this URL shortener?"

[00:04:12] [REQUIREMENTS] Interviewer:
"Good question! Users should be able to create short URLs, and when someone visits a short URL, they should be redirected to the original URL. What else would you want to know?"

[00:05:23] [REQUIREMENTS] Candidate:
"How many URLs are we expecting to handle? And what's the expected traffic?"

[00:06:01] [REQUIREMENTS] Interviewer:
"Let's assume 100 million URLs created per month, and 10x read-to-write ratio. So about 1 billion redirects per month."

// ... continues for full 45 minutes
```

This format gives AI full context for generating specific, referenced feedback.

---

## Conclusion

This RFC proposes a comprehensive AI-powered feedback generation system that will significantly enhance the value of the System Design Interview Simulator. By generating realistic, detailed, and actionable feedback, we can provide users with the insights they need to improve their interview performance.

The phased implementation approach allows for gradual rollout with quality monitoring, while the backward-compatible architecture ensures existing users are not disrupted. With proper validation, cost controls, and monitoring, this system can scale to serve thousands of users while maintaining high quality and reasonable costs.

**Next Steps**:
1. Review and approve this RFC
2. Create detailed technical design documents for Phase 1
3. Begin implementation following the phased rollout plan
4. Set up A/B testing infrastructure and monitoring dashboards

**Questions? Feedback?**
Please provide comments and suggestions. This is a living document and will be updated based on team feedback and implementation learnings.
