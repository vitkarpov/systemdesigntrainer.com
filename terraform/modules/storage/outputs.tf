output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgresql.endpoint
}

output "rds_address" {
  description = "RDS instance address (without port)"
  value       = aws_db_instance.postgresql.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.postgresql.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgresql.db_name
}

output "rds_username" {
  description = "RDS master username"
  value       = aws_db_instance.postgresql.username
  sensitive   = true
}

output "rds_password" {
  description = "RDS master password"
  value       = random_password.rds_password.result
  sensitive   = true
}

output "rds_connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${aws_db_instance.postgresql.username}:${random_password.rds_password.result}@${aws_db_instance.postgresql.endpoint}/${aws_db_instance.postgresql.db_name}"
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].port
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}"
}
