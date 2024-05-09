module "lambdas" {
  source                = "./modules/lambdas"
  zone_id               = var.zone_id
  domain_name           = var.domain_name
  cognito_user_pool_arn = aws_cognito_user_pool.cognito_user_pool.arn

  lambdas = {
    "createFamily" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_dynamodb_policy.arn]
      environment = {
        DYNAMODB_TABLE_NAME = "tppb"
      }
    },
    "getFamilyId" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_dynamodb_policy.arn]
      environment = {
        DYNAMODB_TABLE_NAME = "tppb"
      }
    },
    "addFamilyMember" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_dynamodb_policy.arn]
      environment = {
        DYNAMODB_TABLE_NAME = "tppb"
      }
    },
    "createUser" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_cognito_create_user_policy.arn, aws_iam_policy.lambda_dynamodb_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
        DYNAMODB_TABLE_NAME     = "tppb"
      }
    },
    "confirmSignup" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.confirm_user_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
      }
    },
    "loginUser" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_cognito_login_policy.arn, aws_iam_policy.lambda_dynamodb_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
        DYNAMODB_TABLE_NAME     = "tppb"

      }
    },
    "forgotPassword" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.forgot_password_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
      }
    },
    "confirmPasswordResetCode" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.forgot_password_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
      }
    }
  }
}

