from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Case, CaseResponse, CaseAttachment

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for nested relationships"""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']

class CaseAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for case attachments"""
    
    uploaded_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = CaseAttachment
        fields = [
            'id', 'file', 'filename', 'file_size', 'mime_type', 
            'uploaded_by', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']

class CaseResponseSerializer(serializers.ModelSerializer):
    """Serializer for case responses"""
    
    author = UserMinimalSerializer(read_only=True)
    attachments = CaseAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = CaseResponse
        fields = [
            'id', 'case', 'author', 'response_type', 'content', 'is_internal',
            'email_message_id', 'email_subject', 'email_from', 'email_to', 
            'email_cc', 'email_sent', 'created_at', 'updated_at', 'attachments'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

class CaseResponseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating case responses"""
    
    class Meta:
        model = CaseResponse
        fields = [
            'case', 'response_type', 'content', 'is_internal',
            'email_subject', 'email_to', 'email_cc'
        ]
    
    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)

class CaseSerializer(serializers.ModelSerializer):
    """Main case serializer with nested relationships"""
    
    customer = serializers.StringRelatedField()
    company = serializers.StringRelatedField()
    assigned_to = UserMinimalSerializer(read_only=True)
    created_by = UserMinimalSerializer(read_only=True)
    responses = CaseResponseSerializer(many=True, read_only=True)
    attachments = CaseAttachmentSerializer(many=True, read_only=True)
    
    # Computed fields
    is_overdue = serializers.BooleanField(read_only=True)
    priority_score = serializers.IntegerField(read_only=True)
    sla_breach = serializers.BooleanField(read_only=True)
    response_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'description', 'category', 'priority',
            'status', 'source', 'customer', 'company', 'assigned_to', 'created_by',
            'created_at', 'updated_at', 'resolved_at', 'due_date', 'sla_hours',
            'first_response_time', 'resolution_time', 'tags', 'email_thread_id',
            'last_email_sent', 'responses', 'attachments', 'is_overdue',
            'priority_score', 'sla_breach', 'response_count'
        ]
        read_only_fields = [
            'id', 'case_number', 'created_at', 'updated_at', 'resolved_at',
            'first_response_time', 'resolution_time', 'last_email_sent'
        ]
    
    def get_response_count(self, obj):
        return obj.responses.count()

class CaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new cases"""
    
    class Meta:
        model = Case
        fields = [
            'title', 'description', 'category', 'priority', 'source',
            'customer', 'company', 'assigned_to', 'due_date', 'sla_hours', 'tags'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class CaseUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating cases"""
    
    class Meta:
        model = Case
        fields = [
            'title', 'description', 'category', 'priority', 'status', 'source',
            'assigned_to', 'due_date', 'sla_hours', 'tags'
        ]

class CaseListSerializer(serializers.ModelSerializer):
    """Simplified serializer for case lists"""
    
    customer = serializers.StringRelatedField()
    assigned_to = UserMinimalSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    response_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'category', 'priority', 'status',
            'customer', 'assigned_to', 'created_at', 'updated_at', 'due_date',
            'is_overdue', 'response_count'
        ]
    
    def get_response_count(self, obj):
        return obj.responses.count()

class CasePriorityUpdateSerializer(serializers.Serializer):
    """Serializer for updating case priority"""
    priority = serializers.ChoiceField(choices=Case.PRIORITY_CHOICES)
    reason = serializers.CharField(required=False, help_text="Reason for priority change")

class CaseAssignmentSerializer(serializers.Serializer):
    """Serializer for assigning cases"""
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role__in=['agent', 'manager', 'admin']))
    reason = serializers.CharField(required=False, help_text="Reason for assignment")

class CaseStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating case status"""
    status = serializers.ChoiceField(choices=Case.STATUS_CHOICES)
    note = serializers.CharField(required=False, help_text="Note about status change") 