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
  lambdas = {
    "createFamily" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"

      }
    },
    "getFamilyByUuid" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "addFamilyMember" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "createUser" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_cognito_create_user_policy.arn]
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
    "loginUser" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "NONE" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_cognito_login_policy.arn]
      environment = {
        USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
        USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
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
    "createLedger" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"

      }
    }
    "createIncome" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "editIncome" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "editFamily" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "getIncomes" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "addTransactionToLedger" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
        BUCKET       = "tppb-receipts-${data.aws_caller_identity.current.account_id}"
      }
    }
    "getFamilyTransactionsThisMonth" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "searchTransactions" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "getAllTransactionsForFamily" = {
      runtime       = "nodejs20.x"
      method        = "POST"               # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "editTransaction" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = [aws_iam_policy.lambda_s3_policy.arn]
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    }
    "getFamilyById" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "deleteFamilyMember" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "addBill" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "editBill" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "getBillsByFamilyId" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
    "deleteBill" = {
      runtime       = "nodejs20.x"
      method        = "POST" # CAN ONLY BE POST
      authorization = "COGNITO_USER_POOLS" # "NONE" OR "COGNITO_USER_POOLS"
      policy_arns   = []
      environment = {
        DATABASE_URL = "postgresql://root:${aws_secretsmanager_secret_version.db_master_password_version.secret_string}@${aws_rds_cluster_instance.aurora_instance.endpoint}:5432/tppb${var.environment}?schema=public"
      }
    },
  }
}
