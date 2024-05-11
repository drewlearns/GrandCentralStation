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
  name            = "CognitoAuthorizer"
  type            = "COGNITO_USER_POOLS"
  rest_api_id     = aws_api_gateway_rest_api.this_api.id
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}
