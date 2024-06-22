# Store the secret in AWS Secrets Manager
data "aws_secretsmanager_secret" "revenue_cat_api_key" {
  name                    = "revenueCatApiKey"
}

data "aws_secretsmanager_secret_version" "revenue_cat_api_key_version" {
    secret_id = data.aws_secretsmanager_secret.revenue_cat_api_key.id
}