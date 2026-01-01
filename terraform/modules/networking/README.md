# Networking Module

This module creates the VPC infrastructure for the System Design Interview Simulator application.

## Resources Created

- **VPC** with DNS support enabled
- **Internet Gateway** for public internet access
- **Public Subnets** (2 AZs) for Application Load Balancer
- **Private Subnets** (2 AZs) for ECS, RDS, and Redis
- **NAT Solution** (Instance or Gateway) for private subnet outbound access
- **Route Tables** for public and private subnets
- **Security Groups** for ALB, ECS, RDS, Redis, and NAT

## Cost Optimization

The module supports using a **NAT Instance** instead of NAT Gateway to save ~$29/month:

- **NAT Gateway**: $0.045/hour (~$32/month) + data transfer costs
- **NAT Instance** (t4g.nano): $0.0042/hour (~$3/month) + data transfer costs

Set `use_nat_instance = true` to use the cost-optimized NAT instance.

## Security Groups

### ALB Security Group
- **Inbound**: HTTP (80) and HTTPS (443) from anywhere
- **Outbound**: All traffic

### ECS Security Group
- **Inbound**: Port 3000 from ALB only
- **Outbound**: All traffic (for external API calls, ECR pulls)

### RDS Security Group
- **Inbound**: PostgreSQL (5432) from ECS only
- **Outbound**: All traffic

### Redis Security Group
- **Inbound**: Redis (6379) from ECS only
- **Outbound**: All traffic

### NAT Instance Security Group (if enabled)
- **Inbound**: All traffic from private subnets
- **Outbound**: All traffic

## Usage

```hcl
module "networking" {
  source = "./modules/networking"

  project_name          = var.project_name
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  use_nat_instance      = var.use_nat_instance
  backend_container_port = var.backend_container_port
}
```

## Inputs

| Name | Description | Type | Default |
|------|-------------|------|---------|
| project_name | Project name for resource naming | string | - |
| environment | Environment name | string | - |
| vpc_cidr | CIDR block for VPC | string | - |
| availability_zones | List of availability zones | list(string) | - |
| use_nat_instance | Use NAT instance (true) or NAT Gateway (false) | bool | true |
| backend_container_port | Backend container port | number | 3000 |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | VPC ID |
| vpc_cidr | VPC CIDR block |
| public_subnet_ids | Public subnet IDs |
| private_subnet_ids | Private subnet IDs |
| alb_security_group_id | ALB security group ID |
| ecs_security_group_id | ECS security group ID |
| rds_security_group_id | RDS security group ID |
| redis_security_group_id | Redis security group ID |
| nat_instance_id | NAT instance ID (if used) |
| nat_gateway_ids | NAT Gateway IDs (if used) |

## Notes

- The NAT instance uses Amazon Linux 2 with IP forwarding and iptables configured
- Private subnets route through NAT for outbound access
- Multi-AZ deployment for high availability (2 availability zones)
- Source/destination check disabled on NAT instance for routing
