module "lambdas" {
  source                = "./modules/lambdas"
  zone_id               = var.zone_id
  domain_name           = var.domain_name
  cognito_user_pool_arn = aws_cognito_user_pool.cognito_user_pool.arn

  lambdas = {
    "testLambda" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment   = {}
    },
    "createUser" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_cognito_create_user_policy.arn]
      environment   = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
      }
    }
    "confirmSignup" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.confirm_user_policy.arn]
      environment   = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
      }
    }
  }
}
