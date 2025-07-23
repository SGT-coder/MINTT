from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Notification(models.Model):
    """Notification model for user notifications"""
    
    NOTIFICATION_TYPE_CHOICES = [
        ('case_assigned', 'Case Assigned'),
        ('case_updated', 'Case Updated'),
        ('case_escalated', 'Case Escalated'),
        ('email_received', 'Email Received'),
        ('task_due', 'Task Due'),
        ('meeting_reminder', 'Meeting Reminder'),
        ('system', 'System Notification'),
    ]
    
    # Basic Information
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    
    # Relationships
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    # Status
    is_read = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.recipient.email}" 