module "lambdas" {
  source                        = "./modules/lambdas"
  zone_id                       = var.zone_id
  domain_name                   = var.domain_name
  cognito_user_pool_arn         = aws_cognito_user_pool.cognito_user_pool.arn
  lambda_vpc_subnet_ids         = [aws_subnet.private1.id, aws_subnet.private2.id]
  lambda_vpc_security_group_ids = aws_security_group.lambda_sg.id
  aurora_endpoint               = aws_rds_cluster_instance.aurora_instance.endpoint
  db_password                   = aws_secretsmanager_secret_version.db_master_password_version.secret_string
  db_username                   = "root"
  db_name                       = "tppb${var.environment}"
  database_url                  = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
  lambdas = {
    ################
    # AUTH
    ################
    "addUser" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.ses_send_email_policy.arn, aws_iam_policy.lambda_cognito_create_user_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
        DATABASE_URL            = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "login" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # MUST BE NONE
      policy_arns   = [aws_iam_policy.ses_send_email_policy.arn, aws_iam_policy.lambda_cognito_login_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
        DATABASE_URL            = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
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
        DATABASE_URL            = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "confirmPasswordResetCode" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # MUST BE NONE
      policy_arns   = [aws_iam_policy.forgot_password_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
        DATABASE_URL            = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        DATABASE_URL            = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "forgotPassword" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # MUST BE NONE
      policy_arns   = [aws_iam_policy.ses_send_email_policy.arn, aws_iam_policy.forgot_password_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
        DATABASE_URL            = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "verifyToken" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # MUST BE NONE
      policy_arns   = [aws_iam_policy.forgot_password_policy.arn]
      environment = {
        USER_POOL_ID            = aws_cognito_user_pool.cognito_user_pool.id
      }
    },
    ######################
    # HOUSEHOLD
    ######################
    "addHousehold" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL            = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "addInvite" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.ses_send_email_policy.arn, aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        TTPB_DOMAIN  = var.domain_name
      }
    },
    "acceptInvite" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.ses_send_email_policy.arn, aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "deleteMemberFromHousehold" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "editHousehold" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        TTPB_DOMAIN  = var.domain_name
      }
    },
    "resendInvitation" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "editHousehold" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "deleteHousehold" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "getHousehold" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    ##########################
    # TRANSACTION
    ##########################
    "addPaymentSource" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "addTransaction" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn, aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        BUCKET = aws_s3_bucket.receipts_bucket.bucket
      }
    },
    "getFilePath" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        BUCKET = aws_s3_bucket.receipts_bucket.bucket
      }
    },
    "getAttachment" = { # this is called by getFilePath
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn, aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        BUCKET = aws_s3_bucket.receipts_bucket.bucket
      }
    },
    "editTransaction" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn, aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        BUCKET = aws_s3_bucket.receipts_bucket.bucket
      }
    },
    "deleteTransaction" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "addBill" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn, aws_iam_policy.lambda_secrets_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "getBillPassword" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn, aws_iam_policy.lambda_secrets_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "addIncome" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "calculateRunningTotal" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "getRunningTotal" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "getBills" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "deleteBill" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        BUCKET = aws_s3_bucket.receipts_bucket.bucket
      }
    },
    "deleteIncome" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "editBill" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "editIncome" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    ##########################
    # NOTIFICATIONS
    ##########################
    "addNotification" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "editNotification" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "deleteNotification" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "getNotification" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_invoke_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
  }
}