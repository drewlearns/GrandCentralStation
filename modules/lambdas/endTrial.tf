# Define the Lambda function
resource "aws_lambda_function" "end_trial" {
  filename      = "./deploy/endTrial.zip"
  function_name = "endTrial"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "endTrial.handler"
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
resource "aws_iam_role" "lambda_exec_end_trial" {
  name = "lambda_exec_role_end_trial"

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
resource "aws_iam_role_policy" "lambda_policy_end_trial" {
  name = "lambda_policy_end_trial"
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
resource "aws_cloudwatch_event_rule" "daily_trigger_end_trial" {
  name                = "endTrialTrigger"
  description         = "Triggers Lambda function daily at 8 AM EST"
  schedule_expression = "cron(0 13 * * ? *)" # 8 AM EST = 1 PM UTC
}

resource "aws_cloudwatch_event_target" "trigger_lambda_end_trial" {
  rule      = aws_cloudwatch_event_rule.daily_trigger_end_trial.name
  target_id = "endTrial"
  arn       = aws_lambda_function.end_trial.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_end_trial" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.end_trial.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trigger.arn
}


resource "aws_cloudwatch_log_group" "endTrial" {
  name              = "/aws/lambda/endTrial"
  retention_in_days = 7
}
