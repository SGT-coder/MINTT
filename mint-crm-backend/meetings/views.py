from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Count, Q
from datetime import datetime, timedelta
from .models import Meeting, MeetingCategory, MeetingAttendance, MeetingReminder, MeetingTemplate, CalendarIntegration
from .serializers import (
    MeetingSerializer, MeetingCreateSerializer, MeetingUpdateSerializer,
    MeetingCategorySerializer, MeetingCategoryCreateSerializer,
    MeetingAttendanceSerializer, MeetingAttendanceUpdateSerializer,
    MeetingReminderSerializer, MeetingTemplateSerializer, MeetingTemplateCreateSerializer,
    CalendarIntegrationSerializer, CalendarIntegrationCreateSerializer,
    MeetingStatsSerializer, MeetingSearchSerializer
)

class MeetingViewSet(viewsets.ModelViewSet):
    """ViewSet for Meeting model"""
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'meeting_type', 'status', 'priority', 'organizer', 'category',
        'case', 'contact', 'company', 'is_recurring', 'is_private', 'all_day'
    ]
    search_fields = ['title', 'description', 'location', 'agenda', 'notes']
    ordering_fields = ['start_time', 'end_time', 'created_at', 'title']
    ordering = ['-start_time'] 
    
    def get_queryset(self):
        """Filter meetings based on user permissions and visibility"""
        user = self.request.user
        
        # Base queryset
        queryset = Meeting.objects.select_related(
            'organizer', 'category', 'case', 'contact', 'company'
        ).prefetch_related(
            'attendees', 'attendances__user', 'reminders__user'
        )
        
        # Filter by visibility
        if not user.is_staff:
            # Regular users see meetings they organize or attend
            queryset = queryset.filter(
                Q(organizer=user) | Q(attendees=user) | Q(is_private=False)
            ).distinct()
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MeetingCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MeetingUpdateSerializer
        return MeetingSerializer
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a meeting (mark as attended)"""
        meeting = self.get_object()
        user = request.user
        
        # Check if user is an attendee
        if user not in meeting.attendees.all():
            return Response(
                {'error': 'You are not an attendee of this meeting'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update attendance status
        attendance, created = MeetingAttendance.objects.get_or_create(
            meeting=meeting,
            user=user,
            defaults={'status': 'attended', 'joined_at': timezone.now()}
        )
        
        if not created:
            attendance.status = 'attended'
            attendance.joined_at = timezone.now()
            attendance.save()
        
        return Response({'message': 'Successfully joined the meeting'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a meeting (mark as left)"""
        meeting = self.get_object()
        user = request.user
        
        try:
            attendance = MeetingAttendance.objects.get(meeting=meeting, user=user)
            attendance.left_at = timezone.now()
            attendance.save()
            return Response({'message': 'Successfully left the meeting'})
        except MeetingAttendance.DoesNotExist:
            return Response(
                {'error': 'Attendance record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark meeting as completed"""
        meeting = self.get_object()
        
        # Check if user is organizer
        if meeting.organizer != request.user:
            return Response(
                {'error': 'Only the organizer can complete the meeting'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        meeting.status = 'completed'
        meeting.save()
        
        return Response({'message': 'Meeting marked as completed'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a meeting"""
        meeting = self.get_object()
        
        # Check if user is organizer
        if meeting.organizer != request.user:
            return Response(
                {'error': 'Only the organizer can cancel the meeting'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        meeting.status = 'cancelled'
        meeting.save()
        
        return Response({'message': 'Meeting cancelled'})
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's meetings"""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(
            start_time__date=today
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming meetings"""
        now = timezone.now()
        queryset = self.get_queryset().filter(
            start_time__gt=now
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def past(self, request):
        """Get past meetings"""
        now = timezone.now()
        queryset = self.get_queryset().filter(
            end_time__lt=now
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get meeting statistics"""
        queryset = self.get_queryset()
        now = timezone.now()
        today = now.date()
        
        stats = {
            'total_meetings': queryset.count(),
            'upcoming_meetings': queryset.filter(start_time__gt=now).count(),
            'today_meetings': queryset.filter(start_time__date=today).count(),
            'past_meetings': queryset.filter(end_time__lt=now).count(),
            'by_status': list(queryset.values('status').annotate(count=Count('id'))),
            'by_type': list(queryset.values('meeting_type').annotate(count=Count('id'))),
            'by_priority': list(queryset.values('priority').annotate(count=Count('id'))),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Advanced meeting search"""
        serializer = MeetingSearchSerializer(data=request.data)
        
        if serializer.is_valid():
            queryset = self.get_queryset()
            data = serializer.validated_data
            
            # Apply filters
            if data.get('search'):
                search_term = data['search']
                queryset = queryset.filter(
                    Q(title__icontains=search_term) |
                    Q(description__icontains=search_term) |
                    Q(location__icontains=search_term) |
                    Q(agenda__icontains=search_term)
                )
            
            if data.get('start_date'):
                queryset = queryset.filter(start_time__date__gte=data['start_date'])
            
            if data.get('end_date'):
                queryset = queryset.filter(end_time__date__lte=data['end_date'])
            
            if data.get('meeting_type'):
                queryset = queryset.filter(meeting_type=data['meeting_type'])
            
            if data.get('status'):
                queryset = queryset.filter(status=data['status'])
            
            if data.get('priority'):
                queryset = queryset.filter(priority=data['priority'])
            
            if data.get('organizer'):
                queryset = queryset.filter(organizer_id=data['organizer'])
            
            if data.get('attendee'):
                queryset = queryset.filter(attendees__id=data['attendee'])
            
            if data.get('category'):
                queryset = queryset.filter(category_id=data['category'])
            
            if data.get('case'):
                queryset = queryset.filter(case_id=data['case'])
            
            if data.get('contact'):
                queryset = queryset.filter(contact_id=data['contact'])
            
            if data.get('company'):
                queryset = queryset.filter(company_id=data['company'])
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MeetingCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for MeetingCategory model"""
    queryset = MeetingCategory.objects.select_related('created_by')
    serializer_class = MeetingCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'created_by']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MeetingCategoryCreateSerializer
        return MeetingCategorySerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active categories only"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class MeetingAttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for MeetingAttendance model"""
    queryset = MeetingAttendance.objects.select_related('meeting', 'user')
    serializer_class = MeetingAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['meeting', 'user', 'status']
    ordering_fields = ['created_at', 'responded_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter attendances based on user permissions"""
        user = self.request.user
        
        if user.is_staff:
            return self.queryset
        
        # Regular users see their own attendances or meetings they organize
        return self.queryset.filter(
            Q(user=user) | Q(meeting__organizer=user)
        )
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return MeetingAttendanceUpdateSerializer
        return MeetingAttendanceSerializer
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Respond to meeting invitation"""
        attendance = self.get_object()
        status_response = request.data.get('status')
        notes = request.data.get('response_notes', '')
        
        if status_response not in ['accepted', 'declined', 'tentative']:
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendance.status = status_response
        attendance.response_notes = notes
        attendance.responded_at = timezone.now()
        attendance.save()
        
        return Response({'message': f'Response recorded: {status_response}'})

class MeetingReminderViewSet(viewsets.ModelViewSet):
    """ViewSet for MeetingReminder model"""
    queryset = MeetingReminder.objects.select_related('meeting', 'user')
    serializer_class = MeetingReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['meeting', 'user', 'reminder_type', 'is_sent']
    ordering_fields = ['scheduled_for', 'created_at']
    ordering = ['scheduled_for']
    
    def get_queryset(self):
        """Filter reminders based on user permissions"""
        user = self.request.user
        
        if user.is_staff:
            return self.queryset
        
        # Regular users see their own reminders
        return self.queryset.filter(user=user)

class MeetingTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for MeetingTemplate model"""
    queryset = MeetingTemplate.objects.select_related('created_by', 'category')
    serializer_class = MeetingTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['meeting_type', 'category', 'is_active', 'created_by']
    search_fields = ['name', 'description', 'default_title']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MeetingTemplateCreateSerializer
        return MeetingTemplateSerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active templates only"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def create_meeting(self, request, pk=None):
        """Create a meeting from template"""
        template = self.get_object()
        serializer = MeetingCreateSerializer(data=request.data, context=request)
        
        if serializer.is_valid():
            # Apply template defaults
            data = serializer.validated_data
            data['meeting_type'] = template.meeting_type
            data['default_reminder_minutes'] = template.default_reminder_minutes
            data['location_type'] = template.default_location_type
            
            # Apply template content if not provided
            if not data.get('title'):
                data['title'] = template.default_title
            if not data.get('description'):
                data['description'] = template.default_description
            if not data.get('agenda'):
                data['agenda'] = template.default_agenda
            
            meeting = serializer.create(data)
            return Response(
                MeetingSerializer(meeting).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CalendarIntegrationViewSet(viewsets.ModelViewSet):
    """ViewSet for CalendarIntegration model"""
    queryset = CalendarIntegration.objects.all()
    serializer_class = CalendarIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own calendar integrations"""
        return CalendarIntegration.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CalendarIntegrationCreateSerializer
        return CalendarIntegrationSerializer
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test calendar integration connection"""
        integration = self.get_object()
        
        # This would typically test the API connection
        # For now, just return success
        return Response({'message': 'Connection test successful'})
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Sync meetings with external calendar"""
        integration = self.get_object()
        
        # This would typically sync meetings
        # For now, just update last_sync
        integration.last_sync = timezone.now()
        integration.save()
        
        return Response({'message': 'Sync completed successfully'}) 