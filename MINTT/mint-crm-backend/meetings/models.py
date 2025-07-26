from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()

class MeetingCategory(models.Model):
    """Meeting categories for organization"""
    
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default="#3B82F6", help_text="Hex color code")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_meeting_categories')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = "Meeting categories"
    
    def __str__(self):
        return self.name

class Meeting(models.Model):
    """Enhanced meeting model for comprehensive calendar management"""
    
    MEETING_TYPE_CHOICES = [
        ('internal', 'Internal Meeting'),
        ('client', 'Client Meeting'),
        ('sales', 'Sales Meeting'),
        ('support', 'Support Meeting'),
        ('training', 'Training'),
        ('review', 'Review Meeting'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rescheduled', 'Rescheduled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    # Basic Information
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    meeting_type = models.CharField(max_length=20, choices=MEETING_TYPE_CHOICES, default='internal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Scheduling
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    timezone = models.CharField(max_length=50, default='UTC')
    all_day = models.BooleanField(default=False)
    
    # Location
    location = models.CharField(max_length=200, blank=True)
    location_type = models.CharField(max_length=20, choices=[
        ('physical', 'Physical Location'),
        ('virtual', 'Virtual Meeting'),
        ('hybrid', 'Hybrid'),
    ], default='virtual')
    meeting_url = models.URLField(blank=True, help_text="Video conference URL")
    
    # Relationships
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_meetings')
    attendees = models.ManyToManyField(User, related_name='attended_meetings')
    category = models.ForeignKey(MeetingCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='meetings')
    
    # CRM Integration
    case = models.ForeignKey('cases.Case', on_delete=models.CASCADE, null=True, blank=True, related_name='meetings')
    contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, null=True, blank=True, related_name='meetings')
    company = models.ForeignKey('contacts.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='meetings')
    
    # Recurring Meetings
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.JSONField(default=dict, blank=True, help_text="RRULE format for recurring meetings")
    parent_meeting = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='recurring_instances')
    
    # Reminders and Notifications
    reminder_minutes = models.PositiveIntegerField(default=15, help_text="Minutes before meeting to send reminder")
    send_reminders = models.BooleanField(default=True)
    
    # Meeting Details
    agenda = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    outcome = models.TextField(blank=True)
    
    # Status and Visibility
    is_active = models.BooleanField(default=True)
    is_private = models.BooleanField(default=False, help_text="Private meetings are only visible to attendees")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['start_time', 'end_time']),
            models.Index(fields=['organizer', 'start_time']),
            models.Index(fields=['status', 'start_time']),
            models.Index(fields=['meeting_type', 'start_time']),
            models.Index(fields=['case', 'start_time']),
            models.Index(fields=['contact', 'start_time']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def duration_minutes(self):
        """Calculate meeting duration in minutes"""
        if self.all_day:
            return 1440  # 24 hours
        return int((self.end_time - self.start_time).total_seconds() / 60)
    
    @property
    def is_past(self):
        """Check if meeting is in the past"""
        return self.end_time < timezone.now()
    
    @property
    def is_ongoing(self):
        """Check if meeting is currently ongoing"""
        now = timezone.now()
        return self.start_time <= now <= self.end_time
    
    @property
    def is_upcoming(self):
        """Check if meeting is in the future"""
        return self.start_time > timezone.now()
    
    @property
    def is_today(self):
        """Check if meeting is today"""
        today = timezone.now().date()
        return self.start_time.date() == today

class MeetingAttendance(models.Model):
    """Model for tracking meeting attendance with status"""
    
    STATUS_CHOICES = [
        ('invited', 'Invited'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('tentative', 'Tentative'),
        ('attended', 'Attended'),
        ('no_show', 'No Show'),
    ]
    
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='attendances')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meeting_attendances')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='invited')
    
    # Response tracking
    responded_at = models.DateTimeField(null=True, blank=True)
    response_notes = models.TextField(blank=True)
    
    # Attendance tracking
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['meeting', 'user']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.meeting.title} ({self.get_status_display()})"

class MeetingReminder(models.Model):
    """Model for tracking meeting reminders"""
    
    REMINDER_TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('calendar', 'Calendar'),
    ]
    
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='reminders')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meeting_reminders')
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES)
    scheduled_for = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    is_sent = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['scheduled_for']
    
    def __str__(self):
        return f"{self.meeting.title} - {self.user.get_full_name()} ({self.get_reminder_type_display()})"

class MeetingTemplate(models.Model):
    """Templates for recurring meeting types"""
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    meeting_type = models.CharField(max_length=20, choices=Meeting.MEETING_TYPE_CHOICES)
    duration_minutes = models.PositiveIntegerField(default=60)
    category = models.ForeignKey(MeetingCategory, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Template content
    default_title = models.CharField(max_length=200)
    default_description = models.TextField(blank=True)
    default_agenda = models.TextField(blank=True)
    
    # Default settings
    default_reminder_minutes = models.PositiveIntegerField(default=15)
    default_location_type = models.CharField(max_length=20, choices=[
        ('physical', 'Physical Location'),
        ('virtual', 'Virtual Meeting'),
        ('hybrid', 'Hybrid'),
    ], default='virtual')
    
    # Created by
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_meeting_templates')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name

class CalendarIntegration(models.Model):
    """User calendar integration settings"""
    
    PROVIDER_CHOICES = [
        ('google', 'Google Calendar'),
        ('outlook', 'Outlook Calendar'),
        ('ical', 'iCal'),
        ('other', 'Other'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='calendar_integration')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    is_active = models.BooleanField(default=True)
    
    # Integration settings
    sync_meetings = models.BooleanField(default=True, help_text="Sync meetings to external calendar")
    sync_availability = models.BooleanField(default=True, help_text="Sync availability to external calendar")
    
    # API credentials (encrypted)
    api_key = models.CharField(max_length=500, blank=True)
    api_secret = models.CharField(max_length=500, blank=True)
    refresh_token = models.CharField(max_length=500, blank=True)
    
    # Sync settings
    last_sync = models.DateTimeField(null=True, blank=True)
    sync_errors = models.JSONField(default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Calendar Integration"
        verbose_name_plural = "Calendar Integrations"
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_provider_display()}" 