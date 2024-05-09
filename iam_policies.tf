data "aws_caller_identity" "current" {}

resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name = "lambda_dynamodb_policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem"
        ],
        Resource = "arn:aws:dynamodb:us-east-1:${data.aws_caller_identity.current.account_id}:table/tppb*",
        
        Effect   = "Allow"
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_sns_policy" {
  name = "lambda_sns_policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "sns:Publish"
        ],
        Resource = "arn:aws:sns:*:*:*",
        Effect   = "Allow"
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_cognito_create_user_policy" {
  name = "lambda_cognito_create_user_policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminRespondToAuthChallenge"
        ],
        Resource = [
          "arn:aws:cognito-idp:*:*:userpool/*",
          "arn:aws:cognito-identity:*:*:identitypool/*"

        ]
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_cognito_login_policy" {
  name = "lambda_cognito_login_policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminRespondToAuthChallenge",
        ],
        Resource = [
          "arn:aws:cognito-idp:*:*:userpool/*",
          "arn:aws:cognito-identity:*:*:identitypool/*"
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_s3_policy" {
  name = "lambda_s3_policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "s3:GetObject",
        ],
        Resource = "arn:aws:s3:::your-bucket-name/*",
        Effect   = "Allow"
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_textract_policy" {
  name        = "lambda_textract_policy"
  path        = "/"
  description = "IAM policy for Lambda function to access AWS Textract"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "textract:AnalyzeDocument"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject"
        ],
        Resource = [
          "arn:aws:s3:::your-textract-bucket/*"
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "forgot_password_policy" {
  name   = "ForgotPasswordPolicy"
  path   = "/"
  description = "Policy for Forgot Password Lambda function to access Cognito"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:ForgotPassword"
        ]
        Resource = [
          aws_cognito_user_pool.cognito_user_pool.arn
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "confirm_user_policy" {
  name   = "confirm_user_policy"
  path   = "/"
  description = "Policy for Forgot Password Lambda function to access Cognito"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:ConfirmSignUp"
        ]
        Resource = [
          aws_cognito_user_pool.cognito_user_pool.arn
        ]
      }
    ]
  })
}

