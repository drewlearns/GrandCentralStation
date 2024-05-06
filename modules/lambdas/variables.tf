variable "lambdas" {
  type = map(object({
    runtime       = string
    method        = string
    authorization = string
    policy_arns   = list(string) // New field for policy ARNs
    environment   = map(string)
  }))
}

variable "zone_id" {
  description = "zone id for api dns hosted zone"
  type        = string
}

variable "domain_name" {
  description = "domain name for api gateway"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "arn of the cognito user pool"
  type        = string
}
