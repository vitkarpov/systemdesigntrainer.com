# Admin Lambda Functions

This directory contains AWS Lambda functions for administrative operations, deployed as Docker containers.

## Architecture

The Lambda function uses a **router pattern** where a single function handles multiple operations based on the `operation` field in the event payload.

View logs:
```bash
aws logs tail /aws/lambda/sd-sim-production-admin --follow
```

### Benefits
- **Cost-effective**: Single function means lower fixed costs
- **Easier maintenance**: Shared database connection, logging, and error handling
- **Simpler deployment**: One Docker image to build and deploy
- **Consistent with API**: Same Docker-based deployment as the main application
- **Consistent patterns**: All operations follow the same structure

## Event Structure

```typescript
{
  "operation": "operation-name",
  "payload": {
    // Operation-specific payload
  }
}
```

## Available Operations

### `add-credits`

Add or remove interview credits from a user's account.

**Payload:**
```typescript
{
  workosUserId: string;  // Required: WorkOS user ID
  credits: number;       // Required: Credits to add (negative to subtract)
  reason?: string;       // Optional: Reason for adjustment
}
```

**Example:**
```bash
aws lambda invoke \
  --function-name sd-sim-production-admin \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "operation": "add-credits",
    "payload": {
      "workosUserId": "user_01HXXX",
      "credits": 5,
      "reason": "Customer support - promotional credit"
    }
  }' \
  --region eu-west-1 \
  response.json

cat response.json
```

**Response:**
```json
{
  "success": true,
  "operation": "add-credits",
  "data": {
    "userId": 42,
    "workosUserId": "user_01HXXX",
    "email": "user@example.com",
    "creditsAdded": 5,
    "previousBalance": 3,
    "newBalance": 8,
    "updatedAt": "2024-01-05T12:34:56.789Z"
  }
}
```

### `generate-feedback`

Manually trigger feedback generation for a completed interview session. This enqueues a job to the Bull queue, which will asynchronously generate feedback using the existing feedback processor.

**Use case:** When the UI never calls the POST feedback endpoint, use this to manually generate feedback for a session.

**Payload:**
```typescript
{
  sessionId: number;     // Required: Session ID to generate feedback for
  regenerate: boolean;  // Delete existing feedback and regenerate
}
```

**Example:**
```bash
aws lambda invoke \
  --function-name sd-sim-production-admin \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "operation": "generate-feedback",
    "payload": {
      "sessionId": 123,
      "regenerate": false
    }
  }' \
  --region eu-west-1 \
  response.json

cat response.json
```
```

**Response (success - job enqueued):**
```json
{
  "success": true,
  "operation": "generate-feedback",
  "data": {
    "sessionId": 123,
    "jobId": "abc123",
    "status": "queued",
    "alreadyExists": false
  }
}
```

**Response (feedback already exists):**
```json
{
  "success": true,
  "operation": "generate-feedback",
  "data": {
    "sessionId": 123,
    "jobId": "N/A",
    "status": "already_exists",
    "alreadyExists": true
  }
}
```

**Note:** The job is processed asynchronously by the existing `FeedbackProcessor`. Check the Bull queue or database for completion status.

## Deployment

### Initial Setup

1. **Deploy Terraform infrastructure** (creates ECR repository):
   ```bash
   cd terraform
   terraform init
   terraform apply -target=module.lambda_admin.aws_ecr_repository.lambda
   ```

2. **Get ECR repository URL**:
   ```bash
   terraform output -json | jq -r '.lambda_admin.value.ecr_repository_url'
   # Or from AWS CLI:
   aws ecr describe-repositories --repository-names sd-sim-production-lambda-admin --query 'repositories[0].repositoryUri' --output text
   ```

3. **Build and push Docker image**:
   ```bash
   cd ../api

   # Login to ECR
   aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com

   # Build for ARM64 (Lambda uses ARM64 architecture)
   docker buildx build --platform linux/arm64 -f Dockerfile.lambda -t <ecr-repo-url>:latest --push .
   ```

4. **Update Terraform variable** in `terraform/terraform.tfvars`:
   ```hcl
   lambda_image_uri = "<account-id>.dkr.ecr.eu-west-1.amazonaws.com/sd-sim-production-lambda-admin:latest"
   ```

5. **Deploy Lambda function**:
   ```bash
   cd ../terraform
   terraform apply
   ```

### Updating Lambda Code

After making changes to the Lambda code:

```bash
cd api

# Build and push new image
docker buildx build --platform linux/arm64 -f Dockerfile.lambda \
  -t <ecr-repo-url>:latest \
  -t <ecr-repo-url>:v$(date +%Y%m%d-%H%M%S) \
  --push .

# Lambda will automatically use the new :latest image on next cold start
# Or force update:
aws lambda update-function-code \
  --function-name sd-sim-production-admin \
  --image-uri <ecr-repo-url>:latest \
  --region eu-west-1
```

### Dockerfile

The Lambda function uses `Dockerfile.lambda` which:
- Extends AWS Lambda's official Node.js 20 base image
- Builds the TypeScript code
- Installs only production dependencies (drizzle-orm, pg, @aws-sdk/client-secrets-manager)
- Copies Lambda handler and database schema
- Targets ARM64 architecture for cost optimization

## Adding New Operations

To add a new operation:

1. **Define types** in `types/operations.types.ts`:
   ```typescript
   export interface MyOperationPayload {
     // ...
   }

   export interface MyOperationData {
     // ...
   }

   export type MyOperationEvent = AdminOperationEvent<MyOperationPayload> & {
     operation: 'my-operation';
   };

   export type MyOperationResponse = AdminOperationResponse<MyOperationData> & {
     operation: 'my-operation';
   };
   ```

2. **Create handler** in `operations/my-operation.ts`:
   ```typescript
   import type { MyOperationPayload, MyOperationResponse } from '../types/operations.types';
   import type { Database } from '../db-connection';

   export async function myOperation(
     db: Database,
     payload: MyOperationPayload,
   ): Promise<MyOperationResponse> {
     // Validate input
     // Perform operation
     // Return response
   }
   ```

3. **Register route** in `handler.ts`:
   ```typescript
   import { myOperation } from './operations/my-operation';

   // In the switch statement:
   case 'my-operation':
     result = await myOperation(db, event.payload as MyOperationPayload);
     break;
   ```

4. **Build and deploy**:
   ```bash
   cd api
   docker buildx build --platform linux/arm64 -f Dockerfile.lambda -t <ecr-repo-url>:latest --push .
   aws lambda update-function-code --function-name sd-sim-production-admin --image-uri <ecr-repo-url>:latest
   ```

## Local Development

The lambda function can be run locally using Docker Compose, which provides a complete environment with PostgreSQL and Redis.

**Start services:**
```bash
cd api
docker-compose up -d
```

The lambda function will be available at `http://localhost:9000/2015-03-31/functions/function/invocations`

**Environment Configuration:**

The lambda service is configured in `docker-compose.yml` with these settings:
```yaml
environment:
  DB_HOST: postgres
  DB_PORT: 5432
  DB_USER: postgres
  DB_PASSWORD: postgres
  DB_NAME: sd_sim_dev
  REDIS_HOST: redis
  REDIS_PORT: 6379
  AWS_REGION: eu-west-1
  USE_DIRECT_PASSWORD: "true"  # Skip AWS Secrets Manager for local dev
  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  USE_AI_FEEDBACK: ${USE_AI_FEEDBACK:-false}
```

**Test Lambda Invocation:**

```bash
# Add credits
curl -X POST http://localhost:9000/2015-03-31/functions/function/invocations \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add-credits",
    "payload": {
      "workosUserId": "user_123",
      "credits": 10,
      "reason": "Testing local lambda"
    }
  }'

# Generate feedback
curl -X POST http://localhost:9000/2015-03-31/functions/function/invocations \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "generate-feedback",
    "payload": {
      "sessionId": 1,
      "regenerate": true
    }
  }'
```

**View logs:**
```bash
# View lambda logs
docker-compose logs -f lambda

# View all service logs
docker-compose logs -f
```

**Stop services:**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v
```