# IAM role for Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "lambda_disable_access_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# IAM policy to allow Lambda function to access DynamoDB
resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name = "lambda_dynamodb_access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "dynamodb:Scan",
        "dynamodb:UpdateItem"
      ],
      Effect = "Allow",
      Resource = "*" # It's better to restrict this to specific tables
    }]
  })
}

# Lambda function
resource "aws_lambda_function" "disable_access" {
  function_name = "DisableFamilyAccessIfNotSubscribed"
  handler       = "didNotSubscribe.handler"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "nodejs20.x"

  filename = "./deploy/didNotSubscribe.zip"

  environment {
    variables = {
      DYNAMODB_TABLE = "tppb" 
    }
  }
}

# EventBridge rule to trigger Lambda daily
resource "aws_cloudwatch_event_rule" "daily_trigger" {
  name                = "daily-lambda-trigger"
  description         = "Triggers the DisableFamilyAccessIfNotSubscribed Lambda function daily"
  schedule_expression = "cron(0 0 * * ? *)" # Runs at midnight UTC
}

# Connect EventBridge rule to Lambda function
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_trigger.name
  target_id = "DisableFamilyAccessIfNotSubscribedTarget"
  arn       = aws_lambda_function.disable_access.arn
}

# Permission for EventBridge to invoke Lambda function
resource "aws_lambda_permission" "allow_event_bridge" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.disable_access.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trigger.arn
}