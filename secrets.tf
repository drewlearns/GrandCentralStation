data "aws_secretsmanager_secret" "zoho" {
  arn = "arn:aws:secretsmanager:us-east-1:891377088894:secret:zoho_api_console-0ukBPP"
} # This is set up at https://api-console.zoho.com/client/1004.PJLI1B6S0T5EVC1VWJ13X1J223C6CB#secret

data "aws_secretsmanager_secret_version" "zoho_version" {
  secret_id = data.aws_secretsmanager_secret.zoho.id
}
