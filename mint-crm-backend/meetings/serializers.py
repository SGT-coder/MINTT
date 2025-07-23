from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Meeting, MeetingCategory, MeetingAttendance, MeetingReminder, MeetingTemplate, CalendarIntegration
from django.utils import timezone

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for meeting relationships"""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']

class MeetingCategorySerializer(serializers.ModelSerializer):
    """Serializer for meeting categories"""
    
    created_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = MeetingCategory
        fields = [
            'id', 'name', 'color', 'description', 'is_active', 
            'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']

class MeetingCategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating meeting categories"""
    
    class Meta:
        model = MeetingCategory
        fields = ['name', 'color', 'description', 'is_active']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class MeetingAttendanceSerializer(serializers.ModelSerializer):
    """Serializer for meeting attendance"""
    
    user = UserMinimalSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )
    
    class Meta:
        model = MeetingAttendance
        fields = [
            'id', 'meeting', 'user', 'user_id', 'status', 'responded_at',
            'response_notes', 'joined_at', 'left_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'responded_at', 'joined_at', 'left_at', 'created_at', 'updated_at']

class MeetingReminderSerializer(serializers.ModelSerializer):
    """Serializer for meeting reminders"""
    
    user = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = MeetingReminder
        fields = [
            'id', 'meeting', 'user', 'reminder_type', 'scheduled_for',
            'sent_at', 'is_sent', 'created_at'
        ]
        read_only_fields = ['id', 'sent_at', 'is_sent', 'created_at']

class MeetingTemplateSerializer(serializers.ModelSerializer):
    """Serializer for meeting templates"""
    
    created_by = UserMinimalSerializer(read_only=True)
    category = MeetingCategorySerializer(read_only=True)
    
    class Meta:
        model = MeetingTemplate
        fields = [
            'id', 'name', 'description', 'meeting_type', 'duration_minutes',
            'category', 'default_title', 'default_description', 'default_agenda',
            'default_reminder_minutes', 'default_location_type', 'created_by',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

class MeetingTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating meeting templates"""
    
    class Meta:
        model = MeetingTemplate
        fields = [
            'name', 'description', 'meeting_type', 'duration_minutes',
            'category', 'default_title', 'default_description', 'default_agenda',
            'default_reminder_minutes', 'default_location_type', 'is_active'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class MeetingSerializer(serializers.ModelSerializer):
    """Main meeting serializer with nested relationships"""
    
    organizer = UserMinimalSerializer(read_only=True)
    attendees = UserMinimalSerializer(many=True, read_only=True)
    category = MeetingCategorySerializer(read_only=True)
    attendances = MeetingAttendanceSerializer(many=True, read_only=True)
    reminders = MeetingReminderSerializer(many=True, read_only=True)
    
    # CRM relationships
    case = serializers.StringRelatedField()
    contact = serializers.StringRelatedField()
    company = serializers.StringRelatedField()
    
    # Computed fields
    duration_minutes = serializers.IntegerField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_today = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'description', 'meeting_type', 'status', 'priority',
            'start_time', 'end_time', 'timezone', 'all_day', 'location',
            'location_type', 'meeting_url', 'organizer', 'attendees', 'category',
            'case', 'contact', 'company', 'is_recurring', 'recurrence_rule',
            'parent_meeting', 'reminder_minutes', 'send_reminders', 'agenda',
            'notes', 'outcome', 'is_active', 'is_private', 'created_at',
            'updated_at', 'attendances', 'reminders', 'duration_minutes',
            'is_past', 'is_ongoing', 'is_upcoming', 'is_today'
        ]
        read_only_fields = [
            'id', 'organizer', 'created_at', 'updated_at', 'duration_minutes',
            'is_past', 'is_ongoing', 'is_upcoming', 'is_today'
        ]

class MeetingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating meetings"""
    
    attendee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Meeting
        fields = [
            'title', 'description', 'meeting_type', 'status', 'priority',
            'start_time', 'end_time', 'timezone', 'all_day', 'location',
            'location_type', 'meeting_url', 'category', 'case', 'contact',
            'company', 'is_recurring', 'recurrence_rule', 'reminder_minutes',
            'send_reminders', 'agenda', 'notes', 'is_private', 'attendee_ids'
        ]
    
    def create(self, validated_data):
        attendee_ids = validated_data.pop('attendee_ids', [])
        validated_data['organizer'] = self.context['request'].user
        
        meeting = super().create(validated_data)
        
        # Add attendees
        if attendee_ids:
            attendees = User.objects.filter(id__in=attendee_ids)
            meeting.attendees.set(attendees)
        
        return meeting

class MeetingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating meetings"""
    
    attendee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Meeting
        fields = [
            'title', 'description', 'meeting_type', 'status', 'priority',
            'start_time', 'end_time', 'timezone', 'all_day', 'location',
            'location_type', 'meeting_url', 'category', 'case', 'contact',
            'company', 'is_recurring', 'recurrence_rule', 'reminder_minutes',
            'send_reminders', 'agenda', 'notes', 'outcome', 'is_private', 'attendee_ids'
        ]
    
    def update(self, instance, validated_data):
        attendee_ids = validated_data.pop('attendee_ids', None)
        
        meeting = super().update(instance, validated_data)
        
        # Update attendees if provided
        if attendee_ids is not None:
            attendees = User.objects.filter(id__in=attendee_ids)
            meeting.attendees.set(attendees)
        
        return meeting

class MeetingAttendanceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating meeting attendance status"""
    
    class Meta:
        model = MeetingAttendance
        fields = ['status', 'response_notes']
    
    def update(self, instance, validated_data):
        if 'status' in validated_data and validated_data['status'] != instance.status:
            validated_data['responded_at'] = timezone.now()
        
        return super().update(instance, validated_data)

class CalendarIntegrationSerializer(serializers.ModelSerializer):
    """Serializer for calendar integration"""
    
    user = UserMinimalSerializer(read_only=True)
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    
    class Meta:
        model = CalendarIntegration
        fields = [
            'id', 'user', 'provider', 'provider_display', 'is_active',
            'sync_meetings', 'sync_availability', 'last_sync', 'sync_errors',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'last_sync', 'sync_errors', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'api_key': {'write_only': True},
            'api_secret': {'write_only': True},
            'refresh_token': {'write_only': True},
        }
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class CalendarIntegrationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating calendar integration"""
    
    class Meta:
        model = CalendarIntegration
        fields = [
            'provider', 'is_active', 'sync_meetings', 'sync_availability',
            'api_key', 'api_secret', 'refresh_token'
        ]
        extra_kwargs = {
            'api_key': {'write_only': True},
            'api_secret': {'write_only': True},
            'refresh_token': {'write_only': True},
        }
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class MeetingStatsSerializer(serializers.Serializer):
    """Serializer for meeting statistics"""
    
    total_meetings = serializers.IntegerField()
    upcoming_meetings = serializers.IntegerField()
    today_meetings = serializers.IntegerField()
    past_meetings = serializers.IntegerField()
    by_status = serializers.ListField()
    by_type = serializers.ListField()
    by_priority = serializers.ListField()

class MeetingSearchSerializer(serializers.Serializer):
    """Serializer for meeting search parameters"""
    
    search = serializers.CharField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    meeting_type = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    priority = serializers.CharField(required=False)
    organizer = serializers.IntegerField(required=False)
    attendee = serializers.IntegerField(required=False)
    category = serializers.IntegerField(required=False)
    case = serializers.IntegerField(required=False)
    contact = serializers.IntegerField(required=False)
    company = serializers.IntegerField(required=False) 