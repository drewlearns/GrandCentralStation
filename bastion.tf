
# Bastion Host
resource "aws_instance" "bastion" {
  ami           = "ami-07caf09b362be10b8" # Update with the latest Amazon Linux 2 AMI for us-east-1
  instance_type = "t2.micro"
  key_name      = "bastion-key"

  subnet_id              = aws_subnet.public1.id
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]

  associate_public_ip_address = true
  depends_on                  = [aws_key_pair.bastion_key]
}

resource "aws_key_pair" "bastion_key" {
  key_name   = "bastion-key"
  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDHBCKG12CKrOl1ZDSR1q1SQTeyVMjzo1PfpTOoySSF49uUpQeEkINrUguCdxu1gMO7aB6yWyGb4HYTRE/IIRzjJB+57S/3uVIBKRsxezRNE1GmVZr+Aw1W2PvpwfY9arj5qybahvSeMu4dwlqMjzitG2skaoCPooJCXN1VAKV7s2kclnHgg9Bkwyu5joJNrhEhrSwgotIZOtTiLvbdb2wiiyYb0/h3WaRXb0+2+DZSfNmF2XnqSg5NWWtratXAssTelo9si93Mhb+U/7jUFmcJABrDVpZQZACacq3nC4UZ8alvM4yU5kbVKD7gn+wlYSg+ruWnx2fXbQnQFTZmjcvYW3/nZmpMF06Xrln7U/Q/2QW/0z+BTxeWa7Ex6H1M3cIPiqXANIGCXLI9CeZU8jNX2WV3Vw8yG/scERFr70HtUmEmB6dBa/LdNPwfZ2X0XCfMzyCZUS1868TKYQD/5fTjMKVfGTZR04T8uukwDfllOMTcrR7ZpXAMZZyfymL1W78= drewk@drewks-MacBook-Pro.local"
}
