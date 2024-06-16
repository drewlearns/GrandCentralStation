variable "domain_name" {
  description = "domain name"
  type        = string
}

variable "zone_id" {
  description = "hosted zone Id"
  type        = string
}

variable "environment" {
  description = "environment"
  type        = string
}

variable "max_capacity" {
  description = "max capacity of instances for rds serverless v2 scaling configuration"
  type        = number
  default     = 2
}

variable "region" {
  description = "The AWS region to create resources in."
  default     = "us-east-1"
  type        = string
}

variable "account_number" {
  description = "aws account number"
  default     = "891377088894"
  type        = string
}
