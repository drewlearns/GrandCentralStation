# Store the secret in AWS Secrets Manager
data "aws_secretsmanager_secret" "stripe" {
  name                    = "prod-stripe-sk"
}

data "aws_secretsmanager_secret_version" "stripe_version" {
    secret_id = data.aws_secretsmanager_secret.stripe.id
}