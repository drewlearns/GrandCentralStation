resource "aws_ses_domain_identity" "email_domain" {
  domain = var.domain_name
}

resource "aws_ses_email_identity" "email_address" {
  email = "noReply@${var.domain_name}"
}

resource "aws_ses_domain_dkim" "email_dkim" {
  domain = aws_ses_domain_identity.email_domain.domain
}

resource "aws_route53_record" "ses_verification" {
  zone_id = var.zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = [aws_ses_domain_identity.email_domain.verification_token]
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = var.zone_id
  name    = element(aws_ses_domain_dkim.email_dkim.dkim_tokens, count.index)
  type    = "CNAME"
  ttl     = 300
  records = [element(aws_ses_domain_dkim.email_dkim.dkim_tokens, count.index)]
}

resource "aws_ses_domain_identity_verification" "email_verification" {
  domain = aws_ses_domain_identity.email_domain.domain
  depends_on = [aws_route53_record.ses_verification]
}
