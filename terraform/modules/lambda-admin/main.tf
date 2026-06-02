# ==================================
# ECR Repository for Lambda
# ==================================

resource "aws_ecr_repository" "lambda" {
  name                 = "${var.project_name}-${var.environment}-lambda-admin"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-admin"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECR lifecycle policy
resource "aws_ecr_lifecycle_policy" "lambda" {
  repository = aws_ecr_repository.lambda.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 3 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ==================================
# Lambda IAM Role
# ==================================

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-${var.environment}-lambda-admin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-admin-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Attach AWS managed policies for Lambda execution
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom policy for Secrets Manager access
resource "aws_iam_policy" "lambda_secrets" {
  name        = "${var.project_name}-${var.environment}-lambda-secrets"
  description = "Allow Lambda to read secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.secrets_arn
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-secrets-policy"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "lambda_secrets" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_secrets.arn
}

# Custom policy for sending email via SES
resource "aws_iam_policy" "lambda_ses" {
  name        = "${var.project_name}-${var.environment}-lambda-ses"
  description = "Allow Lambda to send emails via SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-ses-policy"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "lambda_ses" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_ses.arn
}

# Lambda Security Group
resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-${var.environment}-lambda-admin"
  description = "Security group for Lambda admin functions"
  vpc_id      = var.vpc_id

  # Egress to RDS (PostgreSQL)
  egress {
    from_port       = var.rds_port
    to_port         = var.rds_port
    protocol        = "tcp"
    security_groups = [var.rds_security_group_id]
    description     = "Allow PostgreSQL to RDS"
  }

  # Egress to Redis
  egress {
    from_port       = var.redis_port
    to_port         = var.redis_port
    protocol        = "tcp"
    security_groups = [var.redis_security_group_id]
    description     = "Allow Redis access"
  }

  # Egress to Secrets Manager API (HTTPS)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS for Secrets Manager API"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-admin-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Allow Lambda to access RDS (ingress rule on RDS security group)
resource "aws_security_group_rule" "lambda_to_rds" {
  type                     = "ingress"
  from_port                = var.rds_port
  to_port                  = var.rds_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda.id
  security_group_id        = var.rds_security_group_id
  description              = "Allow PostgreSQL from Lambda admin functions"
}

# Allow Lambda to access Redis (ingress rule on Redis security group)
resource "aws_security_group_rule" "lambda_to_redis" {
  type                     = "ingress"
  from_port                = var.redis_port
  to_port                  = var.redis_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda.id
  security_group_id        = var.redis_security_group_id
  description              = "Allow Redis from Lambda admin functions"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-admin"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Lambda Function (using container image)
resource "aws_lambda_function" "admin" {
  function_name = "${var.project_name}-${var.environment}-admin"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri

  architectures = ["arm64"]
  memory_size   = 512
  timeout       = 30

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST                = var.rds_endpoint
      DB_PORT                = tostring(var.rds_port)
      DB_USER                = var.rds_username
      DB_NAME                = var.rds_database_name
      DB_PASSWORD_SECRET_ARN = var.secrets_arn
      REDIS_HOST             = var.redis_endpoint
      REDIS_PORT             = tostring(var.redis_port)
      NODE_ENV               = var.environment
      AWS_SES_FROM_EMAIL     = var.ses_from_email
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_vpc,
    aws_iam_role_policy_attachment.lambda_secrets,
    aws_iam_role_policy_attachment.lambda_ses
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-admin"
    Environment = var.environment
    Project     = var.project_name
  }

  # Ignore changes to image_uri to prevent drift when image is updated externally
  lifecycle {
    ignore_changes = [image_uri]
  }
}
