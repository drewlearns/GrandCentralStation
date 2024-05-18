# # IAM role for Lambda function
# resource "aws_iam_role" "lambda_role" {
#   name = "lambda_disable_access_role"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [{
#       Action = "sts:AssumeRole"
#       Effect = "Allow"
#       Principal = {
#         Service = "lambda.amazonaws.com"
#       }
#     }]
#   })
# }

# # IAM policy to allow Lambda function to manage EC2 network interfaces
# resource "aws_iam_role_policy" "lambda_ec2_network_access" {
#   name = "lambda_ec2_network_access"
#   role = aws_iam_role.lambda_role.id

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [{
#       Action = [
#         "ec2:CreateNetworkInterface",
#         "ec2:DeleteNetworkInterface",
#         "ec2:DescribeNetworkInterfaces"
#       ],
#       Effect   = "Allow",
#       Resource = "*" # Restrict this as needed for your security practices
#     }]
#   })
# }

# # Lambda function
# resource "aws_lambda_function" "disable_access" {
#   function_name = "DisableFamilyAccessIfNotSubscribed"
#   handler       = "checkStripeSubscriptionStatus.handler"
#   role          = aws_iam_role.lambda_role.arn
#   runtime       = "nodejs20.x"

#   filename = "./deploy/checkStripeSubscriptionStatus.zip"

#   environment {
#     variables = {
#       USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.cognito_user_pool_client.id
#       USER_POOL_CLIENT_SECRET = aws_cognito_user_pool_client.cognito_user_pool_client.client_secret
#       DATABASE_URL            = var.database_url
#       ZOHO_CREDENTIALS        = data.aws_secretsmanager_secret_version.zoho_version.secret_string

#     }
#   }
#   vpc_config {
#     subnet_ids         = var.lambda_vpc_subnet_ids
#     security_group_ids = [var.lambda_vpc_security_group_ids]
#   }
#   depends_on = [null_resource.run_build_script]
# }

# # EventBridge rule to trigger Lambda daily
# resource "aws_cloudwatch_event_rule" "daily_trigger" {
#   name                = "daily-lambda-trigger"
#   description         = "Triggers the DisableFamilyAccessIfNotSubscribed Lambda function daily"
#   schedule_expression = "cron(0 0 * * ? *)" # Runs at midnight UTC
# }

# # Connect EventBridge rule to Lambda function
# resource "aws_cloudwatch_event_target" "lambda_target" {
#   rule      = aws_cloudwatch_event_rule.daily_trigger.name
#   target_id = "DisableFamilyAccessIfNotSubscribedTarget"
#   arn       = aws_lambda_function.disable_access.arn
# }

# # Permission for EventBridge to invoke Lambda function
# resource "aws_lambda_permission" "allow_event_bridge" {
#   statement_id  = "AllowExecutionFromCloudWatch"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.disable_access.function_name
#   principal     = "events.amazonaws.com"
#   source_arn    = aws_cloudwatch_event_rule.daily_trigger.arn
# }
