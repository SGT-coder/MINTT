from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

class Case(models.Model):
    """Case model for customer support tickets"""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('waiting_customer', 'Waiting for Customer'),
        ('waiting_third_party', 'Waiting for Third Party'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        ('escalated', 'Escalated'),
    ]
    
    CATEGORY_CHOICES = [
        ('technical', 'Technical'),
        ('billing', 'Billing'),
        ('general', 'General'),
        ('feature_request', 'Feature Request'),
        ('bug_report', 'Bug Report'),
        ('account', 'Account'),
        ('security', 'Security'),
    ]
    
    SOURCE_CHOICES = [
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('web_form', 'Web Form'),
        ('chat', 'Chat'),
        ('portal', 'Customer Portal'),
        ('social_media', 'Social Media'),
    ]
    
    # Basic Information
    case_number = models.CharField(max_length=20, unique=True, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='web_form')
    
    # Relationships
    customer = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, related_name='cases')
    company = models.ForeignKey('contacts.Company', on_delete=models.CASCADE, related_name='cases', null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cases')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_cases')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    
    # SLA and Metrics
    sla_hours = models.PositiveIntegerField(default=24, help_text="SLA in hours")
    first_response_time = models.DurationField(null=True, blank=True)
    resolution_time = models.DurationField(null=True, blank=True)
    
    # Tags and Labels
    tags = models.JSONField(default=list, blank=True)
    
    # Email Integration
    email_thread_id = models.CharField(max_length=255, blank=True, help_text="Email thread identifier")
    last_email_sent = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['customer', 'created_at']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"{self.case_number} - {self.title}"
    
    def save(self, *args, **kwargs):
        if not self.case_number:
            # Generate case number based on the highest case number, not ID
            last_case = Case.objects.order_by('-case_number').first()
            if last_case and last_case.case_number:
                try:
                    # Extract the number part from the last case number
                    last_number_str = last_case.case_number.split('-')[1]
                    last_number = int(last_number_str)
                    self.case_number = f"CASE-{last_number + 1:06d}"
                except (ValueError, IndexError):
                    # Fallback if case number format is unexpected
                    self.case_number = "CASE-000001"
            else:
                self.case_number = "CASE-000001"
        
        # Update timestamps
        if self.status == 'resolved' and not self.resolved_at:
            from django.utils import timezone
            self.resolved_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    @property
    def is_overdue(self):
        """Check if case is overdue based on SLA"""
        if self.due_date:
            from django.utils import timezone
            return timezone.now() > self.due_date
        return False
    
    @property
    def priority_score(self):
        """Get numeric priority score for sorting"""
        priority_scores = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'urgent': 4,
        }
        return priority_scores.get(self.priority, 0)
    
    def calculate_sla_breach(self):
        """Calculate if SLA has been breached"""
        if self.created_at and self.sla_hours:
            from django.utils import timezone
            from datetime import timedelta
            sla_deadline = self.created_at + timedelta(hours=self.sla_hours)
            return timezone.now() > sla_deadline
        return False

class CaseResponse(models.Model):
    """Response/comment model for cases"""
    
    RESPONSE_TYPE_CHOICES = [
        ('internal', 'Internal Note'),
        ('customer', 'Customer Response'),
        ('system', 'System Note'),
        ('email', 'Email Response'),
    ]
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='responses')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='case_responses')
    response_type = models.CharField(max_length=20, choices=RESPONSE_TYPE_CHOICES, default='internal')
    content = models.TextField()
    is_internal = models.BooleanField(default=True, help_text="Internal note not visible to customer")
    
    # Email Integration
    email_message_id = models.CharField(max_length=255, blank=True)
    email_subject = models.CharField(max_length=200, blank=True)
    email_from = models.EmailField(blank=True)
    email_to = models.EmailField(blank=True)
    email_cc = models.TextField(blank=True)
    email_sent = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Response to {self.case.case_number} by {self.author.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Update case's last response time
        super().save(*args, **kwargs)
        self.case.updated_at = self.created_at
        self.case.save(update_fields=['updated_at'])

class CaseAttachment(models.Model):
    """Attachment model for cases"""
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='attachments')
    response = models.ForeignKey(CaseResponse, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    file = models.FileField(upload_to='case_attachments/')
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.filename} - {self.case.case_number}" 