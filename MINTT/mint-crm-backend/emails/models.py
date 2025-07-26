from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()

class EmailTemplate(models.Model):
    """Email template model for reusable email content"""
    
    TEMPLATE_TYPE_CHOICES = [
        ('case_assignment', 'Case Assignment'),
        ('case_response', 'Case Response'),
        ('case_escalation', 'Case Escalation'),
        ('case_resolution', 'Case Resolution'),
        ('welcome', 'Welcome Email'),
        ('password_reset', 'Password Reset'),
        ('notification', 'General Notification'),
        ('custom', 'Custom Template'),
    ]
    
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=30, choices=TEMPLATE_TYPE_CHOICES)
    subject = models.CharField(max_length=200)
    html_content = models.TextField(help_text="HTML version of the email")
    text_content = models.TextField(help_text="Plain text version of the email")
    variables = models.JSONField(default=dict, help_text="Available template variables")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['name', 'template_type']
    
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"
    
    def render_template(self, context):
        """Render template with given context"""
        from django.template import Template, Context
        
        html_template = Template(self.html_content)
        text_template = Template(self.text_content)
        
        template_context = Context(context)
        
        return {
            'subject': self.subject,
            'html_content': html_template.render(template_context),
            'text_content': text_template.render(template_context),
        }

class Email(models.Model):
    """Email model for tracking all sent emails"""
    
    EMAIL_TYPE_CHOICES = [
        ('outbound', 'Outbound'),
        ('inbound', 'Inbound'),
        ('system', 'System'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
    ]
    
    # Basic Information
    email_type = models.CharField(max_length=10, choices=EMAIL_TYPE_CHOICES, default='outbound')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    subject = models.CharField(max_length=200)
    from_email = models.EmailField()
    to_email = models.EmailField()
    cc_emails = models.TextField(blank=True, help_text="Comma-separated CC emails")
    bcc_emails = models.TextField(blank=True, help_text="Comma-separated BCC emails")
    
    # Content
    html_content = models.TextField(blank=True)
    text_content = models.TextField(blank=True)
    
    # Relationships
    template = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    case = models.ForeignKey('cases.Case', on_delete=models.CASCADE, null=True, blank=True, related_name='emails')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='emails')
    
    # Email Headers
    message_id = models.CharField(max_length=255, blank=True, help_text="Email message ID")
    thread_id = models.CharField(max_length=255, blank=True, help_text="Email thread ID")
    reply_to = models.EmailField(blank=True)
    
    # Tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    
    # Error Information
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    
    # Frontend-specific fields
    starred = models.BooleanField(default=False, help_text="Whether the email is starred")
    archived = models.BooleanField(default=False, help_text="Whether the email is archived")
    read = models.BooleanField(default=False, help_text="Whether the email has been read")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'email_type']),
            models.Index(fields=['case', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['message_id']),
            models.Index(fields=['thread_id']),
        ]
    
    def __str__(self):
        return f"{self.subject} - {self.to_email}"
    
    @property
    def is_sent(self):
        return self.status in ['sent', 'delivered']
    
    @property
    def is_failed(self):
        return self.status in ['failed', 'bounced']
    
    @property
    def can_retry(self):
        return self.status == 'failed' and self.retry_count < self.max_retries
    
    def mark_as_sent(self):
        """Mark email as sent"""
        from django.utils import timezone
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])
    
    def mark_as_delivered(self):
        """Mark email as delivered"""
        from django.utils import timezone
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at'])
    
    def mark_as_failed(self, error_message=""):
        """Mark email as failed"""
        self.status = 'failed'
        self.error_message = error_message
        self.retry_count += 1
        self.save(update_fields=['status', 'error_message', 'retry_count'])

class EmailAttachment(models.Model):
    """Attachment model for emails"""
    
    email = models.ForeignKey(Email, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='email_attachments/')
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    file_size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.filename} - {self.email.subject}"

class EmailLog(models.Model):
    """Log model for email events and tracking"""
    
    EVENT_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('complained', 'Complained'),
        ('unsubscribed', 'Unsubscribed'),
    ]
    
    email = models.ForeignKey(Email, on_delete=models.CASCADE, related_name='logs')
    event = models.CharField(max_length=20, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    data = models.JSONField(default=dict, help_text="Additional event data")
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.email.subject} - {self.get_event_display()} at {self.timestamp}" 

class UserEmailConfig(models.Model):
    """User email configuration for multi-user email integration"""
    
    EMAIL_PROVIDER_CHOICES = [
        ('gmail', 'Gmail'),
        ('outlook', 'Outlook/Hotmail'),
        ('yahoo', 'Yahoo'),
        ('custom', 'Custom SMTP'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_config')
    provider = models.CharField(max_length=20, choices=EMAIL_PROVIDER_CHOICES)
    email_address = models.EmailField()
    display_name = models.CharField(max_length=100, blank=True)
    
    # SMTP Configuration
    smtp_host = models.CharField(max_length=255)
    smtp_port = models.PositiveIntegerField()
    smtp_username = models.EmailField()
    smtp_password = models.CharField(max_length=255)  # Should be encrypted in production
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    
    # IMAP Configuration (for receiving emails)
    imap_host = models.CharField(max_length=255, blank=True)
    imap_port = models.PositiveIntegerField(default=993)
    imap_username = models.EmailField(blank=True)
    imap_password = models.CharField(max_length=255, blank=True)
    use_imap_ssl = models.BooleanField(default=True)
    
    # OAuth Configuration (for Gmail, Outlook)
    oauth_access_token = models.TextField(blank=True)
    oauth_refresh_token = models.TextField(blank=True)
    oauth_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    last_sync = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Email Configuration"
        verbose_name_plural = "User Email Configurations"
    
    def __str__(self):
        return f"{self.user.email} - {self.email_address}"
    
    @property
    def is_oauth_provider(self):
        return self.provider in ['gmail', 'outlook']
    
    def get_smtp_config(self):
        """Get SMTP configuration for sending emails"""
        return {
            'host': self.smtp_host,
            'port': self.smtp_port,
            'username': self.smtp_username,
            'password': self.smtp_password,
            'use_tls': self.use_tls,
            'use_ssl': self.use_ssl,
        }
    
    def get_imap_config(self):
        """Get IMAP configuration for receiving emails"""
        if not self.imap_host:
            return None
        
        return {
            'host': self.imap_host,
            'port': self.imap_port,
            'username': self.imap_username or self.smtp_username,
            'password': self.imap_password or self.smtp_password,
            'use_ssl': self.use_imap_ssl,
        } 

class SMS(models.Model):
    """SMS model for tracking all sent SMS messages"""
    
    SMS_TYPE_CHOICES = [
        ('outbound', 'Outbound'),
        ('inbound', 'Inbound'),
        ('system', 'System'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('undelivered', 'Undelivered'),
    ]
    
    # Basic Information
    sms_type = models.CharField(max_length=10, choices=SMS_TYPE_CHOICES, default='outbound')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    message = models.TextField(max_length=1600)  # SMS character limit
    from_number = models.CharField(max_length=20)
    to_number = models.CharField(max_length=20)
    
    # Relationships
    case = models.ForeignKey('cases.Case', on_delete=models.CASCADE, null=True, blank=True, related_name='sms_messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='sms_messages')
    contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, null=True, blank=True, related_name='sms_messages')
    
    # SMS Headers
    message_id = models.CharField(max_length=255, blank=True, help_text="SMS message ID from provider")
    conversation_id = models.CharField(max_length=255, blank=True, help_text="SMS conversation ID")
    
    # Tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Error Information
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    
    # Frontend-specific fields
    starred = models.BooleanField(default=False, help_text="Whether the SMS is starred")
    archived = models.BooleanField(default=False, help_text="Whether the SMS is archived")
    read = models.BooleanField(default=False, help_text="Whether the SMS has been read")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'sms_type']),
            models.Index(fields=['case', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['contact', 'created_at']),
            models.Index(fields=['message_id']),
            models.Index(fields=['conversation_id']),
        ]
    
    def __str__(self):
        return f"{self.message[:50]}... - {self.to_number}"
    
    @property
    def is_sent(self):
        return self.status in ['sent', 'delivered']
    
    @property
    def is_failed(self):
        return self.status in ['failed', 'undelivered']
    
    @property
    def can_retry(self):
        return self.status == 'failed' and self.retry_count < self.max_retries
    
    def mark_as_sent(self):
        """Mark SMS as sent"""
        from django.utils import timezone
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])
    
    def mark_as_delivered(self):
        """Mark SMS as delivered"""
        from django.utils import timezone
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at'])
    
    def mark_as_failed(self, error_message=""):
        """Mark SMS as failed"""
        self.status = 'failed'
        self.error_message = error_message
        self.retry_count += 1
        self.save(update_fields=['status', 'error_message', 'retry_count'])

class SMSTemplate(models.Model):
    """SMS template model for reusable SMS content"""
    
    TEMPLATE_TYPE_CHOICES = [
        ('case_assignment', 'Case Assignment'),
        ('case_response', 'Case Response'),
        ('case_escalation', 'Case Escalation'),
        ('case_resolution', 'Case Resolution'),
        ('welcome', 'Welcome SMS'),
        ('notification', 'General Notification'),
        ('custom', 'Custom Template'),
    ]
    
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=30, choices=TEMPLATE_TYPE_CHOICES)
    message = models.TextField(max_length=1600, help_text="SMS message template")
    variables = models.JSONField(default=dict, help_text="Available template variables")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_sms_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['name', 'template_type']
    
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"
    
    def render_template(self, context):
        """Render template with given context"""
        from django.template import Template, Context
        
        template = Template(self.message)
        template_context = Context(context)
        
        return {
            'message': template.render(template_context),
        }

class SMSLog(models.Model):
    """Log model for SMS events and tracking"""
    
    EVENT_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
        ('undelivered', 'Undelivered'),
    ]
    
    sms = models.ForeignKey(SMS, on_delete=models.CASCADE, related_name='logs')
    event = models.CharField(max_length=20, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(default=dict, help_text="Additional event data")
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.sms.message[:30]}... - {self.get_event_display()} at {self.timestamp}"

class UserSMSConfig(models.Model):
    """User SMS configuration for multi-user SMS integration"""
    
    SMS_PROVIDER_CHOICES = [
        ('twilio', 'Twilio'),
        ('aws_sns', 'AWS SNS'),
        ('nexmo', 'Nexmo/Vonage'),
        ('custom', 'Custom API'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='sms_config')
    provider = models.CharField(max_length=20, choices=SMS_PROVIDER_CHOICES)
    account_sid = models.CharField(max_length=255, blank=True)
    auth_token = models.CharField(max_length=255, blank=True)
    api_key = models.CharField(max_length=255, blank=True)
    api_secret = models.CharField(max_length=255, blank=True)
    from_number = models.CharField(max_length=20, blank=True)
    webhook_url = models.URLField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    last_sync = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User SMS Configuration"
        verbose_name_plural = "User SMS Configurations"
    
    def __str__(self):
        return f"{self.user.email} - {self.provider}"
    
    def get_provider_config(self):
        """Get provider configuration"""
        return {
            'provider': self.provider,
            'account_sid': self.account_sid,
            'auth_token': self.auth_token,
            'api_key': self.api_key,
            'api_secret': self.api_secret,
            'from_number': self.from_number,
            'webhook_url': self.webhook_url,
        } 