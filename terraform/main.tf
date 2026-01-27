# ==================================
# DNS Module (First - needed for ACM certificates)
# ==================================

module "dns" {
  source = "./modules/dns"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name

  # These values come from ALB and CloudFront modules
  # Terraform will automatically handle the dependency order
  alb_dns_name                   = module.alb.alb_dns_name
  alb_zone_id                    = module.alb.alb_zone_id
  cloudfront_domain_name         = module.frontend.cloudfront_domain_name
  cloudfront_zone_id             = module.frontend.cloudfront_zone_id
  website_cloudfront_domain_name = module.landing.cloudfront_domain_name
  website_cloudfront_zone_id     = module.landing.cloudfront_zone_id

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

# ==================================
# Networking Module
# ==================================

module "networking" {
  source = "./modules/networking"

  project_name           = var.project_name
  environment            = var.environment
  vpc_cidr               = var.vpc_cidr
  availability_zones     = var.availability_zones
  use_nat_instance       = var.use_nat_instance
  backend_container_port = var.backend_container_port
}

# ==================================
# Storage Module (RDS & Redis)
# ==================================

module "storage" {
  source = "./modules/storage"

  project_name            = var.project_name
  environment             = var.environment
  private_subnet_ids      = module.networking.private_subnet_ids
  rds_security_group_id   = module.networking.rds_security_group_id
  redis_security_group_id = module.networking.redis_security_group_id

  # RDS Configuration
  rds_instance_class        = var.rds_instance_class
  rds_allocated_storage     = var.rds_allocated_storage
  rds_database_name         = var.rds_database_name
  rds_username              = var.rds_username
  enable_multi_az_rds       = var.enable_multi_az_rds
  rds_backup_retention_days = var.rds_backup_retention_days

  # Redis Configuration
  redis_node_type               = var.redis_node_type
  redis_num_cache_nodes         = var.redis_num_cache_nodes
  redis_snapshot_retention_limit = var.redis_snapshot_retention_limit

  log_retention_days = var.log_retention_days
}

# ==================================
# Secrets Module
# ==================================

module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment
  rds_password = module.storage.rds_password
  jwt_secret   = var.jwt_secret
  secrets      = var.secrets
}

# ==================================
# Lambda Admin Module
# ==================================

module "lambda_admin" {
  source = "./modules/lambda-admin"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Networking
  vpc_id                  = module.networking.vpc_id
  private_subnet_ids      = module.networking.private_subnet_ids
  rds_security_group_id   = module.networking.rds_security_group_id
  redis_security_group_id = module.networking.redis_security_group_id

  # Database
  rds_endpoint      = module.storage.rds_address
  rds_port          = module.storage.rds_port
  rds_username      = module.storage.rds_username
  rds_database_name = module.storage.rds_database_name
  secrets_arn       = module.secrets.secret_arn

  # Redis
  redis_endpoint = module.storage.redis_endpoint
  redis_port     = module.storage.redis_port

  # Lambda image (use placeholder for initial deployment, then update with actual image)
  # After initial terraform apply, build and push the image, then update this
  lambda_image_uri = var.lambda_image_uri

  log_retention_days = var.log_retention_days
}

# ==================================
# ALB Module
# ==================================

module "alb" {
  source = "./modules/alb"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.networking.vpc_id
  public_subnet_ids      = module.networking.public_subnet_ids
  alb_security_group_id  = module.networking.alb_security_group_id
  acm_certificate_arn    = module.dns.acm_certificate_arn_alb
  backend_container_port = var.backend_container_port
}

# ==================================
# WAF Module (API ALB Protection)
# ==================================

module "waf" {
  source = "./modules/waf"

  project_name       = var.project_name
  environment        = var.environment
  alb_arn            = module.alb.alb_arn
  log_retention_days = var.log_retention_days
}

# ==================================
# Frontend Module (S3 + CloudFront)
# ==================================

module "frontend" {
  source = "./modules/frontend"

  project_name                = var.project_name
  environment                 = var.environment
  domain_name                 = var.domain_name
  acm_certificate_arn         = module.dns.acm_certificate_arn_cloudfront
  acm_certificate_validation  = module.dns.acm_certificate_validation_cloudfront
  cloudfront_price_class      = var.cloudfront_price_class
}

# ==================================
# Website Module (S3 + CloudFront)
# ==================================

module "landing" {
  source = "./modules/website"

  project_name                = var.project_name
  environment                 = var.environment
  domain_name                 = var.domain_name
  acm_certificate_arn         = module.dns.acm_certificate_arn_cloudfront
  acm_certificate_validation  = module.dns.acm_certificate_validation_cloudfront
  cloudfront_price_class      = var.cloudfront_price_class
}

# ==================================
# Container Module (ECR + ECS Fargate)
# ==================================

module "container" {
  source = "./modules/container"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
  domain_name  = var.domain_name

  # Networking
  private_subnet_ids    = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  target_group_arn      = module.alb.target_group_arn

  # Storage
  secrets_arn       = module.secrets.secret_arn
  rds_endpoint      = module.storage.rds_address
  rds_port          = module.storage.rds_port
  rds_username      = module.storage.rds_username
  rds_database_name = module.storage.rds_database_name
  redis_endpoint    = module.storage.redis_endpoint
  redis_port        = module.storage.redis_port

  # ECS Configuration
  ecs_task_cpu               = var.ecs_task_cpu
  ecs_task_memory            = var.ecs_task_memory
  ecs_desired_count          = var.ecs_desired_count
  ecs_min_count              = var.ecs_min_count
  ecs_max_count              = var.ecs_max_count
  ecs_target_cpu_utilization = var.ecs_target_cpu_utilization
  backend_container_port     = var.backend_container_port
  log_retention_days         = var.log_retention_days
}
