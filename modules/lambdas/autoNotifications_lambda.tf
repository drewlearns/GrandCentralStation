# Define the Lambda function
resource "aws_lambda_function" "auto_notifications" {
  filename      = "./deploy/autoNotifications.zip"
  function_name = "AutoNotifications"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "autoNotifications.handler"
  runtime       = "nodejs20.x"
  environment {
    variables = {
      TPPB_DOMAIN = var.domain_name
    }
  }
  vpc_config {
    subnet_ids         = var.lambda_vpc_subnet_ids
    security_group_ids = [var.lambda_vpc_security_group_ids]
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_exec" {
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
resource "aws_iam_role_policy" "lambda_policy" {
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
resource "aws_cloudwatch_event_rule" "daily_trigger" {
  name                = "DailyTrigger"
  description         = "Triggers Lambda function daily at 8 AM EST"
  schedule_expression = "cron(0 13 * * ? *)" # 8 AM EST = 1 PM UTC
}

resource "aws_cloudwatch_event_target" "trigger_lambda" {
  rule      = aws_cloudwatch_event_rule.daily_trigger.name
  target_id = "AutoNotifications"
  arn       = aws_lambda_function.auto_notifications.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auto_notifications.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trigger.arn
}
