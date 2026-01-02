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

### Connecting to Production Database

To connect to the production RDS database using Drizzle Studio, you need to establish a tunnel through the VPC since the database is in a private subnet.

#### Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. AWS Systems Manager Session Manager plugin installed:
   ```bash
   # macOS
   brew install --cask session-manager-plugin

   # Linux/Windows - follow AWS documentation:
   # https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
   ```

3. An EC2 instance in the VPC with:
   - SSM Agent installed (Amazon Linux 2/2023 AMIs have this by default)
   - IAM role with `AmazonSSMManagedInstanceCore` policy
   - Network access to RDS (must be in same VPC or have security group access)

#### Steps to Connect

1. Get database connection details:
   ```bash
   # Get RDS endpoint
   RDS_ENDPOINT=$(aws rds describe-db-instances \
     --db-instance-identifier sd-sim-production-postgres \
     --query 'DBInstances[0].Endpoint.Address' \
     --output text)

   # Get database name
   DB_NAME=$(aws rds describe-db-instances \
     --db-instance-identifier sd-sim-production-postgres \
     --query 'DBInstances[0].DBName' \
     --output text)

   # Get database username
   DB_USER=$(aws rds describe-db-instances \
     --db-instance-identifier sd-sim-production-postgres \
     --query 'DBInstances[0].MasterUsername' \
     --output text)

   echo "RDS Endpoint: $RDS_ENDPOINT"
   echo "Database Name: $DB_NAME"
   echo "Username: $DB_USER"
   ```

2. Get database password from AWS Secrets Manager:
   ```bash
   DB_PASSWORD=$(aws secretsmanager get-secret-value \
     --secret-id sd-sim-production-backend-secrets \
     --query 'SecretString' \
     --output text | jq -r '.DB_PASSWORD')

   echo "Password retrieved (length: ${#DB_PASSWORD})"
   ```

3. Find an EC2 instance to use as tunnel host:
   ```bash
   # List available EC2 instances in the VPC
   aws ec2 describe-instances \
     --filters "Name=tag:Name,Values=sd-sim-production-*" \
              "Name=instance-state-name,Values=running" \
     --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0]]' \
     --output table

   # Set the instance ID for the tunnel (use NAT instance or any other instance from above)
   INSTANCE_ID="<instance-id-from-above>"
   ```

   Note: You can use any EC2 instance in the VPC that has:
   - SSM Agent installed and running
   - IAM role with `AmazonSSMManagedInstanceCore` policy
   - Network access to the RDS instance

   The NAT instance (if used) is a good choice as it's always running and has access to the private subnets where RDS resides.

4. Start an SSM port forwarding session:
   ```bash
   aws ssm start-session \
     --target $INSTANCE_ID \
     --document-name AWS-StartPortForwardingSessionToRemoteHost \
     --parameters host="$RDS_ENDPOINT",portNumber="5432",localPortNumber="5433"
   ```

   Keep this terminal window open - the tunnel will remain active while this session runs.

5. In a new terminal, set environment variables and run Drizzle Studio:
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5433
   export DB_USER="<username-from-step-1>"
   export DB_PASSWORD="<password-from-step-2>"
   export DB_NAME="<database-name-from-step-1>"

   # Navigate to backend directory
   cd backend

   # Run Drizzle Studio
   npm run db:studio
   ```

6. Access Drizzle Studio at `https://local.drizzle.studio` in your browser

7. When finished, terminate the SSM session (Ctrl+C in the first terminal)

#### Alternative: SSH Bastion Host

If you prefer using an SSH bastion host:

```bash
# Port forward through bastion to RDS
ssh -i ~/.ssh/your-key.pem \
  -L 5433:<RDS_ENDPOINT>:5432 \
  ec2-user@<BASTION_PUBLIC_IP> \
  -N

# Then connect with the same environment variables as above
```

#### Security Notes

- Never commit production credentials to version control
- Use IAM database authentication when possible
- Rotate credentials regularly
- Ensure your local machine's IP is authorized if using bastion host with security groups
- SSM Session Manager is preferred as it doesn't require opening SSH ports or managing keys
- If using the NAT instance for tunneling, you may need to temporarily add an ingress rule to the RDS security group allowing connections from the NAT instance's security group

#### Troubleshooting

If you encounter connection issues:

1. Verify the EC2 instance has SSM Agent installed and an IAM role with `AmazonSSMManagedInstanceCore` policy
2. Check that the RDS security group allows connections from your tunnel host
3. Ensure the tunnel host is in the same VPC as the RDS instance
4. Verify the RDS endpoint and credentials are correct
5. Check CloudWatch Logs for SSM session logs if the tunnel fails to establish

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
