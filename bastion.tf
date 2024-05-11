
# Bastion Host
resource "aws_instance" "bastion" {
  ami           = "ami-07caf09b362be10b8" # Update with the latest Amazon Linux 2 AMI for us-east-1
  instance_type = "t2.micro"
  key_name      = "bastion-key"

  subnet_id              = aws_subnet.public1.id
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]

  associate_public_ip_address = true
  depends_on = [ aws_key_pair.bastion-key ]
}

resource "aws_key_pair" "bastion-key" {
  key_name = "bastion-key"
  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDCI8zybbmXm1rcMEBEkc4uT35RL8i20ZRQBW7BbyBbrV+IvRwbXsKP4HCmW17Urrosb96hNuYd21R+YwhuHKfsjPbyE8ID0rupmXieGl9aTNaSG2nL1QIR8hVYWUTLbKCf8XomjL5Ud8kY4qcX0wLdmumbSXruUTEd+cm6tUWH6pi+zwO7e5vh/ToKp9lIIiPgBPrPfbo1BaeXcxxBDOAV/7o5QMhKgLxMnIT1z/e4fZtyIhqfDDa/ujtsbWIb8R3LEg0L18r1RVSOw8LAQzzdSbtM9TTHtuGTsFsdcEey1RacLXSr8uwcZmVPtf2/QS1ICCv4Z2P5yAX4OL1kdAHhtdg9G8VuJK5rlFtTndzAX2trRZ8mS26PinTdtgKQPvvQ4pGsPaLWWQYSZziyA0EtkpRjibly7oSCBkHWCKJvl5jJ9VpvIaX47c32R8AVr/YJ+l81eltwcpoQDjgTfDFevWF1iPgAhwQUL01s7OAw1CAu3Jx20g9iuqI5LEOMuXcdvLTWQIPmxJRuYOhhhrdp0Lfv5nb82XoLuePF+K7MZCm0In79B42rF231JTayZ2u63FBXILnbcgn8k3Y6W9x1HtJOP3A5fykz7Pbu/+i3iaX1NT8+ax+7j1etwgww0N7X3bALFob0PCEABllIJSZ1uDQ9HiT3Ck6jpT1fnDI4AQ== bastion-key"
}