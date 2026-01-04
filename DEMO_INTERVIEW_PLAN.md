# Free Demo Interview Flow Implementation Plan

## Overview
Allow users to complete a full 45-minute interview without authentication, then require signup to view feedback. Demo sessions will be linked to user accounts after signup.

## User Flow
1. Anonymous user lands on demo page → selects case → starts interview
2. User completes full interview (all phases, diagram, no limitations)
3. After completion, signup is required to view feedback
4. After signup, demo session is linked to their account and appears in dashboard

## Technical Approach

**Demo Token System**: Create lightweight JWT tokens specifically for demo sessions, stored in HTTP-only cookies (similar to regular auth). Tokens contain only `{ demoSessionId, type: 'demo' }` and expire in 48 hours.

**Key Benefits:**
- Secure (HTTP-only cookies prevent XSS)
- Simple (reuses JWT infrastructure)
- Scoped (tokens only work for their specific session)
- Clean separation between demo and authenticated flows

---

## Implementation Phases

### Phase 1: Backend - Demo Token Infrastructure

#### 1.1 Create Demo Token Service
**New file**: `backend/src/auth/services/demo-token.service.ts`

```typescript
@Injectable()
export class DemoTokenService {
  generateDemoToken(sessionId: number): string
  verifyDemoToken(token: string): { demoSessionId: number }
  isValidDemoToken(token: string): boolean
}
```

- Generate JWT with payload: `{ demoSessionId: number, type: 'demo' }`
- 48-hour expiry
- Uses same JWT secret as regular auth

#### 1.2 Update Database Schema
**File**: `backend/src/db/schema/interview-sessions.schema.ts`

Changes:
- Make `userId` nullable (remove `.notNull()`)
- Add `isDemo: boolean('is_demo').notNull().default(false)`
- Add `demoTokenExpiry: timestamp('demo_token_expiry')`

**Migration required**: Yes
```sql
ALTER TABLE interview_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE interview_sessions ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE interview_sessions ADD COLUMN demo_token_expiry TIMESTAMP;
CREATE INDEX idx_interview_sessions_demo ON interview_sessions(is_demo, user_id) WHERE is_demo = true;
```

#### 1.3 Update JWT Auth Guard
**File**: `backend/src/auth/guards/jwt-auth.guard.ts`

Current flow:
1. Check `@Public()` → allow if public
2. Extract token from header or cookie
3. Verify JWT → attach user to request

**New flow**:
1. Check `@Public()` → allow if public
2. Extract demo token from `demo_token` cookie → if valid, attach `{ demo: { sessionId, isDemo: true } }` to request
3. Extract regular JWT → if valid, proceed with existing user flow
4. If neither token exists → throw UnauthorizedException

Key logic:
```typescript
// Try demo token first
const demoToken = request.cookies?.demo_token;
if (demoToken) {
  const demoInfo = await demoTokenService.verifyDemoToken(demoToken);
  request.demo = { sessionId: demoInfo.demoSessionId, isDemo: true };
  return true;
}

// Fall back to regular auth (existing logic)
```

#### 1.4 Create Demo Controller
**New file**: `backend/src/interview/controllers/demo.controller.ts`

**Endpoints:**

**POST /api/demo/sessions** (@Public)
- No auth required
- Create session with `userId = null`, `isDemo = true`
- Return session ID
- Rate limit: 5 per hour per IP

**POST /api/demo/sessions/:id/start** (@Public)
- Verify session is demo
- Generate demo token
- Set `demo_token` HTTP-only cookie (48h expiry, sameSite: 'lax', secure in prod)
- Start session (no payment check)
- Return initial greeting

**POST /api/demo/sessions/:id/claim** (Authenticated)
- Verify session is demo and unclaimed (`userId = null`)
- Set `userId` to authenticated user
- Set `isDemo = false`
- Clear `demo_token` cookie
- Increment user's `interviewsCompleted`
- Return success

#### 1.5 Update Sessions Controller
**File**: `backend/src/interview/controllers/sessions.controller.ts`

**Changes:**

Replace `verifySessionOwnership()` with new `verifySessionAccess()`:
```typescript
private async verifySessionAccess(sessionId: number, request: any) {
  const session = await sessionService.getSession(sessionId);

  // Demo access: verify demo token matches session ID
  if (request.demo?.isDemo && session.isDemo && session.id === request.demo.sessionId) {
    return session;
  }

  // Authenticated access: verify user owns session
  if (request.user && session.userId === request.user.id) {
    return session;
  }

  throw new ForbiddenException('Access denied');
}
```

**Apply to these endpoints:**
- `POST /sessions/:id/start`
- `SSE /sessions/:id/conversation`
- `PATCH /sessions/:id/phase`
- `GET /sessions/:id`
- `GET /sessions/:id/transcript`
- `GET /sessions/:id/signals`
- `GET /sessions/:id/red-flags`
- `POST /sessions/:id/diagram`
- `GET /sessions/:id/diagram`

**Special handling for feedback:**
- `GET /sessions/:id/feedback` - ONLY allow authenticated users
- If demo token → return 403: "Sign up to view your feedback"

#### 1.6 Update Session Service
**File**: `backend/src/interview/services/interview-session.service.ts`

**New methods:**
```typescript
async createDemoSession(dto): Promise<Session>
  // Same as createSession but userId = null, isDemo = true

async claimDemoSession(sessionId: number, userId: number): Promise<void>
  // Verify session exists, isDemo = true, userId = null
  // Update: set userId, set isDemo = false
  // Increment user's interviewsCompleted

async getUserSessions(userId): Promise<Session[]>
  // Add filter: WHERE userId = ? (excludes unclaimed demos)
```

#### 1.7 Rate Limiting
**File**: `backend/src/interview/controllers/demo.controller.ts`

Apply aggressive rate limits:
- Demo creation: 5 per hour per IP
- Demo start: 10 per hour per IP
- Conversation: 10 messages per minute per demo session

Use `@Throttle()` decorator with custom key (IP address)

---

### Phase 2: Frontend - Anonymous Flow & Signup Gate

#### 2.1 Create Demo Landing Page
**New file**: `ui/src/pages/Demo/DemoLanding.tsx`

Route: `/demo` (public)

Features:
- Show case selection (similar to Home.tsx)
- "Start Free Demo Interview" button
- Call `POST /api/demo/sessions` → `POST /api/demo/sessions/:id/start`
- Store demo session ID in localStorage
- Navigate to `/interview/:sessionId`
- Show banner: "This is a free demo. Sign up to save your progress and unlock unlimited interviews."

#### 2.2 Update App Routes
**File**: `ui/src/App.tsx`

Changes:
```typescript
// Add public demo route
<Route path="/demo" element={<DemoLanding />} />

// Remove ProtectedRoute from interview (allow demo access)
<Route path="/interview/:sessionId" element={<Interview />} />

// Add signup gate for feedback
<Route path="/feedback/:sessionId" element={<FeedbackAuthGate />} />
```

#### 2.3 Create Feedback Auth Gate
**New file**: `ui/src/components/FeedbackAuthGate.tsx`

Logic:
```typescript
const FeedbackAuthGate = () => {
  const { isAuthenticated } = useAuth();
  const { sessionId } = useParams();

  if (!isAuthenticated) {
    // Show signup modal
    return <SignupPrompt sessionId={sessionId} />;
  }

  return <Feedback />;
}
```

**SignupPrompt Modal:**
- Title: "Sign up to view your feedback"
- Body: "Great job! You've completed the interview. Create a free account to view your detailed feedback and track your progress."
- Button: "Create Free Account"
- On click: Store `sessionId` in localStorage → redirect to login

#### 2.4 Update Interview Page
**File**: `ui/src/pages/Interview/Interview.tsx`

Changes:
- Works for both demo and authenticated sessions (API handles authorization)
- If demo session, show persistent banner: "Demo Interview - Sign up to save your progress"
- "End Interview" button:
  - If demo: navigate to `/feedback/:sessionId` (will show signup gate)
  - If authenticated: navigate to `/feedback/:sessionId` (shows feedback)

#### 2.5 Update Auth Flow for Session Claiming
**File**: `ui/src/pages/Auth/Callback.tsx`

After successful OAuth callback:
```typescript
// Check for pending demo session
const pendingSessionId = localStorage.getItem('pendingDemoSessionId');
if (pendingSessionId) {
  try {
    await api.post(`/demo/sessions/${pendingSessionId}/claim`);
    localStorage.removeItem('pendingDemoSessionId');
    navigate(`/feedback/${pendingSessionId}`);
    return;
  } catch (error) {
    // Session already claimed or invalid - proceed to dashboard
    console.error('Failed to claim demo session:', error);
  }
}

// Normal callback flow
navigate('/');
```

#### 2.6 Update AuthContext
**File**: `ui/src/contexts/AuthContext.tsx`

Add method:
```typescript
const claimDemoSession = async (sessionId: string) => {
  await client.post(`/demo/sessions/${sessionId}/claim`);
  // Optionally refetch user data to update interviewsCompleted
};
```

#### 2.7 Update Login Flow
**File**: `ui/src/pages/Auth/Login.tsx`

Before redirecting to backend login:
```typescript
// If coming from feedback gate, store session ID
const searchParams = new URLSearchParams(window.location.search);
const returnSession = searchParams.get('session');
if (returnSession) {
  localStorage.setItem('pendingDemoSessionId', returnSession);
}
```

---

### Phase 3: Edge Cases & Polish

#### 3.1 Demo Token Expiry
**Backend**: Return 401 when demo token expired
**Frontend**: Catch 401, show modal: "Your demo session expired. Sign up to continue or start a new demo."

#### 3.2 Session Already Claimed
**Backend**: Check if `userId !== null` before claiming → return 400 "Session already claimed"
**Frontend**: Show message, redirect to dashboard

#### 3.3 Multiple Demos
**Strategy**: Only link the most recent demo (localStorage overwrites previous session ID)

#### 3.4 Cleanup Job
**New file**: `backend/src/interview/services/demo-cleanup.service.ts`

Scheduled job (daily):
- Delete demo sessions where `isDemo = true`, `userId = null`, `createdAt < 7 days ago`

#### 3.5 Analytics
Track in backend:
- Demo sessions started
- Demo sessions completed
- Demo → signup conversion rate (claimed demos / total completed demos)

---

### Phase 4: Security Hardening

#### Rate Limiting
- Demo creation: 5/hour per IP
- Conversation: 10 messages/min per demo session

#### Token Scope
Demo tokens ONLY valid for:
- Their specific session ID
- Interview endpoints (conversation, phase, diagram, transcript)
- NOT valid for: dashboard, feedback viewing, pricing, other sessions

#### Cookie Security
```typescript
res.cookie('demo_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 48 * 60 * 60 * 1000, // 48 hours
  domain: process.env.NODE_ENV === 'production' ? '.systemdesigntrainer.com' : undefined
})
```

#### Abuse Prevention
- Max 1 active demo session per IP
- Session fingerprinting (browser + IP hash)
- Cleanup unclaimed demos after 7 days

---

## Implementation Sequence

### Week 1: Core Backend (Days 1-3)
1. ✅ Create demo token service
2. ✅ Database migration (nullable userId, demo flags)
3. ✅ Update JWT auth guard (support demo tokens)
4. ✅ Create demo controller (create, start, claim endpoints)
5. ✅ Update session service (demo methods)
6. ✅ Update sessions controller (verifySessionAccess)

### Week 1: Frontend (Days 4-5)
7. ✅ Create demo landing page
8. ✅ Update App.tsx routes (remove auth gates)
9. ✅ Create FeedbackAuthGate component
10. ✅ Update Interview page (demo banner)
11. ✅ Update Auth callback (claim logic)
12. ✅ Update AuthContext (claim method)

### Week 2: Polish (Days 6-7)
13. ✅ Handle edge cases (expired tokens, already claimed)
14. ✅ Implement cleanup job
15. ✅ Add analytics tracking
16. ✅ Security hardening (rate limits)
17. ✅ End-to-end testing
18. ✅ Deploy to production

---

## Critical Files

### Backend (Must Modify)
- `backend/src/auth/guards/jwt-auth.guard.ts` - Support demo tokens
- `backend/src/interview/controllers/sessions.controller.ts` - Update ownership verification
- `backend/src/db/schema/interview-sessions.schema.ts` - Nullable userId, demo flags
- `backend/src/interview/services/interview-session.service.ts` - Demo session methods

### Backend (New Files)
- `backend/src/auth/services/demo-token.service.ts` - Demo token generation/validation
- `backend/src/interview/controllers/demo.controller.ts` - Demo endpoints
- `backend/src/interview/services/demo-cleanup.service.ts` - Cleanup job

### Frontend (Must Modify)
- `ui/src/App.tsx` - Route configuration
- `ui/src/pages/Interview/Interview.tsx` - Demo banner
- `ui/src/pages/Auth/Callback.tsx` - Session claiming logic
- `ui/src/contexts/AuthContext.tsx` - Claim method

### Frontend (New Files)
- `ui/src/pages/Demo/DemoLanding.tsx` - Demo entry point
- `ui/src/components/FeedbackAuthGate.tsx` - Signup gate for feedback

---

## Testing Strategy

### Unit Tests
- DemoTokenService: token generation/validation
- JWT Guard: demo vs regular token logic
- Session service: claim logic, ownership checks

### Integration Tests
- Create demo → start → complete → claim → view feedback
- Demo token expiry handling
- Rate limiting enforcement
- Feedback access denied for demo users

### E2E Tests
- Full anonymous flow: demo → complete → signup → feedback
- Edge cases: expired token, already claimed session
- Security: cross-session access attempts

---

## Rollback Plan
1. Remove demo routes from frontend (revert App.tsx)
2. Restore auth guards on interview routes
3. Disable demo endpoints (add `@Public()` removal)
4. Mark all demo sessions as regular (set isDemo = false) - optional
5. Keep schema changes for future use

---

## Success Metrics
After deployment, monitor:
- Demo completion rate (% who finish vs abandon)
- Demo → signup conversion rate (target: 20-30%)
- Time to signup after demo completion
- Demo session abuse attempts (rate limit hits)
