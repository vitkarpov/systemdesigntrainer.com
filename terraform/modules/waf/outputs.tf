output "web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.api_alb.id
}

output "web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.api_alb.arn
}

output "web_acl_capacity" {
  description = "Web ACL capacity units (WCU) used by this ACL"
  value       = aws_wafv2_web_acl.api_alb.capacity
}

output "log_group_name" {
  description = "Name of the CloudWatch Log Group for WAF logs"
  value       = aws_cloudwatch_log_group.waf_logs.name
}
