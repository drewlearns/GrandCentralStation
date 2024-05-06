resource "aws_wafv2_web_acl" "web_acl" {
  name        = "apiWebACL"
  scope       = "REGIONAL"
  description = "Web ACL to restrict API Gateway requests by host header and protect against DDoS"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WebACL"
    sampled_requests_enabled   = true
  }
}
data "aws_caller_identity" "current" {}

resource "aws_wafv2_web_acl_association" "api_gateway_association" {
  resource_arn = "arn:aws:apigateway:us-east-1::/restapis/${aws_api_gateway_rest_api.this_api.id}/stages/${aws_api_gateway_deployment.this_deployment.stage_name}"
  web_acl_arn  = aws_wafv2_web_acl.web_acl.arn
}