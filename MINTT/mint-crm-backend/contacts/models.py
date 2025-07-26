from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()

class Company(models.Model):
    """Company model for organization management"""
    
    INDUSTRY_CHOICES = [
        ('technology', 'Technology'),
        ('healthcare', 'Healthcare'),
        ('finance', 'Finance'),
        ('education', 'Education'),
        ('retail', 'Retail'),
        ('manufacturing', 'Manufacturing'),
        ('consulting', 'Consulting'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=200)
    industry = models.CharField(max_length=20, choices=INDUSTRY_CHOICES, default='other')
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    
    # Additional Information
    description = models.TextField(blank=True)
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    employee_count = models.PositiveIntegerField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_customer = models.BooleanField(default=False)
    is_prospect = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('company')
        verbose_name_plural = _('companies')
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @property
    def full_address(self):
        """Get full formatted address"""
        parts = [self.address, self.city, self.state, self.postal_code, self.country]
        return ', '.join(filter(None, parts))

class Contact(models.Model):
    """Contact model for customer and prospect management"""
    
    TITLE_CHOICES = [
        ('mr', 'Mr.'),
        ('mrs', 'Mrs.'),
        ('ms', 'Ms.'),
        ('dr', 'Dr.'),
        ('prof', 'Prof.'),
        ('other', 'Other'),
    ]
    
    # Basic Information
    title = models.CharField(max_length=10, choices=TITLE_CHOICES, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    
    # Company Information
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='contacts', null=True, blank=True)
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    # Address Information
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    
    # Additional Information
    notes = models.TextField(blank=True)
    birthday = models.DateField(null=True, blank=True)
    linkedin_url = models.URLField(blank=True)
    twitter_handle = models.CharField(max_length=50, blank=True)
    
    # Status and Preferences
    is_active = models.BooleanField(default=True)
    is_customer = models.BooleanField(default=False)
    is_prospect = models.BooleanField(default=True)
    email_opt_out = models.BooleanField(default=False)
    phone_opt_out = models.BooleanField(default=False)
    
    # User Account (if contact has portal access)
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='contact_profile')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['first_name', 'last_name']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['is_customer', 'is_prospect']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Get full name with title"""
        name_parts = []
        if self.title:
            name_parts.append(self.get_title_display())
        name_parts.extend([self.first_name, self.last_name])
        return ' '.join(filter(None, name_parts))
    
    def get_short_name(self):
        """Get short name (first name only)"""
        return self.first_name
    
    @property
    def full_address(self):
        """Get full formatted address"""
        parts = [self.address, self.city, self.state, self.postal_code, self.country]
        return ', '.join(filter(None, parts))
    
    @property
    def primary_phone(self):
        """Get primary phone number (mobile preferred)"""
        return self.mobile or self.phone
    
    def save(self, *args, **kwargs):
        # Update company status based on contact status
        if self.company:
            if self.is_customer:
                self.company.is_customer = True
                self.company.is_prospect = False
                self.company.save(update_fields=['is_customer', 'is_prospect'])
        
        super().save(*args, **kwargs) 