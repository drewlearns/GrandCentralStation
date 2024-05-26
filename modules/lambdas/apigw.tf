resource "aws_api_gateway_rest_api" "this_api" {
  name        = "TPPB_API"
  description = "API Gateway for Lambda functions"
}

resource "aws_api_gateway_resource" "this_resource" {
  for_each    = var.lambdas
  rest_api_id = aws_api_gateway_rest_api.this_api.id
  parent_id   = aws_api_gateway_rest_api.this_api.root_resource_id
  path_part   = each.key
}

resource "aws_api_gateway_method" "this_method" {
  for_each = var.lambdas

  rest_api_id      = aws_api_gateway_rest_api.this_api.id
  resource_id      = aws_api_gateway_resource.this_resource[each.key].id
  http_method      = each.value.method
  authorization    = each.value.authorization
  authorizer_id    = aws_api_gateway_authorizer.cognito_authorizer.id
  api_key_required = true
}

resource "aws_api_gateway_integration" "lambda_integration" {
  for_each = var.lambdas

  rest_api_id = aws_api_gateway_rest_api.this_api.id
  resource_id = aws_api_gateway_resource.this_resource[each.key].id
  http_method = aws_api_gateway_method.this_method[each.key].http_method

  integration_http_method = each.value.method
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.this_lambda[each.key].invoke_arn
}

resource "aws_api_gateway_deployment" "this_deployment" {
  depends_on = [
    aws_api_gateway_integration.lambda_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.this_api.id
  stage_name  = "v1"
}

resource "aws_api_gateway_authorizer" "cognito_authorizer" {
  name            = "CognitoAuthorizer"
  type            = "COGNITO_USER_POOLS"
  rest_api_id     = aws_api_gateway_rest_api.this_api.id
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

# Generate a random string for the API key
resource "random_string" "api_key" {
  length  = 32
  special = false
}

# Add API Key
resource "aws_api_gateway_api_key" "this_api_key" {
  name        = "MyAPIKey"
  description = "API Key for my API Gateway"
  enabled     = true
  value       = random_string.api_key.result
}

# Create a usage plan
resource "aws_api_gateway_usage_plan" "this_usage_plan" {
  name        = "MyUsagePlan"
  description = "Usage plan for my API Gateway"
  api_stages {
    api_id = aws_api_gateway_rest_api.this_api.id
    stage  = aws_api_gateway_deployment.this_deployment.stage_name
  }
}

# Associate API Key with Usage Plan
resource "aws_api_gateway_usage_plan_key" "this_usage_plan_key" {
  key_id        = aws_api_gateway_api_key.this_api_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.this_usage_plan.id
}

resource "aws_secretsmanager_secret" "api_key_secret" {
  name = "api-secret"
}

resource "aws_secretsmanager_secret_version" "api_key_secret_version" {
  secret_id     = aws_secretsmanager_secret.api_key_secret.id
  secret_string = <<EOF
{
  "api_key": "${random_string.api_key.result}"
}
EOF
}
