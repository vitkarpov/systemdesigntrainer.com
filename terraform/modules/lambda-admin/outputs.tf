output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.admin.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.admin.function_name
}

output "lambda_log_group_name" {
  description = "Name of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for Lambda images"
  value       = aws_ecr_repository.lambda.repository_url
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.lambda.name
}
