# Define the Lambda function
resource "aws_lambda_function" "update_expired_subscriptions" {
  filename      = "./deploy/updateExpiredSubscriptions.zip"
  function_name = "updateExpiredSubscriptions"
  role          = aws_iam_role.update_expired_subscriptions_lambda_exec.arn
  handler       = "updateExpiredSubscriptions.handler"
  runtime       = "nodejs20.x"
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
resource "aws_iam_role" "update_expired_subscriptions_lambda_exec" {
  name = "update_expired_subscriptions_lambda_exec_role"

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
resource "aws_iam_role_policy" "update-expired_subscriptions_lambda_policy" {
  name = "update-expired_subscriptions_lambda_policy"
  role = aws_iam_role.update_expired_subscriptions_lambda_exec.id

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
resource "aws_cloudwatch_event_rule" "update_expired_subscriptions_daily_trigger" {
  name                = "DailyTrigger_update_expired_subscriptions"
  description         = "Triggers Lambda function daily at 8 AM EST"
  schedule_expression = "cron(0 13 * * ? *)" # 8 AM EST = 1 PM UTC
}

resource "aws_cloudwatch_event_target" "update_expired_subscriptions_trigger_lambda" {
  rule      = aws_cloudwatch_event_rule.update_expired_subscriptions_daily_trigger.name
  target_id = "updateExpiredSubscriptions"
  arn       = aws_lambda_function.update_expired_subscriptions.arn
}

resource "aws_lambda_permission" "update_expired_subscriptions_allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_expired_subscriptions.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.update_expired_subscriptions_daily_trigger.arn
}

resource "aws_cloudwatch_log_group" "update_expired_subscriptions" {
  name              = "/aws/lambda/updateExpiredSubscriptions"
  retention_in_days = 7
}