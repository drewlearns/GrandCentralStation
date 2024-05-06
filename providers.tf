terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31.0"
    }
  }
  required_version = "~> 1.6.5"
}

provider "aws" {
  region = "us-east-1"
}