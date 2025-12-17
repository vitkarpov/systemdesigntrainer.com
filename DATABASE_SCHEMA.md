# Database Schema Documentation

## Overview

This document describes the data models for the System Design Interview Simulator. The schema uses **normalized tables with proper relations** and **BIGSERIAL primary keys** for simplicity and performance.

## Database Choice

**PostgreSQL** - chosen for:
- Strong relational model with foreign keys
- Excellent performance for complex queries
- ACID guarantees for consistent state
- Good indexing support
- Easy to reason about and debug

## Core Design Principles

1. **Normalized Relations**: Use separate tables with foreign keys instead of JSONB
2. **State is Queryable**: All data should be easily queryable with standard SQL
3. **Analytics-Friendly**: Schema designed for future analytics needs
4. **Type Safety**: Database constraints enforce data integrity
5. **Simple IDs**: BIGSERIAL for performance and debuggability
6. **Timestamps Everywhere**: Track creation and updates for debugging

## Why BIGSERIAL instead of UUID?

### Benefits of BIGSERIAL:
- ✅ 8 bytes vs 16 bytes (50% storage savings)
- ✅ Sequential insertions = better B-tree index performance
- ✅ Easy debugging: "session 1234" vs "session 7f3e9c4a-..."
- ✅ Natural chronological ordering
- ✅ Standard PostgreSQL pattern

### When UUID would be better:
- Multiple databases that need to merge
- Distributed ID generation
- Hiding record counts for security
- **None of these apply to MVP**

## Entity Relationship Diagram

```
User (1) ──────── (N) InterviewSession (N) ──────── (1) InterviewCase
                         │
                         ├─── (N) TranscriptMessage
                         │
                         ├─── (N) InterviewSignal
                         │
                         ├─── (N) InterviewRedFlag
                         │
                         ├─── (N) DiagramSnapshot
                         │           │
                         │           └─── (N) DiagramElement
                         │
                         └─── (1) FeedbackReport
                                     │
                                     ├─── (N) FeedbackItem
                                     │
                                     └─── (N) FeedbackNextStep
```

## Tables

### 1. users

Stores user account information and subscription status.

```sql
CREATE TABLE users (
  id                      BIGSERIAL PRIMARY KEY,

  -- Authentication (WorkOS + GitHub OAuth)
  workos_user_id          VARCHAR(255) UNIQUE NOT NULL,  -- WorkOS user ID
  github_id               VARCHAR(255) UNIQUE,           -- GitHub user ID
  github_username         VARCHAR(255),                  -- GitHub username
  email                   VARCHAR(255) NOT NULL UNIQUE,

  -- Profile
  name                    VARCHAR(255),                  -- Display name from GitHub
  avatar_url              TEXT,                          -- GitHub profile picture
  target_level            VARCHAR(20) CHECK (target_level IN ('mid', 'senior', 'staff')),

  -- Subscription
  subscription_status     VARCHAR(20) NOT NULL DEFAULT 'free'
                          CHECK (subscription_status IN ('free', 'pro', 'cancelled')),
  subscription_expires_at TIMESTAMP,
  stripe_customer_id      VARCHAR(255),

  -- Usage tracking
  interviews_completed    INTEGER NOT NULL DEFAULT 0,
  interviews_remaining    INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at           TIMESTAMP
);

CREATE INDEX idx_users_workos_user_id ON users(workos_user_id);
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
```

### 2. interview_cases

System design problems (e.g., "Design URL Shortener").

```sql
CREATE TABLE interview_cases (
  id                      BIGSERIAL PRIMARY KEY,

  -- Basic info
  title                   VARCHAR(255) NOT NULL,
  slug                    VARCHAR(100) NOT NULL UNIQUE,
  description             TEXT NOT NULL,
  difficulty              VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Problem definition
  problem_statement       TEXT NOT NULL,

  -- Metadata
  estimated_duration      INTEGER NOT NULL,  -- Minutes

  -- Status
  is_active               BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_cases_slug ON interview_cases(slug);
CREATE INDEX idx_interview_cases_is_active ON interview_cases(is_active);
```

### 3. interview_case_expectations

Stores expected requirements, components, and trade-offs for each case.

```sql
CREATE TABLE interview_case_expectations (
  id                      BIGSERIAL PRIMARY KEY,
  case_id                 BIGINT NOT NULL REFERENCES interview_cases(id) ON DELETE CASCADE,

  -- Type of expectation
  expectation_type        VARCHAR(50) NOT NULL
                          CHECK (expectation_type IN (
                            'functional_requirement',
                            'non_functional_requirement',
                            'component',
                            'tradeoff'
                          )),

  -- The actual expectation
  description             TEXT NOT NULL,

  -- For ordering/grouping
  display_order           INTEGER NOT NULL DEFAULT 0,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_expectations_case_id ON interview_case_expectations(case_id);
CREATE INDEX idx_case_expectations_type ON interview_case_expectations(expectation_type);
```

### 4. interview_case_tags

Many-to-many relationship for case tags.

```sql
CREATE TABLE interview_case_tags (
  id                      BIGSERIAL PRIMARY KEY,
  case_id                 BIGINT NOT NULL REFERENCES interview_cases(id) ON DELETE CASCADE,
  tag                     VARCHAR(50) NOT NULL,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(case_id, tag)
);

CREATE INDEX idx_case_tags_case_id ON interview_case_tags(case_id);
CREATE INDEX idx_case_tags_tag ON interview_case_tags(tag);
```

### 5. interview_sessions

**Core table** - stores the high-level state of each interview.

```sql
CREATE TABLE interview_sessions (
  id                      BIGSERIAL PRIMARY KEY,

  -- Foreign keys
  user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id                 BIGINT NOT NULL REFERENCES interview_cases(id),

  -- Status
  status                  VARCHAR(20) NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
  started_at              TIMESTAMP,
  completed_at            TIMESTAMP,

  -- Current state
  current_phase           VARCHAR(20) NOT NULL DEFAULT 'problem'
                          CHECK (current_phase IN ('problem', 'requirements', 'high_level',
                                                   'deep_dive', 'bottlenecks', 'wrap_up')),
  phase_started_at        TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Metadata
  company_style           VARCHAR(20) NOT NULL DEFAULT 'faang'
                          CHECK (company_style IN ('faang', 'startup', 'generic')),
  level                   VARCHAR(20) NOT NULL DEFAULT 'mid'
                          CHECK (level IN ('mid', 'senior', 'staff')),

  -- Timestamps
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_interview_sessions_created_at ON interview_sessions(created_at DESC);
CREATE INDEX idx_interview_sessions_current_phase ON interview_sessions(current_phase);
```

### 6. transcript_messages

Individual messages in the interview conversation.

```sql
CREATE TABLE transcript_messages (
  id                      BIGSERIAL PRIMARY KEY,
  session_id              BIGINT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,

  -- Message content
  role                    VARCHAR(20) NOT NULL CHECK (role IN ('user', 'interviewer', 'system')),
  text                    TEXT NOT NULL,

  -- Context at time of message
  phase                   VARCHAR(20) NOT NULL,
  seconds_elapsed         INTEGER NOT NULL,  -- Seconds since interview start

  -- Timestamps
  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcript_messages_session_id ON transcript_messages(session_id);
CREATE INDEX idx_transcript_messages_role ON transcript_messages(role);
CREATE INDEX idx_transcript_messages_phase ON transcript_messages(phase);
CREATE INDEX idx_transcript_messages_created_at ON transcript_messages(created_at);

-- For ordering messages within a session
CREATE INDEX idx_transcript_messages_session_order
  ON transcript_messages(session_id, created_at);
```

### 7. interview_signals

Tracks which signals were triggered during the interview.

```sql
CREATE TABLE interview_signals (
  id                      BIGSERIAL PRIMARY KEY,
  session_id              BIGINT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,

  -- Signal name
  signal_name             VARCHAR(50) NOT NULL
                          CHECK (signal_name IN (
                            'asked_functional_reqs',
                            'asked_non_functional_reqs',
                            'clarified_constraints',
                            'mentioned_scale',
                            'proposed_api',
                            'drew_high_level_diagram',
                            'discussed_data_model',
                            'addressed_bottlenecks',
                            'discussed_tradeoffs',
                            'structured_approach',
                            'asked_clarifying_questions'
                          )),

  -- When was this signal detected?
  detected_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  seconds_elapsed         INTEGER NOT NULL,
  phase                   VARCHAR(20) NOT NULL,

  -- Which message triggered it?
  triggered_by_message_id BIGINT REFERENCES transcript_messages(id),

  UNIQUE(session_id, signal_name)  -- Each signal can only be set once per session
);

CREATE INDEX idx_interview_signals_session_id ON interview_signals(session_id);
CREATE INDEX idx_interview_signals_signal_name ON interview_signals(signal_name);
CREATE INDEX idx_interview_signals_phase ON interview_signals(phase);
```

### 8. interview_red_flags

Tracks problems detected during the interview.

```sql
CREATE TABLE interview_red_flags (
  id                      BIGSERIAL PRIMARY KEY,
  session_id              BIGINT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,

  -- Red flag type
  flag_name               VARCHAR(50) NOT NULL
                          CHECK (flag_name IN (
                            'went_too_deep_early',
                            'skipped_requirements',
                            'no_scale_mention',
                            'poor_time_management',
                            'misunderstood_problem'
                          )),

  -- When was this detected?
  detected_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  seconds_elapsed         INTEGER NOT NULL,
  phase                   VARCHAR(20) NOT NULL,

  -- Context
  description             TEXT,

  UNIQUE(session_id, flag_name)  -- Each flag can only be set once per session
);

CREATE INDEX idx_interview_red_flags_session_id ON interview_red_flags(session_id);
CREATE INDEX idx_interview_red_flags_flag_name ON interview_red_flags(flag_name);
```

### 9. diagram_snapshots

Whiteboard snapshots captured at different times.

```sql
CREATE TABLE diagram_snapshots (
  id                      BIGSERIAL PRIMARY KEY,
  session_id              BIGINT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,

  -- When was this snapshot taken?
  snapshot_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  seconds_elapsed         INTEGER NOT NULL,
  phase                   VARCHAR(20) NOT NULL,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagram_snapshots_session_id ON diagram_snapshots(session_id);
CREATE INDEX idx_diagram_snapshots_created_at ON diagram_snapshots(created_at);
```

### 10. diagram_elements

Individual elements in a diagram (boxes, arrows, text).

```sql
CREATE TABLE diagram_elements (
  id                      BIGSERIAL PRIMARY KEY,
  snapshot_id             BIGINT NOT NULL REFERENCES diagram_snapshots(id) ON DELETE CASCADE,

  -- Element type
  element_type            VARCHAR(20) NOT NULL CHECK (element_type IN ('box', 'arrow', 'text')),

  -- Position (for box and text)
  x                       INTEGER,
  y                       INTEGER,
  width                   INTEGER,
  height                  INTEGER,

  -- Text content
  label                   TEXT,

  -- Arrow connections (for arrows)
  from_element_id         BIGINT,  -- References another element in same snapshot
  to_element_id           BIGINT,  -- References another element in same snapshot

  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagram_elements_snapshot_id ON diagram_elements(snapshot_id);
CREATE INDEX idx_diagram_elements_element_type ON diagram_elements(element_type);
```

### 11. feedback_reports

Generated feedback after interview completion.

```sql
CREATE TABLE feedback_reports (
  id                      BIGSERIAL PRIMARY KEY,

  -- Foreign keys
  session_id              BIGINT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Overall scores
  overall_score           INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  requirements_score      INTEGER NOT NULL CHECK (requirements_score >= 0 AND requirements_score <= 100),
  design_score            INTEGER NOT NULL CHECK (design_score >= 0 AND design_score <= 100),
  communication_score     INTEGER NOT NULL CHECK (communication_score >= 0 AND communication_score <= 100),
  time_management_score   INTEGER NOT NULL CHECK (time_management_score >= 0 AND time_management_score <= 100),
  depth_score             INTEGER NOT NULL CHECK (depth_score >= 0 AND depth_score <= 100),

  -- Timestamps
  generated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(session_id)  -- One report per session
);

CREATE INDEX idx_feedback_reports_user_id ON feedback_reports(user_id);
CREATE INDEX idx_feedback_reports_session_id ON feedback_reports(session_id);
CREATE INDEX idx_feedback_reports_overall_score ON feedback_reports(overall_score);
```

### 12. feedback_items

Individual feedback items (strengths, weaknesses, suggestions).

```sql
CREATE TABLE feedback_items (
  id                      BIGSERIAL PRIMARY KEY,
  report_id               BIGINT NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,

  -- Item type
  item_type               VARCHAR(20) NOT NULL CHECK (item_type IN ('strength', 'weakness', 'suggestion')),

  -- Content
  title                   VARCHAR(255) NOT NULL,
  description             TEXT NOT NULL,

  -- When in the interview did this happen?
  timestamp_seconds       INTEGER,  -- NULL if general feedback
  phase                   VARCHAR(20),

  -- For ordering
  display_order           INTEGER NOT NULL DEFAULT 0,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_items_report_id ON feedback_items(report_id);
CREATE INDEX idx_feedback_items_item_type ON feedback_items(item_type);
```

### 13. feedback_next_steps

Actionable next steps from feedback.

```sql
CREATE TABLE feedback_next_steps (
  id                      BIGSERIAL PRIMARY KEY,
  report_id               BIGINT NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,

  -- The next step
  step_text               TEXT NOT NULL,
  priority                INTEGER NOT NULL DEFAULT 0,  -- Higher = more important

  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_next_steps_report_id ON feedback_next_steps(report_id);
```

## Sample Queries

### Get interview transcript in order
```sql
SELECT
  role,
  text,
  phase,
  seconds_elapsed,
  created_at
FROM transcript_messages
WHERE session_id = 1234
ORDER BY created_at ASC;
```

### Get all signals for a session
```sql
SELECT
  signal_name,
  phase,
  seconds_elapsed,
  detected_at
FROM interview_signals
WHERE session_id = 1234
ORDER BY detected_at ASC;
```

### Analyze which signals correlate with high scores
```sql
SELECT
  s.signal_name,
  AVG(f.overall_score) as avg_score,
  COUNT(*) as num_sessions
FROM interview_signals s
JOIN interview_sessions i ON s.session_id = i.id
JOIN feedback_reports f ON f.session_id = i.id
WHERE i.status = 'completed'
GROUP BY s.signal_name
ORDER BY avg_score DESC;
```

### Find sessions where users skipped requirements
```sql
SELECT
  s.id,
  s.user_id,
  s.created_at,
  f.overall_score
FROM interview_sessions s
LEFT JOIN interview_red_flags rf ON rf.session_id = s.id AND rf.flag_name = 'skipped_requirements'
LEFT JOIN feedback_reports f ON f.session_id = s.id
WHERE rf.id IS NOT NULL
ORDER BY s.created_at DESC;
```

### Get complete feedback for a session
```sql
SELECT
  r.*,
  json_agg(
    DISTINCT jsonb_build_object(
      'type', fi.item_type,
      'title', fi.title,
      'description', fi.description
    )
  ) as feedback_items,
  json_agg(
    DISTINCT ns.step_text
  ) as next_steps
FROM feedback_reports r
LEFT JOIN feedback_items fi ON fi.report_id = r.id
LEFT JOIN feedback_next_steps ns ON ns.report_id = r.id
WHERE r.session_id = 1234
GROUP BY r.id;
```

## Initial Data Seed

```sql
-- Insert a sample interview case
INSERT INTO interview_cases (
  title, slug, description, difficulty, problem_statement,
  estimated_duration, is_active
) VALUES (
  'Design a URL Shortening Service',
  'url-shortener',
  'Design a service that shortens long URLs into short links',
  'medium',
  'Design a URL shortening service that allows users to create short URLs from long ones, and redirect users when they visit the short URL.',
  45,
  true
) RETURNING id;
-- Let's say this returns id = 1

-- Insert expectations
INSERT INTO interview_case_expectations (case_id, expectation_type, description, display_order)
VALUES
  (1, 'functional_requirement', 'Create short URL from long URL', 1),
  (1, 'functional_requirement', 'Redirect short URL to original', 2),
  (1, 'functional_requirement', 'Track click analytics', 3),
  (1, 'non_functional_requirement', 'Handle 1000 requests/sec', 1),
  (1, 'non_functional_requirement', 'Low latency (<100ms)', 2),
  (1, 'non_functional_requirement', 'High availability (99.9%)', 3),
  (1, 'component', 'API Server', 1),
  (1, 'component', 'Database', 2),
  (1, 'component', 'Cache', 3),
  (1, 'component', 'Load Balancer', 4),
  (1, 'tradeoff', 'SQL vs NoSQL', 1),
  (1, 'tradeoff', 'Hash collision handling', 2),
  (1, 'tradeoff', 'Caching strategy', 3);

-- Insert tags
INSERT INTO interview_case_tags (case_id, tag)
VALUES
  (1, 'distributed-systems'),
  (1, 'caching'),
  (1, 'hashing'),
  (1, 'scalability');
```

## Migration Strategy

1. **MVP**: Start with all normalized tables from day 1
2. **TypeORM or Prisma**: Use migrations for schema versioning
3. **Seed data**: Include 1-2 complete interview cases
4. **Testing**: Mock data for unit tests

## Performance Considerations

- All foreign keys have indexes
- BIGSERIAL provides sequential IDs = optimal B-tree performance
- Timestamps indexed for time-based queries
- Composite indexes on frequently queried combinations
- Use `EXPLAIN ANALYZE` to optimize slow queries

## Benefits of This Design

✅ **Easy Analytics**: "Show me all users who mentioned scale in the first 15 minutes"
✅ **Proper Relationships**: Foreign keys enforce data integrity
✅ **Type Safety**: Database constraints validate data
✅ **Flexible Queries**: Standard SQL joins
✅ **Schema Evolution**: Easy to add columns or tables
✅ **Better Performance**: BIGSERIAL + proper indexes on normalized data
✅ **Debuggable**: Simple integer IDs make logs readable

## Index Performance Notes

Sequential IDs (from BIGSERIAL) keep B-tree indexes balanced:
- New records always append to the end
- No random page splits
- Better cache locality
- Faster INSERT performance

---

**Next Steps:**
1. Choose ORM (TypeORM or Prisma)
2. Generate migration files
3. Create seed data
4. Implement repository pattern in NestJS
