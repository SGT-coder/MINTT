from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
from users.models import User
from cases.models import Case, CaseResponse, CaseAttachment
from contacts.models import Contact, Company
from emails.models import Email, EmailTemplate, EmailAttachment, EmailLog

# Register User model
admin.site.register(User, UserAdmin)

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'industry', 'is_customer', 'is_active', 'created_at']
    list_filter = ['industry', 'is_customer', 'is_active', 'created_at']
    search_fields = ['name', 'website', 'phone']
    ordering = ['name']

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'email', 'company', 'job_title', 'is_customer', 'is_active']
    list_filter = ['is_customer', 'is_active', 'company', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering = ['first_name', 'last_name']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Full Name'

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['case_number', 'title', 'customer', 'priority', 'status', 'assigned_to', 'created_at']
    list_filter = ['priority', 'status', 'category', 'source', 'created_at']
    search_fields = ['case_number', 'title', 'customer__name', 'customer__email']
    ordering = ['-created_at']
    readonly_fields = ['case_number', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('case_number', 'title', 'description', 'category', 'priority', 'status', 'source')
        }),
        ('Relationships', {
            'fields': ('customer', 'company', 'assigned_to', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'resolved_at', 'due_date'),
            'classes': ('collapse',)
        }),
        ('SLA & Metrics', {
            'fields': ('sla_hours', 'first_response_time', 'resolution_time'),
            'classes': ('collapse',)
        }),
        ('Additional', {
            'fields': ('tags', 'email_thread_id', 'last_email_sent'),
            'classes': ('collapse',)
        }),
    )

@admin.register(CaseResponse)
class CaseResponseAdmin(admin.ModelAdmin):
    list_display = ['case', 'author', 'response_type', 'is_internal', 'created_at']
    list_filter = ['response_type', 'is_internal', 'created_at']
    search_fields = ['case__case_number', 'case__title', 'author__email']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_type', 'is_active', 'created_by', 'created_at']
    list_filter = ['template_type', 'is_active', 'created_at']
    search_fields = ['name', 'subject']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Email)
class EmailAdmin(admin.ModelAdmin):
    list_display = ['subject', 'to_email', 'email_type', 'status', 'sent_at', 'created_at']
    list_filter = ['email_type', 'status', 'sent_at', 'created_at']
    search_fields = ['subject', 'to_email', 'from_email']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'sent_at', 'delivered_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('email_type', 'status', 'subject', 'from_email', 'to_email')
        }),
        ('Content', {
            'fields': ('html_content', 'text_content'),
            'classes': ('collapse',)
        }),
        ('Relationships', {
            'fields': ('template', 'case', 'user'),
            'classes': ('collapse',)
        }),
        ('Headers', {
            'fields': ('message_id', 'thread_id', 'reply_to', 'cc_emails', 'bcc_emails'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('sent_at', 'delivered_at', 'opened_at', 'clicked_at'),
            'classes': ('collapse',)
        }),
        ('Error Information', {
            'fields': ('error_message', 'retry_count', 'max_retries'),
            'classes': ('collapse',)
        }),
    )

@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['email', 'event', 'timestamp', 'ip_address']
    list_filter = ['event', 'timestamp']
    search_fields = ['email__subject', 'email__to_email']
    ordering = ['-timestamp']
    readonly_fields = ['timestamp'] 