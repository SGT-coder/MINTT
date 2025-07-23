from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Email, EmailTemplate, EmailAttachment, EmailLog, UserEmailConfig, SMS, SMSTemplate, SMSLog, UserSMSConfig

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for nested relationships"""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']

class EmailAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for email attachments"""
    
    class Meta:
        model = EmailAttachment
        fields = [
            'id', 'file', 'filename', 'content_type', 'file_size', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class EmailLogSerializer(serializers.ModelSerializer):
    """Serializer for email logs"""
    
    class Meta:
        model = EmailLog
        fields = [
            'id', 'email', 'event', 'timestamp', 'ip_address', 'user_agent', 'data'
        ]
        read_only_fields = ['id', 'timestamp']

class EmailTemplateSerializer(serializers.ModelSerializer):
    """Serializer for email templates"""
    
    created_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'template_type', 'subject', 'html_content', 'text_content',
            'variables', 'is_active', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

class EmailTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating email templates"""
    
    class Meta:
        model = EmailTemplate
        fields = [
            'name', 'template_type', 'subject', 'html_content', 'text_content',
            'variables', 'is_active'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class EmailSerializer(serializers.ModelSerializer):
    """Main email serializer with nested relationships"""
    
    template = EmailTemplateSerializer(read_only=True)
    case = serializers.StringRelatedField()
    user = UserMinimalSerializer(read_only=True)
    attachments = EmailAttachmentSerializer(many=True, read_only=True)
    logs = EmailLogSerializer(many=True, read_only=True)
    
    # Computed fields
    is_sent = serializers.BooleanField(read_only=True)
    is_failed = serializers.BooleanField(read_only=True)
    can_retry = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Email
        fields = [
            'id', 'email_type', 'status', 'subject', 'from_email', 'to_email',
            'cc_emails', 'bcc_emails', 'html_content', 'text_content', 'template',
            'case', 'user', 'message_id', 'thread_id', 'reply_to', 'sent_at',
            'delivered_at', 'opened_at', 'clicked_at', 'error_message',
            'retry_count', 'max_retries', 'created_at', 'updated_at',
            'attachments', 'logs', 'is_sent', 'is_failed', 'can_retry'
        ]
        read_only_fields = [
            'id', 'sent_at', 'delivered_at', 'opened_at', 'clicked_at',
            'error_message', 'retry_count', 'created_at', 'updated_at'
        ]

class EmailCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating emails"""
    
    class Meta:
        model = Email
        fields = [
            'email_type', 'subject', 'from_email', 'to_email', 'cc_emails',
            'bcc_emails', 'html_content', 'text_content', 'template', 'case',
            'message_id', 'thread_id', 'reply_to'
        ]
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class EmailSendSerializer(serializers.Serializer):
    """Serializer for sending emails"""
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=EmailTemplate.objects.filter(is_active=True),
        required=False
    )
    subject = serializers.CharField(max_length=200)
    to_email = serializers.EmailField()
    cc_emails = serializers.CharField(required=False, allow_blank=True)
    bcc_emails = serializers.CharField(required=False, allow_blank=True)
    html_content = serializers.CharField(required=False, allow_blank=True)
    text_content = serializers.CharField(required=False, allow_blank=True)
    case_id = serializers.PrimaryKeyRelatedField(
        queryset=Email.case.field.related_model.objects.all(),
        required=False
    )
    context = serializers.JSONField(required=False, default=dict)

class EmailRetrySerializer(serializers.Serializer):
    """Serializer for retrying failed emails"""
    pass

class EmailTemplateRenderSerializer(serializers.Serializer):
    """Serializer for rendering email templates"""
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=EmailTemplate.objects.filter(is_active=True)
    )
    context = serializers.JSONField(default=dict) 

class UserEmailConfigSerializer(serializers.ModelSerializer):
    """Serializer for user email configuration"""
    
    user = UserMinimalSerializer(read_only=True)
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    
    class Meta:
        model = UserEmailConfig
        fields = [
            'id', 'user', 'provider', 'provider_display', 'email_address', 'display_name',
            'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'use_tls', 'use_ssl',
            'imap_host', 'imap_port', 'imap_username', 'imap_password', 'use_imap_ssl',
            'oauth_access_token', 'oauth_refresh_token', 'oauth_expires_at',
            'is_active', 'is_verified', 'last_sync', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'oauth_access_token', 'oauth_refresh_token', 'oauth_expires_at',
            'is_verified', 'last_sync', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'smtp_password': {'write_only': True},
            'imap_password': {'write_only': True},
        }
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class UserEmailConfigCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating user email configuration"""
    
    class Meta:
        model = UserEmailConfig
        fields = [
            'provider', 'email_address', 'display_name',
            'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'use_tls', 'use_ssl',
            'imap_host', 'imap_port', 'imap_username', 'imap_password', 'use_imap_ssl'
        ]
        extra_kwargs = {
            'smtp_password': {'write_only': True},
            'imap_password': {'write_only': True},
        }
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class UserEmailConfigTestSerializer(serializers.Serializer):
    """Serializer for testing email configuration"""
    config_id = serializers.PrimaryKeyRelatedField(queryset=UserEmailConfig.objects.all())
    test_type = serializers.ChoiceField(choices=['smtp', 'imap', 'both']) 

class SMSLogSerializer(serializers.ModelSerializer):
    """Serializer for SMS logs"""
    
    class Meta:
        model = SMSLog
        fields = [
            'id', 'sms', 'event', 'timestamp', 'data'
        ]
        read_only_fields = ['id', 'timestamp']

class SMSTemplateSerializer(serializers.ModelSerializer):
    """Serializer for SMS templates"""
    
    created_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = SMSTemplate
        fields = [
            'id', 'name', 'template_type', 'message', 'variables', 'is_active', 
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

class SMSTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SMS templates"""
    
    class Meta:
        model = SMSTemplate
        fields = [
            'name', 'template_type', 'message', 'variables', 'is_active'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class SMSSerializer(serializers.ModelSerializer):
    """Main SMS serializer with nested relationships"""
    
    template = SMSTemplateSerializer(read_only=True)
    case = serializers.StringRelatedField()
    user = UserMinimalSerializer(read_only=True)
    contact = serializers.StringRelatedField()
    logs = SMSLogSerializer(many=True, read_only=True)
    
    # Computed fields
    is_sent = serializers.BooleanField(read_only=True)
    is_failed = serializers.BooleanField(read_only=True)
    can_retry = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = SMS
        fields = [
            'id', 'sms_type', 'status', 'message', 'from_number', 'to_number',
            'template', 'case', 'user', 'contact', 'message_id', 'conversation_id',
            'sent_at', 'delivered_at', 'read_at', 'error_message', 'retry_count',
            'max_retries', 'created_at', 'updated_at', 'logs', 'is_sent', 
            'is_failed', 'can_retry'
        ]
        read_only_fields = [
            'id', 'sent_at', 'delivered_at', 'read_at', 'error_message',
            'retry_count', 'created_at', 'updated_at'
        ]

class SMSCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SMS messages"""
    
    class Meta:
        model = SMS
        fields = [
            'sms_type', 'message', 'from_number', 'to_number', 'template',
            'case', 'contact', 'message_id', 'conversation_id'
        ]

class SMSSendSerializer(serializers.Serializer):
    """Serializer for sending SMS messages"""
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=SMSTemplate.objects.filter(is_active=True),
        required=False
    )
    message = serializers.CharField(max_length=1600)
    to_number = serializers.CharField(max_length=20)
    from_number = serializers.CharField(max_length=20, required=False)
    case_id = serializers.PrimaryKeyRelatedField(
        queryset=SMS.case.field.related_model.objects.all(),
        required=False
    )
    contact_id = serializers.PrimaryKeyRelatedField(
        queryset=SMS.contact.field.related_model.objects.all(),
        required=False
    )
    context = serializers.JSONField(required=False, default=dict)

class SMSRetrySerializer(serializers.Serializer):
    """Serializer for retrying failed SMS messages"""
    pass

class SMSTemplateRenderSerializer(serializers.Serializer):
    """Serializer for rendering SMS templates"""
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=SMSTemplate.objects.filter(is_active=True)
    )
    context = serializers.JSONField(default=dict)

class UserSMSConfigSerializer(serializers.ModelSerializer):
    """Serializer for user SMS configuration"""
    
    user = UserMinimalSerializer(read_only=True)
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    
    class Meta:
        model = UserSMSConfig
        fields = [
            'id', 'user', 'provider', 'provider_display', 'account_sid', 'auth_token',
            'api_key', 'api_secret', 'from_number', 'webhook_url', 'is_active',
            'is_verified', 'last_sync', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'is_verified', 'last_sync', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'auth_token': {'write_only': True},
            'api_secret': {'write_only': True},
        }
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class UserSMSConfigCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating user SMS configuration"""
    
    class Meta:
        model = UserSMSConfig
        fields = [
            'provider', 'account_sid', 'auth_token', 'api_key', 'api_secret',
            'from_number', 'webhook_url'
        ]
        extra_kwargs = {
            'auth_token': {'write_only': True},
            'api_secret': {'write_only': True},
        }
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class UserSMSConfigTestSerializer(serializers.Serializer):
    """Serializer for testing SMS configuration"""
    config_id = serializers.PrimaryKeyRelatedField(queryset=UserSMSConfig.objects.all()) 