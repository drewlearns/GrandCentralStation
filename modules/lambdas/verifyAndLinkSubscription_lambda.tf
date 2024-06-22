# Define the Lambda function
resource "aws_lambda_function" "verify_and_link_subscription" {
  filename      = "./deploy/verifyAndLinkSubscription.zip"
  function_name = "verifyAndLinkSubscription"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "verifyAndLinkSubscription.handler"
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
resource "aws_iam_role" "lambda_exec_verify_and_link_subscription" {
  name = "lambda_exec_role"

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
resource "aws_iam_role_policy" "lambda_policy_verify_and_link_subscription" {
  name = "lambda_policy"
  role = aws_iam_role.lambda_exec.id

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
resource "aws_cloudwatch_event_rule" "five_minute_trigger" {
  name                = "Every_5_Minutes"
  description         = "Triggers Lambda function every 5 minutes"
  schedule_expression = "rate(5 minutes)" # 8 AM EST = 1 PM UTC
}

resource "aws_cloudwatch_event_target" "trigger_lambda_verify_and_link_subscription" {
  rule      = aws_cloudwatch_event_rule.five_minute_trigger.name
  target_id = "verifyAndLinkSubscription"
  arn       = aws_lambda_function.verify_and_link_subscription.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_verify_and_link_subscription" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.verify_and_link_subscription.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.five_minute_trigger.arn
}

resource "aws_cloudwatch_log_group" "verify_and_link_subscription" {
  name              = "/aws/lambda/verifyAndLinkSubscription"
  retention_in_days = 7
}