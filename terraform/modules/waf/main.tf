# ==================================
# WAF Web ACL for API ALB
# ==================================
# This WAF uses a whitelist approach - only allows specific API endpoints
# All other requests are blocked

resource "aws_wafv2_web_acl" "api_alb" {
  name  = "${var.project_name}-${var.environment}-api-waf"
  scope = "REGIONAL"

  default_action {
    block {}
  }

  # Rule 1: Allow whitelisted API endpoints
  rule {
    name     = "allow-api-endpoints"
    priority = 1

    action {
      allow {}
    }

    statement {
      or_statement {
        # Health endpoint
        statement {
          byte_match_statement {
            positional_constraint = "EXACTLY"
            search_string         = "/health"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        # Auth endpoints
        statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/auth/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        # Cases endpoints
        statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/cases"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        # Sessions endpoints
        statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/sessions"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        # Payments endpoints
        statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/payments"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-allowed-endpoints"
      sampled_requests_enabled   = false
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-${var.environment}-api-waf"
    sampled_requests_enabled   = false
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-waf"
    Environment = var.environment
  }
}

# ==================================
# Associate WAF with ALB
# ==================================

resource "aws_wafv2_web_acl_association" "api_alb" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.api_alb.arn
}

# ==================================
# CloudWatch Log Group for WAF Logs
# ==================================

resource "aws_cloudwatch_log_group" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  name              = "aws-waf-logs-${var.project_name}-${var.environment}-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-waf-logs"
    Environment = var.environment
  }
}

# ==================================
# WAF Logging Configuration
# ==================================

resource "aws_wafv2_web_acl_logging_configuration" "api_alb" {
  count = var.enable_logging ? 1 : 0

  resource_arn            = aws_wafv2_web_acl.api_alb.arn
  log_destination_configs = ["${aws_cloudwatch_log_group.waf_logs[0].arn}:*"]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }

  # Log sampling - only log blocked requests to reduce costs
  dynamic "logging_filter" {
    for_each = var.enable_log_sampling ? [1] : []
    content {
      default_behavior = "DROP"

      filter {
        behavior    = "KEEP"
        requirement = "MEETS_ANY"

        condition {
          action_condition {
            action = "BLOCK"
          }
        }
      }
    }
  }
}
