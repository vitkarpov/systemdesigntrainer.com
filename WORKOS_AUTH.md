# WorkOS Authentication Implementation

**Last Updated:** 2025-12-17

## Overview

This document describes how authentication will work in sd-sim-2 using WorkOS AuthKit with GitHub OAuth. WorkOS provides a modern, developer-friendly authentication solution that handles the complexity of OAuth flows, session management, and user provisioning.

## Why WorkOS?

- **Production-ready AuthKit**: Drop-in authentication UI with customizable branding
- **Simplified OAuth**: WorkOS handles the GitHub OAuth flow complexity
- **Enterprise-ready**: Built for scale with security best practices
- **Developer experience**: Clean SDK, well-documented, minimal boilerplate
- **Multiple providers**: Easy to add Google, Microsoft, etc. later
- **Session management**: Built-in JWT handling and refresh tokens

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend   │────────▶│   WorkOS    │
│   (React)   │◀────────│  (NestJS)   │◀────────│   AuthKit   │
└─────────────┘         └─────────────┘         └─────────────┘
                               │                        │
                               │                        │
                               ▼                        ▼
                        ┌─────────────┐         ┌─────────────┐
                        │  PostgreSQL │         │   GitHub    │
                        │  (Users DB) │         │    OAuth    │
                        └─────────────┘         └─────────────┘
```

## Authentication Flow

### 1. User Initiates Login

```
User clicks "Sign in with GitHub"
    ↓
Frontend redirects to WorkOS AuthKit hosted UI
    ↓
WorkOS displays GitHub OAuth consent screen
```

### 2. GitHub OAuth Flow

```
User authorizes on GitHub
    ↓
GitHub redirects back to WorkOS callback URL
    ↓
WorkOS validates OAuth response
    ↓
WorkOS creates/updates user in their system
```

### 3. Callback & Session Creation

```
WorkOS redirects to our backend callback endpoint
    ↓
Backend receives authorization code
    ↓
Backend exchanges code for WorkOS session token (via WorkOS SDK)
    ↓
Backend retrieves user profile from WorkOS
    ↓
Backend creates/updates user in PostgreSQL
    ↓
Backend generates our own JWT with user info
    ↓
Backend redirects to frontend with JWT in cookie/header
```

### 4. Authenticated Requests

```
Frontend includes JWT in Authorization header
    ↓
Backend middleware validates JWT
    ↓
Backend extracts user ID from JWT
    ↓
Request proceeds with authenticated user context
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workos_user_id VARCHAR(255) UNIQUE NOT NULL,  -- WorkOS user ID
  github_id VARCHAR(255) UNIQUE,                 -- GitHub user ID
  github_username VARCHAR(255),                  -- GitHub username
  email VARCHAR(255) UNIQUE NOT NULL,            -- Email from GitHub
  name VARCHAR(255),                             -- Display name from GitHub
  avatar_url TEXT,                               -- GitHub profile picture

  -- Subscription info
  subscription_tier VARCHAR(50) DEFAULT 'free',  -- free, pro, pay_per_use
  interviews_remaining INTEGER DEFAULT 1,         -- For free/pay-per-use tiers
  subscription_expires_at TIMESTAMP,             -- For pro tier

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Index for fast WorkOS user lookup
CREATE INDEX idx_users_workos_user_id ON users(workos_user_id);

-- Index for GitHub user lookup
CREATE INDEX idx_users_github_id ON users(github_id);
```

### Update Interview Sessions Table

Add a foreign key to link sessions with users:

```sql
ALTER TABLE interview_sessions
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
```

## Backend Implementation

### Environment Variables

```bash
# WorkOS Configuration
WORKOS_API_KEY=sk_live_xxxxx                    # WorkOS API key
WORKOS_CLIENT_ID=client_xxxxx                   # WorkOS client ID
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT Configuration
JWT_SECRET=your-super-secret-key                # For signing JWTs
JWT_EXPIRES_IN=7d                               # JWT expiration

# Frontend URL (for redirects after auth)
FRONTEND_URL=http://localhost:5173
```

### NestJS Modules

#### 1. Auth Module

```typescript
// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WorkOSService } from './workos.service';
import { UserService } from '../user/user.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, WorkOSService, UserService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

#### 2. WorkOS Service

```typescript
// backend/src/auth/workos.service.ts
import { Injectable } from '@nestjs/common';
import { WorkOS } from '@workos-inc/node';

@Injectable()
export class WorkOSService {
  private workos: WorkOS;

  constructor() {
    this.workos = new WorkOS(process.env.WORKOS_API_KEY);
  }

  // Generate authorization URL for GitHub OAuth
  getAuthorizationUrl(state?: string): string {
    return this.workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',  // WorkOS AuthKit
      clientId: process.env.WORKOS_CLIENT_ID,
      redirectUri: process.env.WORKOS_REDIRECT_URI,
      state,
    });
  }

  // Exchange authorization code for user profile
  async authenticateWithCode(code: string) {
    const { user, accessToken } = await this.workos.userManagement.authenticateWithCode({
      clientId: process.env.WORKOS_CLIENT_ID,
      code,
    });

    return { user, accessToken };
  }

  // Get user profile from WorkOS
  async getUser(userId: string) {
    return await this.workos.userManagement.getUser(userId);
  }
}
```

#### 3. Auth Controller

```typescript
// backend/src/auth/auth.controller.ts
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Initiate GitHub OAuth flow via WorkOS
  @Get('login')
  async login(@Res() res: Response) {
    const authUrl = this.authService.getAuthorizationUrl();
    res.redirect(authUrl);
  }

  // Callback from WorkOS after OAuth
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    const { jwt, user } = await this.authService.handleCallback(code);

    // Redirect to frontend with JWT
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(`${frontendUrl}/auth/success?token=${jwt}`);
  }

  // Get current user (protected route)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    return req.user;
  }

  // Logout (invalidate JWT on client side)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
```

#### 4. Auth Service

```typescript
// backend/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WorkOSService } from './workos.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private workosService: WorkOSService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  getAuthorizationUrl(): string {
    return this.workosService.getAuthorizationUrl();
  }

  async handleCallback(code: string) {
    // Exchange code for WorkOS user
    const { user: workosUser, accessToken } =
      await this.workosService.authenticateWithCode(code);

    // Create or update user in our database
    const user = await this.userService.findOrCreateFromWorkOS(workosUser);

    // Generate our JWT
    const jwt = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      workosUserId: user.workosUserId,
    });

    return { jwt, user };
  }

  async validateUser(payload: any) {
    return await this.userService.findById(payload.sub);
  }
}
```

#### 5. User Service

```typescript
// backend/src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOrCreateFromWorkOS(workosUser: any): Promise<User> {
    // Check if user exists by WorkOS ID
    let user = await this.userRepository.findOne({
      where: { workosUserId: workosUser.id },
    });

    if (user) {
      // Update existing user
      user.email = workosUser.email;
      user.name = workosUser.firstName + ' ' + workosUser.lastName;
      user.githubUsername = workosUser.username; // From GitHub profile
      user.avatarUrl = workosUser.profilePictureUrl;
      user.lastLoginAt = new Date();
    } else {
      // Create new user
      user = this.userRepository.create({
        workosUserId: workosUser.id,
        email: workosUser.email,
        name: workosUser.firstName + ' ' + workosUser.lastName,
        githubUsername: workosUser.username,
        githubId: workosUser.rawAttributes?.github_id,
        avatarUrl: workosUser.profilePictureUrl,
        subscriptionTier: 'free',
        interviewsRemaining: 1,
        lastLoginAt: new Date(),
      });
    }

    return await this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    return await this.userRepository.findOne({ where: { id } });
  }
}
```

#### 6. JWT Strategy & Guard

```typescript
// backend/src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

// backend/src/auth/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### Protecting Routes

```typescript
// Example: Protect interview endpoints
@Controller('sessions')
export class InterviewSessionController {
  @Post()
  @UseGuards(JwtAuthGuard)
  async createSession(@Request() req) {
    // req.user is populated by JWT guard
    return this.sessionService.create(req.user.id);
  }
}
```

## Frontend Implementation

### 1. Login Button

```tsx
// frontend/src/components/LoginButton.tsx
export function LoginButton() {
  const handleLogin = () => {
    // Redirect to backend auth endpoint
    window.location.href = 'http://localhost:3000/auth/login';
  };

  return (
    <button onClick={handleLogin}>
      Sign in with GitHub
    </button>
  );
}
```

### 2. Auth Success Handler

```tsx
// frontend/src/pages/AuthSuccess.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Store JWT in localStorage
      localStorage.setItem('auth_token', token);

      // Redirect to dashboard
      navigate('/dashboard');
    }
  }, [searchParams, navigate]);

  return <div>Logging you in...</div>;
}
```

### 3. API Client with Auth

```typescript
// frontend/src/lib/api.ts
const API_BASE = 'http://localhost:3000/api';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired, redirect to login
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response.json();
}
```

### 4. Protected Routes

```tsx
// frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Usage in App.tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

## WorkOS Configuration

### 1. Create WorkOS Account
- Sign up at https://workos.com
- Create a new organization

### 2. Configure GitHub OAuth
- Go to WorkOS Dashboard → Authentication → Connections
- Add a new connection: GitHub OAuth
- Configure callback URLs:
  - Development: `http://localhost:3000/auth/callback`
  - Production: `https://yourdomain.com/auth/callback`

### 3. Get API Keys
- Go to WorkOS Dashboard → API Keys
- Copy API Key and Client ID
- Add to `.env` file

### 4. Configure AuthKit UI (Optional)
- Customize branding (logo, colors, text)
- Configure email/password if needed
- Enable/disable social providers

## Migration Path

### Phase 1: Setup (Week 4)
1. Install WorkOS SDK: `npm install @workos-inc/node`
2. Create database migration for users table
3. Implement WorkOS service and auth endpoints
4. Test OAuth flow in development

### Phase 2: Integration (Week 5)
1. Add JWT middleware to existing endpoints
2. Update interview session creation to link with users
3. Implement frontend login flow
4. Test end-to-end authentication

### Phase 3: User Features (Week 6)
1. Build user dashboard
2. Display past interviews
3. Track remaining interview quota
4. Add profile page

## Security Considerations

- **JWT Storage**: Store in httpOnly cookies (more secure) or localStorage (easier but vulnerable to XSS)
- **CSRF Protection**: Use SameSite cookies if storing JWT in cookies
- **Token Expiration**: Set reasonable expiry (7 days), implement refresh tokens if needed
- **HTTPS Only**: Enforce HTTPS in production
- **Rate Limiting**: Add rate limits to auth endpoints
- **Audit Logging**: Log authentication events

## Cost Estimate

WorkOS pricing (as of 2025):
- **Free tier**: Up to 1,000 monthly active users
- **Growth**: $0.05 per MAU after 1,000 users
- **Enterprise**: Custom pricing for advanced features

For MVP, we'll stay well within the free tier.

## Testing Strategy

### Unit Tests
- Test WorkOS service methods (mock SDK)
- Test auth service login flow
- Test JWT generation and validation

### Integration Tests
- Test complete OAuth flow with WorkOS sandbox
- Test protected routes with valid/invalid tokens
- Test user creation and updates

### Manual Testing Checklist
- [ ] User can sign in with GitHub
- [ ] User profile is created in database
- [ ] JWT is returned and stored
- [ ] Protected routes require authentication
- [ ] Token expiration redirects to login
- [ ] User can log out
- [ ] Subsequent logins update user info

## Alternative Considered

We considered these alternatives before choosing WorkOS:

1. **Clerk**: Similar to WorkOS but more expensive at scale
2. **Auth0**: More complex setup, enterprise-focused pricing
3. **NextAuth.js**: Great for Next.js but we're using NestJS backend
4. **Supabase Auth**: Requires Supabase ecosystem lock-in
5. **DIY with Passport.js**: More work, security risk, maintenance burden

WorkOS provides the best balance of simplicity, cost, and features for our use case.

## Resources

- [WorkOS Docs](https://workos.com/docs)
- [WorkOS Node SDK](https://github.com/workos/workos-node)
- [WorkOS AuthKit Guide](https://workos.com/docs/user-management/authkit)
- [GitHub OAuth Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
