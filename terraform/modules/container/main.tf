# ==================================
# ECR Repository
# ==================================

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-${var.environment}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-backend"
  }
}

# ECR lifecycle policy (keep last 10 images, delete untagged after 7 days)
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ==================================
# CloudWatch Log Group
# ==================================

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-${var.environment}-backend"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-logs"
  }
}

# ==================================
# ECS Cluster
# ==================================

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "disabled" # Cost optimization: disable initially
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ==================================
# IAM Roles
# ==================================

# Task Execution Role (for ECS to pull image, write logs)
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-task-execution-role"
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "secrets_access" {
  name = "${var.project_name}-${var.environment}-secrets-access"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = var.secrets_arn
    }]
  })
}

# Task Role (for application to access AWS services)
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-task-role"
  }
}

# ==================================
# ECS Task Definition
# ==================================

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = var.backend_container_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = tostring(var.backend_container_port) },
      { name = "DB_HOST", value = var.rds_endpoint },
      { name = "DB_PORT", value = tostring(var.rds_port) },
      { name = "DB_USER", value = var.rds_username },
      { name = "DB_NAME", value = var.rds_database_name },
      { name = "REDIS_HOST", value = var.redis_endpoint },
      { name = "REDIS_PORT", value = tostring(var.redis_port) },
      { name = "FRONTEND_URL", value = "https://app.${var.domain_name}" },
      { name = "WORKOS_REDIRECT_URI", value = "https://api.${var.domain_name}/auth/callback" },
      { name = "ANTHROPIC_MODEL", value = "claude-haiku-4-5" }
    ]

    secrets = [
      { name = "DB_PASSWORD", valueFrom = "${var.secrets_arn}:DB_PASSWORD::" },
      { name = "JWT_SECRET", valueFrom = "${var.secrets_arn}:JWT_SECRET::" },
      { name = "ANTHROPIC_API_KEY", valueFrom = "${var.secrets_arn}:ANTHROPIC_API_KEY::" },
      { name = "WORKOS_CLIENT_ID", valueFrom = "${var.secrets_arn}:WORKOS_CLIENT_ID::" },
      { name = "WORKOS_API_KEY", valueFrom = "${var.secrets_arn}:WORKOS_API_KEY::" },
      { name = "STRIPE_SECRET_KEY", valueFrom = "${var.secrets_arn}:STRIPE_SECRET_KEY::" },
      { name = "STRIPE_WEBHOOK_SECRET", valueFrom = "${var.secrets_arn}:STRIPE_WEBHOOK_SECRET::" },
      { name = "STRIPE_PRICE_3_INTERVIEWS", valueFrom = "${var.secrets_arn}:STRIPE_PRICE_3_INTERVIEWS::" },
      { name = "STRIPE_PRICE_5_INTERVIEWS", valueFrom = "${var.secrets_arn}:STRIPE_PRICE_5_INTERVIEWS::" },
      { name = "STRIPE_PRICE_UNLIMITED", valueFrom = "${var.secrets_arn}:STRIPE_PRICE_UNLIMITED::" }
    ]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${var.backend_container_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-task"
  }
}

# ==================================
# ECS Service
# ==================================

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "backend"
    container_port   = var.backend_container_port
  }

  health_check_grace_period_seconds = 60

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  enable_execute_command = true # For debugging with ECS Exec

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-service"
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution]
}

# ==================================
# Auto Scaling
# ==================================

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.ecs_max_count
  min_capacity       = var.ecs_min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${var.project_name}-${var.environment}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.ecs_target_cpu_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
