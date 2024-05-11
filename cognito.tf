resource "aws_cognito_user_pool" "cognito_user_pool" {
  name = "budget_app_user_pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  auto_verified_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "cognito_user_pool_client" {
  name         = "TPPBClient"
  user_pool_id = aws_cognito_user_pool.cognito_user_pool.id

  generate_secret     = true
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_CUSTOM_AUTH"]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = ["https://app.thepurplepiggybank.com/dashboard"]
  logout_urls   = ["https://app.thepurplepiggybank.com/logout"]
}
