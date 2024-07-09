# Define the Lambda function
resource "aws_lambda_function" "delete_expired_users" {
  filename      = "./deploy/deleteExpiredUsers.zip"
  function_name = "deleteExpiredUsers"
  role          = aws_iam_role.lambda_exec_delete_expired_users.arn
  handler       = "deleteExpiredUsers.handler"
  runtime       = "nodejs20.x"
  timeout = 840
  environment {
    variables = {
      TPPB_DOMAIN  = var.domain_name
      DATABASE_URL = var.database_url
    }
  }
  vpc_config {
    subnet_ids         = var.lambda_vpc_subnet_ids
    security_group_ids = [var.lambda_vpc_security_group_ids]
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_exec_delete_expired_users" {
  name = "lambda_exec_delete_expired_users_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com",
      },
    }],
  })
}

# IAM policy for Lambda
resource "aws_iam_role_policy" "lambda_policy_delete_expired_users" {
  name = "lambda_policy_delete_expired_users"
  role = aws_iam_role.lambda_exec_delete_expired_users.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        Effect   = "Allow",
        Resource = "*",
      },
      {
        Action   = "ses:SendEmail",
        Effect   = "Allow",
        Resource = "*",
      },
      {
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
        ],
        Effect   = "Allow",
        Resource = "*",
      },
    ],
  })
}

# CloudWatch Event to trigger Lambda at 8 AM EST daily
resource "aws_cloudwatch_event_rule" "daily_trigger_delete_expired_users" {
  name                = "delete_expired_usersDailyTrigger"
  description         = "Triggers Lambda function daily at 2300 UTC"
  schedule_expression = "cron(0 23 * * ? *)" 
}

resource "aws_cloudwatch_event_target" "trigger_lambda_delete_expired_users" {
  rule      = aws_cloudwatch_event_rule.daily_trigger_delete_expired_users.name
  target_id = "deleteExpiredUsers"
  arn       = aws_lambda_function.delete_expired_users.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_delete_expired_users" {
  statement_id  = "AllowExecutionFromCloudWatch_delete_expired_users"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_expired_users.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trigger_delete_expired_users.arn
}

resource "aws_cloudwatch_log_group" "delete_expired_users" {
  name              = "/aws/lambda/deleteExpiredUsers"
  retention_in_days = 7
}