terraform {
  backend "s3" {
    bucket  = "terraform-state-891377088894"
    key     = "management/accounts/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
