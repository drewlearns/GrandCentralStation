resource "aws_instance" "bastion_host" {
  ami           = "ami-xxxxxx"  # Choose an appropriate AMI for your region
  instance_type = "t3.micro"
  key_name      = "your-key-pair-name"  # Ensure you have this key pair

  subnet_id         = element(module.vpc.public_subnets, 0)
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]

  tags = {
    Name = "Bastion Host"
  }
}

resource "aws_security_group" "bastion_sg" {
  name        = "bastion-sg"
  description = "Security Group for bastion host"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["YOUR_LOCAL_IP/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ssh -i /path/to/your-key.pem -N -L 5432:aurora-instance-endpoint:5432 ec2-user@bastion-host-public-ip
