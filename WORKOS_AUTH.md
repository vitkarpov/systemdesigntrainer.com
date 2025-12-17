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

## Resources

- [WorkOS Docs](https://workos.com/docs)
- [WorkOS Node SDK](https://github.com/workos/workos-node)
- [WorkOS AuthKit Guide](https://workos.com/docs/user-management/authkit)
- [GitHub OAuth Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
