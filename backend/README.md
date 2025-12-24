<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

System Design Interview Simulator API - Backend service built with [Nest](https://github.com/nestjs/nest) framework.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or Docker

## Installation

```bash
$ npm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `ANTHROPIC_API_KEY` - Anthropic API key for AI features
- `WORKOS_CLIENT_ID`, `WORKOS_API_KEY` - WorkOS authentication
- `JWT_SECRET` - JWT secret key (minimum 32 characters)

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

### Build the Docker image

```bash
docker build -t sd-sim-backend .
```

### Run the container

```bash
docker run -d \
  --name sd-sim-backend \
  -p 3000:3000 \
  --env-file .env \
  sd-sim-backend
```

Or with environment variables:

```bash
docker run -d \
  --name sd-sim-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  -e ANTHROPIC_API_KEY=your_key \
  -e WORKOS_CLIENT_ID=your_client_id \
  -e WORKOS_API_KEY=your_api_key \
  -e WORKOS_REDIRECT_URI=https://yourdomain.com/api/auth/callback \
  -e JWT_SECRET=your_secret \
  sd-sim-backend
```

### Docker Compose (recommended)

A `docker-compose.yml` file is available at the project root that includes the backend, PostgreSQL, and pgAdmin services.

From the project root directory:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

The compose file uses environment variables from your `.env` file. Make sure all required variables are set before starting.

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

## Database

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

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
