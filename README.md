# React - NestJS - Full Stack Monorepo

A modern full-stack application built with **NestJS** backend and **React + Vite** frontend, organized as a simple yet powerful monorepo.

## 🏗️ Project Structure

```
root/
├── backend/          # NestJS API server
├── ui/              # React + Vite frontend
├── shared/          # Shared types and utilities
│   └── types/
├── package.json     # Root workspace configuration
└── README.md        # This file
```

## ✨ The Simple Monorepo Advantage

This project uses a **unified monorepo approach** that brings several key benefits:

### 🎯 Simplicity Benefits
- **Single Repository**: Everything in one place - no need to clone multiple repos
- **Unified Git History**: Track changes across frontend and backend together
- **Simplified Dependencies**: Shared tooling and configurations
- **Easy Cross-Project Refactoring**: Change APIs and frontend code simultaneously

### 🚀 Development Benefits
- **Type Safety Across Stack**: Share TypeScript types between frontend and backend
- **Atomic Commits**: Deploy related frontend and backend changes together
- **Consistent Tooling**: Same linting, formatting, and testing setup
- **Single Environment Setup**: One `.env` file, one setup process

### 📦 Deployment Benefits
- **Coordinated Releases**: Deploy frontend and backend together
- **Simplified CI/CD**: Single pipeline for the entire application
- **Shared Build Cache**: Faster builds with shared dependencies
- **Easy Rollbacks**: Roll back entire features, not just parts

## 🛠️ Technology Stack

### Backend (NestJS)
- **Framework**: NestJS - Enterprise-grade Node.js framework
- **Language**: TypeScript
- **Architecture**: Modular, decorator-based
- **Features**: Built-in validation, guards, interceptors

### Frontend (React + Vite)
- **Framework**: React 19
- **Build Tool**: Vite - Lightning fast development
- **Language**: TypeScript
- **Features**: Hot module replacement, optimized builds

### Shared
- **Types**: Shared TypeScript interfaces and types
- **Utilities**: Common functions and constants

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/saidheerajv/repo
   cd repo
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   
   # Install frontend dependencies
   cd ui
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit the .env file with your configuration
   ```

## 🔧 Development Workflow

### Starting the Development Servers

**Option 1: Run both servers simultaneously**
```bash
# From root directory
npm run dev
```

**Option 2: Run servers individually**
```bash
# Terminal 1 - Backend (runs on http://localhost:3000)
cd backend
npm run start:dev

# Terminal 2 - Frontend (runs on http://localhost:5173)
cd ui
npm run dev
```

### Development Features

- **🔥 Hot Reload**: Both frontend and backend support hot reloading
- **🔍 Type Checking**: Real-time TypeScript checking across the stack
- **🐛 Debugging**: VS Code debug configurations included
- **📝 API Documentation**: Swagger UI available at `/api/docs`

### Working with Shared Types

1. **Define types in** `shared/types/`
2. **Import in backend**: `import { UserType } from '../shared/types'`
3. **Import in frontend**: `import { UserType } from '../shared/types'`

### Code Quality

```bash
# Lint entire project
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Type check
npm run type-check
```

## 🏗️ Build Process

### Development Build
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ui
npm run build
```

### Production Build
```bash
# Build everything
npm run build:prod
```

This creates optimized builds:
- **Backend**: Compiled JavaScript in `backend/dist/`
- **Frontend**: Static files in `ui/dist/`

## 🚀 Deployment

### Deployment Options

#### 1. **Single Server Deployment**
Deploy both frontend and backend to the same server:

```bash
# Build production assets
npm run build:prod

# Backend serves frontend static files
# Frontend files served from backend/public/
```

#### 2. **Separate Deployment**
Deploy frontend and backend to different services:

**Backend** (Heroku, Railway, DigitalOcean App Platform):
```bash
cd backend
npm run build
npm run start:prod
```

**Frontend** (Vercel, Netlify, Cloudflare Pages):
```bash
cd ui
npm run build
# Deploy dist/ folder
```

#### 3. **Docker Deployment**
```dockerfile
# Multi-stage build for both services
FROM node:18-alpine as builder
# ... build both frontend and backend

FROM node:18-alpine as production
# ... serve optimized application
```

#### 4. **Cloud Platforms**

**Vercel** (Full Stack):
- Automatically detects and deploys both frontend and API routes

**Railway**:
- Single deployment with both services

**AWS/GCP/Azure**:
- Container-based deployment with both services

### Environment Configuration

Create environment-specific configuration:

```bash
# Development
.env.development

# Production
.env.production

# Testing
.env.test
```

### CI/CD Pipeline Example

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci
          cd ../ui && npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build:prod
      
      - name: Deploy
        run: npm run deploy
```

## 📱 API Integration

The frontend and backend are designed to work seamlessly:

- **Type-safe API calls**: Shared interfaces ensure type safety
- **Consistent error handling**: Unified error response format
- **Authentication**: JWT tokens shared between services
- **Real-time features**: WebSocket support for live updates

## 🔧 Configuration

### Package Scripts

**Root level** (`package.json`):
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run start:dev",
    "dev:frontend": "cd ui && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd ui && npm run build"
  }
}
```

### VS Code Settings

Included workspace settings for optimal development experience:
- **Unified linting**: ESLint configuration for both projects
- **Debugging**: Launch configurations for both services
- **Extensions**: Recommended extensions for the stack

## 📚 Documentation

- **API Documentation**: Available at `http://localhost:3000/api/docs` (Swagger)
- **Component Library**: Storybook available at `http://localhost:6006`
- **Type Documentation**: Generated from TypeScript interfaces

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Ensure both frontend and backend work together
4. **Test thoroughly**: Run all tests and type checks
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- **Type Safety**: Always use TypeScript interfaces
- **Testing**: Write tests for both frontend and backend
- **Documentation**: Update README and API docs
- **Consistency**: Follow established code style
- **Security**: Never commit sensitive data

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using NestJS, React, and the power of monorepo simplicity**
