module "lambdas" {
  source                        = "./modules/lambdas"
  zone_id                       = var.zone_id
  domain_name                   = var.domain_name
  cognito_user_pool_arn         = aws_cognito_user_pool.cognito_user_pool.arn
  lambda_vpc_subnet_ids         = [aws_subnet.private1.id, aws_subnet.private2.id]
  lambda_vpc_security_group_ids = aws_security_group.lambda_sg.id
  aurora_endpoint               = aws_rds_cluster_instance.aurora_instance.endpoint
  lambdas = {
    # "createFamily" = {
    #   runtime       = "nodejs20.x"
    #   method        = "POST"               # CAN ONLY BE POST
    #   authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
    #   policy_arns   = []
    #   environment = {
    #     PGUSER     = "root"
    #     PGHOST     = aws_rds_cluster_instance.aurora_instance.endpoint
    #     PGDATABASE = "tppb"
    #     PGPASSWORD = "root"
    #     PGPORT     = "rootroot" # TODO: Make this more secure
    #   }
    # },
    # "getFamilyId" = {
    #   runtime       = "nodejs20.x"
    #   method        = "POST"               # CAN ONLY BE POST
    #   authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
    #   policy_arns   = []
    #   environment = {
    #     PGUSER     = "root"
    #     PGHOST     = aws_rds_cluster_instance.aurora_instance.endpoint
    #     PGDATABASE = "tppb"
    #     PGPASSWORD = "root"
    #     PGPORT     = "rootroot" # TODO: Make this more secure

    #   }
    # },
    # "addFamilyMember" = {
    #   runtime       = "nodejs20.x"
    #   method        = "POST"               # CAN ONLY BE POST
    #   authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
    #   policy_arns   = []
    #   environment = {
    #     PGUSER     = "root"
    #     PGHOST     = aws_rds_cluster_instance.aurora_instance.endpoint
    #     PGDATABASE = "tppb"
    #     PGPASSWORD = "root"
    #     PGPORT     = "rootroot" # TODO: Make this more secure

    #   }
    # },
    "createUser" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_cognito_create_user_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
        PGUSER                  = "root"
        PGHOST                  = aws_rds_cluster_instance.aurora_instance.endpoint
        PGDATABASE              = "tppb"
        PGPASSWORD              = "rootroot"
        PGPORT                  = "5432" # TODO: Make this more secure

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
        PGUSER                  = "root"
        PGHOST                  = aws_rds_cluster_instance.aurora_instance.endpoint
        PGDATABASE              = "tppb"
        PGPASSWORD              = "rootroot"
        PGPORT                  = "5432" # TODO: Make this more secure

      }
    },
    # "loginUser" = {
    #   runtime       = "nodejs20.x"
    #   method        = "POST" # CAN ONLY BE POST
    #   authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
    #   policy_arns   = [aws_iam_policy.lambda_cognito_login_policy.arn]
    #   environment = {
    #     USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
    #     USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
    #     DYNAMODB_TABLE_NAME     = "tppb"

    #   }
    # },
    # "forgotPassword" = {
    #   runtime       = "nodejs20.x"
    #   method        = "POST" # CAN ONLY BE POST
    #   authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
    #   policy_arns   = [aws_iam_policy.forgot_password_policy.arn]
    #   environment = {
    #     USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
    #     USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
    #   }
    # },
    # "confirmPasswordResetCode" = {
    #   runtime       = "nodejs20.x"
    #   method        = "POST" # CAN ONLY BE POST
    #   authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
    #   policy_arns   = [aws_iam_policy.forgot_password_policy.arn]
    #   environment = {
    #     USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
    #     USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
    #   }
    # }
  }
}

