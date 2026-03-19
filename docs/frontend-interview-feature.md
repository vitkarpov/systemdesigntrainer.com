# Frontend Interview Problems — Feature Architecture

## Overview

Extend the System Design Trainer with a **Frontend Interview Problems** module: a LeetCode-style coding environment covering JS utility functions, TypeScript type challenges, and React UI components — the exact problems found in real frontend interviews at top tech companies.

---

## Problem Taxonomy

All problems are written in TypeScript. The split is by **execution model**, not language:

| Category | Examples | Execution Model |
|---|---|---|
| **TS Runtime** | debounce, throttle, deep-clone, stringify, deep-equals | `ts-node` via Judge0 — code is compiled and executed |
| **TS Types** | Pick, Readonly, Awaited, IsUnion, UnionToIntersection | `tsc --noEmit` via Judge0 — type-check only, no runtime |
| **React Components** | accordion, tabs, toast, typeahead, star-rating, calculator | Browser sandbox (iframe) |

**MVP scope**: TS Runtime + TS Types (both run through Judge0). React components added in Phase 2 using a browser sandbox approach.

---

## Architecture

### High-Level Flow

```
User (Browser)
  │
  ├── Monaco Editor + Problem Description (split pane)
  │
  └── POST /coding/problems/:slug/run
        │
        └── NestJS CodingModule
              │
              ├── Wraps user code + test harness
              │
              └── Judge0 API → executes Node.js
                    │
                    └── Structured test results → frontend
```

### Module Placement

New `coding/` module added alongside existing `interview/` module:

```
api/src/
├── interview/          # existing
├── ai/                 # existing
├── coding/             # NEW
│   ├── coding.module.ts
│   ├── controllers/
│   │   ├── problems.controller.ts     # GET /coding/problems, GET /coding/problems/:slug
│   │   └── submissions.controller.ts  # POST /:slug/run, POST /:slug/submit
│   ├── services/
│   │   ├── coding-problems.service.ts  # problem catalog CRUD
│   │   ├── judge0.service.ts           # Judge0 API client
│   │   └── test-harness.service.ts     # wraps user code + test cases for execution
│   └── dto/
│       └── ...

app/src/
├── pages/
│   ├── CodingProblems/       # NEW: problem list page
│   └── CodingEditor/         # NEW: split-pane editor page
├── components/
│   └── coding/               # NEW: shared coding UI components
```

---

## Data Models

### `coding_problems` table

```typescript
CodingProblem {
  id: number
  slug: string                  // "debounce", "deep-clone"
  title: string
  description: string           // markdown, full problem statement
  difficulty: 'easy' | 'medium' | 'hard'
  category: 'ts-runtime' | 'ts-types' | 'react'
  starterCode: string           // TypeScript starter code (all problems are TS)
  testCode: string              // Vitest-compatible test file (hidden from user)
  solutionCode: string          // Reference solution (admin only)
  timeLimitMs: number           // Judge0 execution time limit (default 5000)
  isActive: boolean
  orderIndex: number            // display order
  createdAt: Date
}
```

### `coding_submissions` table

```typescript
CodingSubmission {
  id: number
  userId: number
  problemId: number
  code: string                  // always TypeScript
  status: 'pending' | 'running' | 'passed' | 'failed' | 'compile_error' | 'time_limit' | 'runtime_error'
  testResults: TestResult[]     // JSON array, see below
  passedCount: number
  totalCount: number
  executionTimeMs: number | null
  judgeToken: string | null     // Judge0 submission token for polling
  createdAt: Date
}

TestResult {
  name: string         // test case name
  passed: boolean
  expected?: string
  received?: string
  error?: string
}
```

---

## Judge0 Integration

### Why self-hosted

Avoids per-submission pricing (CE is open source, runs on a single VM). The existing infra already has Docker/Terraform setup. Judge0 CE exposes a REST API identical to Judge0 Cloud — no code changes needed to switch.

### Execution Strategy by Category

**TS Runtime** (`category: 'ts-runtime'`):
- Judge0 language: TypeScript (ID 74, uses `ts-node`)
- Harness: `[user code] + [test runner + test cases]` → compiled and executed
- Output: JSON test results parsed from stdout into `TestResult[]`

**TS Types** (`category: 'ts-types'`):
- Judge0 language: TypeScript (ID 74, uses `tsc --noEmit`)
- Harness: `[user types] + [type-level assertions]` → type-check only, no execution
- Compile errors = test failures; clean compile = pass

**React components** (Phase 2, `category: 'react'`):
- NOT via Judge0 — requires DOM rendering
- Browser sandbox: iframe loads a bundler (esbuild-wasm) + user's React code + test assertions using `@testing-library/dom`
- Results posted back to parent via `postMessage`

### Judge0 API Flow

```
1. POST /coding/problems/:slug/run { code }   # always TypeScript; category determines execution mode
   │
2. test-harness.service wraps: userCode + testCode → combined source
   │
3. judge0.service POST /submissions?wait=false → { token }
   │
4. Backend polls GET /submissions/:token every 1s (max 10s)
   │
5. Parse stdout/stderr → TestResult[]
   │
6. Save CodingSubmission, return structured results
```

**Rate limiting**: 10 run requests/minute per user (existing throttler infrastructure).

---

## Test Harness Format

For `ts-runtime` problems, the harness produces a self-contained TypeScript file compiled and run via `ts-node`:

```javascript
// === USER CODE (submitted) ===
function debounce(fn, delay) { /* user's implementation */ }

// === TEST HARNESS (server-injected, not shown to user) ===
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, passed: true }); }
  catch(e) { results.push({ name, passed: false, error: e.message }); }
}
function expect(received) {
  return {
    toBe: (expected) => { if (received !== expected) throw new Error(`Expected ${expected}, got ${received}`); },
    toEqual: (expected) => { /* deep equal check */ }
  };
}

// === TEST CASES (from problem.testCode) ===
test('debounce delays execution', () => { /* ... */ });
test('debounce resets timer on re-call', () => { /* ... */ });

// === OUTPUT ===
console.log(JSON.stringify(results));
```

Server parses the JSON stdout into `TestResult[]`.

---

## Security

### Sandbox Isolation (Judge0)

Each submission runs in its own ephemeral Docker container. Judge0 enforces:

- **No network access** — containers are network-isolated
- **No shared filesystem** — each container gets a fresh tmpfs
- **CPU + memory limits** — configurable per language in Judge0 CE config
- **Hard time limit** — process killed after `timeLimitMs`, preventing infinite loops

Two users' submissions can never interfere at the execution level.

### Harness Integrity (Our Responsibility)

Judge0 isolation doesn't prevent a clever user from writing code that defeats the test harness itself — e.g., overriding globals used by the test runner or exploiting string concatenation. Mitigations:

1. **Wrap user code in an IIFE** — prevents user variables from leaking into the test harness scope:
   ```javascript
   (function() {
     // user code here
   })();
   // test harness globals defined here, unreachable from above
   ```

2. **Pre-submission validation** — reject code containing patterns that could sabotage the harness before sending to Judge0:
   - `process.exit` — would terminate before tests run
   - Overrides of `console.log` — harness uses stdout for results
   - `eval` / `Function` constructor — potential scope escape

3. **Test code never sent to client** — `testCode` field is stripped from all API responses. Users see only problem description and starter code.

### React Sandbox (Phase 2)

User-submitted React code runs in a sandboxed iframe with `sandbox="allow-scripts"` — no `allow-same-origin`, so the iframe cannot access parent app cookies, localStorage, or DOM.

---

## Frontend UI

### Problem List (`/coding`)

- Filterable **table** (LeetCode-style rows) by category + difficulty — not a card grid
- Stats row: solved / total counts per category
- Per-row: index, solved icon (✓ / — / ○), title, category badge, difficulty
- React category problems shown with a "Phase 2" badge (non-interactive until Phase 2)
- Same auth + payment gate as interview sessions

### Problem Editor (`/coding/:slug`)

Split-pane layout — left pane ~42%, right pane flex-1, pure CSS (no `react-split`):

```
┌──────────────────────┬──────────────────────────────────────┐
│  Title · Difficulty  │  [Reset]  [Run Tests]  [</> Upgrade] │ ← header
│  [Description] [Runs]│──────────────────────────────────────│
│                      │  TypeScript                  (label) │
│  Markdown content    │                                      │
│  (scrollable)        │  <code editor>                       │
│                      │                                      │
│                      ├──────────────────────────────────────┤
│                      │  Test Results   3/5 passed           │
│                      │  ✓ test name                         │
│                      │  ✗ test name — Error: …              │
└──────────────────────┴──────────────────────────────────────┘
```

- Left pane has two tabs: **Description** and **Submissions** (run history for this problem)
- Run Tests button lives in the page header (not inside the editor pane)
- Every run executes the full test suite and is automatically saved — no separate submit step
- Test results panel slides in below the editor after the first run

### Key Components

- `CodingProblems` page (`pages/CodingProblems/`) — table list with filters
- `CodingEditor` page (`pages/CodingEditor/`) — split-pane shell (CSS flex)
- Monaco Editor — `@monaco-editor/react` **must be installed** as a new dependency; prototype uses `<textarea>` as a stand-in
- Test results panel — inline in `CodingEditor`, not a separate component file
- Submission history — inline left-pane tab in `CodingEditor`, not a separate component file

---

## API Endpoints

```
GET    /coding/problems                    # list all active problems
GET    /coding/problems/:slug              # problem detail + starter code
POST   /coding/problems/:slug/run          # run tests (always saved to history)
GET    /coding/submissions/:submissionId   # poll submission status
GET    /coding/problems/:slug/submissions  # user's run history for problem
```

---

## Problem Content Storage

Problems are stored in the database (consistent with how `interviewCases` work). An **admin seed script** imports problems from a structured JSON/markdown source:

```
api/src/db/seeds/
└── coding-problems/
    ├── debounce.ts
    ├── throttle.ts
    ├── deep-clone.ts
    └── ...
```

Each seed file exports:
```typescript
export const problem: CodingProblemSeed = {
  slug: 'debounce',
  title: 'Implement debounce',
  description: `...markdown...`,
  difficulty: 'medium',
  category: 'ts-runtime',
  starterCode: `function debounce(fn: (...args: unknown[]) => void, delay: number) {\n  // your code\n}`,
  testCode: `...test assertions...`,
  solutionCode: `...reference implementation...`,
};
```

---

## Phase 2: React Components

React component problems need a fundamentally different execution model since they require a real DOM. The approach:

1. **Sandbox iframe** — served from a dedicated `/sandbox` route (or separate origin for isolation)
2. On problem load, iframe initializes esbuild-wasm + React runtime
3. User code posted to iframe via `postMessage`
4. Iframe bundles + renders component into a test container
5. `@testing-library/dom` assertions run in-browser
6. Results posted back to parent frame
7. Parent displays pass/fail — no Judge0 involved

This keeps React execution client-side, avoiding complex server-side rendering infra.

---

## Infrastructure

### Judge0 CE Deployment

- Single EC2 instance (t3.medium or similar) in same VPC as NestJS API
- Docker Compose with Judge0 CE + workers
- **Not publicly accessible** — NestJS proxies all requests
- Terraform additions in `terraform/` for the new EC2 + security group

### Environment Variables

```
JUDGE0_API_URL=http://judge0-internal:2358   # internal VPC URL
JUDGE0_API_KEY=                              # CE can run without auth on internal network
```

---

## Billing Integration

Frontend Interview Problems is a **separate product** from the System Design Trainer — distinct Stripe price + subscription. Users with an active coding subscription can run tests unlimited times; no per-run credits.

- Gate enforced at the `POST /coding/problems/:slug/run` endpoint via a new `CodingSubscriptionGuard` (mirrors the existing `PaymentGuardService` pattern)
- Stripe: new Product ("Frontend Interview Practice") + monthly Price
- Dashboard shows coding subscription status separately from interview credits

---

## Product Integration

### Dashboard (`/`)

The dashboard becomes the unified hub for both products. Add a tab switcher at the top:

```
[ System Design ]  [ Frontend Coding ]
```

**System Design tab** — unchanged (existing sessions list + stats).

**Frontend Coding tab** — new:
- Stats row: Problems Solved / Total attempts / Pass rate
- Recent runs list (problem title, category badge, pass/fail, timestamp) — each row links to `/coding/:slug`
- "Practice" button in header (→ `/coding`) when on this tab
- If no coding subscription: upsell card with a "Practice" button → `/coding` (let the problem list + paywall do the selling, don't interrupt with a pricing redirect)

The tab state can live in the URL (`/?tab=coding`) so direct links work.

### Header Credit Indicator

`InterviewCounter` currently shows `interviewsRemaining` (a count) next to a Zap icon. Coding is a different model — binary subscription status, not a count.

Add a separate `CodingSubscriptionBadge` component. Each badge appears only on its own product's pages — they don't coexist in the same header:

| Page | Header right content |
|---|---|
| `/`, `/home`, `/interview/:id`, `/feedback/:id` | `InterviewCounter` + action button |
| `/coding`, `/coding/:slug` | `CodingSubscriptionBadge` + action button |

`CodingSubscriptionBadge` states:
- **Active**: `</> Pro` in muted style (no noise when everything is fine)
- **Inactive**: `</> Upgrade` in amber, links to `/pricing#coding`

`InterviewCounter` is unchanged — no need to merge two unrelated billing concepts into one component.

### Paywall

`PaywallModal` gets a `variant` prop: `'interviews'` (existing) | `'coding'` (new). The coding variant shows copy about the Frontend Practice subscription and links to the coding pricing section. Same modal shell, different content.

Triggered at `POST /coding/problems/:slug/run` when `CodingSubscriptionGuard` rejects — frontend catches the 403 and opens the modal.

### Pricing Page (`/pricing`)

The pricing page has a **product tab switcher** at the top — not two sections stacked vertically:

```
[ ⚡ System Design ]  [ </> Frontend Coding ]
```

Each tab shows only the relevant pricing cards and FAQ:

- **System Design tab** (default) — existing three cards (Starter $9, Power $12, Pro Unlimited $49/mo) + interview-specific FAQ
- **Frontend Coding tab** — single centred card ($19/mo flat) + coding-specific FAQ

Hash routing: `/pricing#coding` auto-selects the coding tab. `CodingSubscriptionBadge` and `PaywallModal` (coding variant) both link to `/pricing#coding`.

Independent checkout flows — separate Stripe price IDs per product.

### Navigation Between Modes

No global sidebar — the existing pattern (PageHeader with back button) works fine. The path is:

```
Dashboard → [Frontend Coding tab] → /coding (problem list) → /coding/:slug (editor)
                                         ↑
                               also linkable from marketing
```

`PageHeader` on `/coding` and `/coding/:slug` shows:
- Back button → `/` (dashboard)
- `CodingSubscriptionBadge` in rightContent

### New Routes

```
/coding              → CodingProblems page (problem list)
/coding/:slug        → CodingEditor page (split-pane editor)
/pricing             → existing, extended with coding section
```

### User object

The existing `GET /auth/user` response already drives `InterviewCounter`. Extend it with:

```typescript
user.codingSubscriptionStatus: 'active' | 'inactive'
```

So `CodingSubscriptionBadge` can use the same already-cached user query — no extra API call.

---

## Open Questions

1. **TypeScript type challenges**: Judge0's TypeScript support uses `tsc`. We need to verify type-level test patterns (e.g., `type Assert<T extends true> = T`) compile correctly as the harness.
2. **Problem sourcing**: Manually curate a subset of the reference catalog? Or build an import pipeline from the source repo?
3. **Leaderboard / social**: Out of scope for now, but worth noting as a natural extension.
4. **React sandbox security**: iframe sandboxing policy needs careful review to prevent XSS from user-submitted code affecting the parent app.

## Naming

All user-facing labels that currently read **"System Design"** as a product/tab name should be updated to **"Backend System Design"** to better reflect the scope of the product. This applies to:

- Dashboard tab switcher
- Pricing page tab switcher
- Any marketing copy or section headers referring to the interview product

Does **not** apply to: the app brand name ("System Design Trainer"), the "System Design" score dimension in feedback breakdowns, or legal pages.

---

## New Dependencies Required

These are not yet in `app/package.json` and must be added before production implementation:

- `@monaco-editor/react` — TypeScript-aware code editor (prototype uses `<textarea>`)
- Verify `react-markdown` + `remark-gfm` cover all problem description formatting needs (already installed)
