# api.systemdesigntrainer.com

## Description

Backend API for the System Design Interview Simulator platform. Built with NestJS, this service provides interview session management, AI-powered system design feedback, authentication, and payment processing.

## Tech Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: WorkOS
- **Payments**: Stripe
- **AI**: Anthropic Claude API
- **Queue**: Bull (Redis)
- **Error Tracking**: Sentry
- **Deployment**: AWS (ECS + Lambda)
- **API Documentation**: OpenAPI/Swagger

## Project Structure

```
api/
├── src/
│   ├── ai/              # AI integration (Anthropic)
│   ├── auth/            # Authentication (WorkOS, JWT)
│   ├── interview/       # Interview session management
│   ├── payments/        # Stripe payment processing
│   ├── db/              # Database schema and migrations (Drizzle)
│   └── redis/           # Redis connection
├── lambda/              # AWS Lambda functions
│   ├── handler.ts       # Lambda entry point
│   ├── operations/      # Lambda operations (admin tasks)
│   └── types/           # Lambda type definitions
├── test/                # E2E tests
└── public/              # Static assets
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+ (for Bull queue)
- Docker and Docker Compose (recommended)

## Installation

```bash
$ npm install
```

## Environment Variables

See [sops](./SOPS.md).

## Running the app

### Development

```bash
# watch mode
$ npm run start:dev

# debug mode
$ npm run start:debug
```

### Production

```bash
# build
$ npm run build

# run production
$ npm run start:prod
```

## Docker

### Docker Compose (recommended)

A `docker-compose.yml` file is available at the project root that includes the backend, PostgreSQL, Redis, and pgAdmin services.

From the project root directory:

```bash
# Start all services (backend, postgres, redis, pgadmin)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

The compose file uses environment variables from your `.env` file. Make sure all required variables are set before starting.

### Build the Docker image (standalone)

```bash
# Build the API image
docker build -t sd-sim-backend .

# Build the Lambda image
docker buildx build --platform linux/arm64 -f Dockerfile.lambda -t sd-sim-lambda .
```

### Container Management

```bash
# View logs
docker logs sd-sim-backend

# Stop container
docker stop sd-sim-backend

# Remove container
docker rm sd-sim-backend

# Remove image
docker rmi sd-sim-backend
```

## Stripe Webhook Testing

For local development with Stripe webhooks, use the Stripe CLI to forward webhook events to your local server:

```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```

This command will:
- Forward Stripe webhook events to your local development server
- Provide a webhook signing secret that you'll need to add to your `.env` file as `STRIPE_WEBHOOK_SECRET`
- Allow you to test webhook integrations without deploying

## Database

### Local Development

```bash
# Generate migrations
$ npm run db:generate

# Push schema to database
$ npm run db:push

# Seed database
$ npm run db:seed

# Open Drizzle Studio
$ npm run db:studio
```

## AWS Lambda Functions

The project includes AWS Lambda functions for admin operations (e.g., adding credits to user accounts).

### Build and Deploy Lambda

```bash
# Build and push Lambda Docker image to ECR, then update Lambda function
./build-lambda.sh
```

The Lambda functions are packaged as Docker containers and deployed to AWS Lambda using ECR.

See [lambda/README.md](lambda/README.md) for more details on Lambda operations.

## API Documentation

When running the server, OpenAPI/Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

To generate the OpenAPI spec file for the frontend:

```bash
npm run openapi:generate
```

This generates `../ui/src/api/openapi.json`.

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov

# test setup (test database)
$ npm run db:test:setup
```
