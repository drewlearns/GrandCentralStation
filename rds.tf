# Create a VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "aurora-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]  # Adjust to your preferred availability zones
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.3.0/24", "10.0.4.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false

  tags = {
    Terraform = "true"
    Environment = "dev"
  }
}

# Aurora PostgreSQL Cluster
module "cluster" {
  source  = "terraform-aws-modules/rds-aurora/aws"

  name           = "test-aurora-db-postgres96"
  engine         = "aurora-postgresql"
  engine_version = "14.5"
  instance_class = "db.t3.small"
  instances = {
    one = {}
    two = {}  # Changed to 'two' for consistency in naming
  }

  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = "db-subnet-group"  # Ensure this matches the name within your VPC/subnet setup
  security_group_rules = {
    ex1_ingress = {
      cidr_blocks = ["10.0.3.0/24"]  # Adjust according to your public subnet CIDR for initial access
    }
    ex2_ingress = {  # Changed name to avoid duplication
      source_security_group_id = "${module.vpc.default_security_group_id}"  # Reference the default SG created by VPC module
    }
  }

  storage_encrypted   = true
  apply_immediately   = true
  monitoring_interval = 10

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}
