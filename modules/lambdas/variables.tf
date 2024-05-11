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

variable "lambda_vpc_subnet_ids" {
  description = "ids of lambda security groups"
  type        = list(string)
}

variable "lambda_vpc_security_group_ids" {
  description = "security group ids for lambda"
  type = string
}

variable "aurora_endpoint" {
  description = "aws_rds_cluster_instance.aurora_instance.endpoint"
  type = string
}