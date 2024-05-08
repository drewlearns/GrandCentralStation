provider "aws" {
  region = "us-east-1"
}

locals {
  role_policy_attachments = flatten([
    for lambda_name, lambda_details in var.lambdas : [
      for idx in range(length(lambda_details.policy_arns)) : {
        role_name  = lambda_name,
        policy_arn = lambda_details.policy_arns[idx],
        unique_id  = "${lambda_name}-${idx}"
      }
    ]
  ])
}

resource "aws_lambda_function" "this_lambda" {
  for_each = var.lambdas

  function_name = each.key
  handler       = "${each.key}.handler"
  role          = aws_iam_role.this_lambda_role[each.key].arn
  runtime       = each.value.runtime
  filename      = "./deploy/${each.key}.zip"
  tags = {
    Name = "each.key"
  }
  environment {
    variables = each.value.environment
  }
}

resource "aws_lambda_permission" "api_gateway_permission" {
  for_each      = var.lambdas
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = each.key
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this_api.execution_arn}/*/*"
  depends_on    = [aws_lambda_function.this_lambda]
}

resource "aws_iam_role" "this_lambda_role" {
  for_each = var.lambdas
  name     = "${each.key}_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

# Attach the AWSLambdaBasicExecutionRole policy to the IAM role
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  for_each = aws_iam_role.this_lambda_role # Match the same for_each used in the IAM role definition

  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attach" {
  for_each = { for att in local.role_policy_attachments : att.unique_id => att }

  role       = aws_iam_role.this_lambda_role[each.value.role_name].name
  policy_arn = each.value.policy_arn
}

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

  rest_api_id   = aws_api_gateway_rest_api.this_api.id
  resource_id   = aws_api_gateway_resource.this_resource[each.key].id
  http_method   = each.value.method
  authorization = each.value.authorization
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
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
  name                             = "CognitoAuthorizer"
  type                             = "COGNITO_USER_POOLS"
  rest_api_id                      = aws_api_gateway_rest_api.this_api.id
  provider_arns                    = [var.cognito_user_pool_arn]
  identity_source                  = "method.request.header.Authorization"
}
