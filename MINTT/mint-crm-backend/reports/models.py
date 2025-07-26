from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()

class Report(models.Model):
    """Report model for analytics and reporting"""
    
    REPORT_TYPE_CHOICES = [
        ('case_summary', 'Case Summary'),
        ('email_analytics', 'Email Analytics'),
        ('user_performance', 'User Performance'),
        ('customer_insights', 'Customer Insights'),
        ('sla_compliance', 'SLA Compliance'),
        ('custom', 'Custom Report'),
    ]
    
    FORMAT_CHOICES = [
        ('json', 'JSON'),
        ('csv', 'CSV'),
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
    ]
    
    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=30, choices=REPORT_TYPE_CHOICES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='json')
    
    # Configuration
    parameters = models.JSONField(default=dict, help_text="Report parameters and filters")
    schedule = models.CharField(max_length=100, blank=True, help_text="Cron schedule for automated reports")
    
    # Relationships
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_reports')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_generated = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_automated = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_report_type_display()})"
    
    def generate_report(self):
        """Generate the report data"""
        from .services import ReportService
        
        if self.report_type == 'case_summary':
            return ReportService.generate_case_summary(self.parameters)
        elif self.report_type == 'email_analytics':
            return ReportService.generate_email_analytics(self.parameters)
        elif self.report_type == 'user_performance':
            return ReportService.generate_user_performance(self.parameters)
        elif self.report_type == 'customer_insights':
            return ReportService.generate_customer_insights(self.parameters)
        elif self.report_type == 'sla_compliance':
            return ReportService.generate_sla_compliance(self.parameters)
        else:
            return ReportService.generate_custom_report(self.parameters)

class ReportExecution(models.Model):
    """Model to track report executions"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='executions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Execution Details
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True, blank=True)
    
    # Results
    result_data = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    # File Storage
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.report.name} - {self.started_at}"
    
    def mark_completed(self, result_data=None, file_path=None):
        """Mark execution as completed"""
        from django.utils import timezone
        
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.duration = self.completed_at - self.started_at
        
        if result_data:
            self.result_data = result_data
        
        if file_path:
            self.file_path = file_path
        
        self.save()
    
    def mark_failed(self, error_message):
        """Mark execution as failed"""
        from django.utils import timezone
        
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.duration = self.completed_at - self.started_at
        self.error_message = error_message
        self.save() 