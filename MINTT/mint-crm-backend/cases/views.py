from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import timedelta
from .models import Case, CaseResponse, CaseAttachment
from .serializers import (
    CaseSerializer, CaseCreateSerializer, CaseUpdateSerializer, CaseListSerializer,
    CaseResponseSerializer, CaseResponseCreateSerializer, CaseAttachmentSerializer,
    CasePriorityUpdateSerializer, CaseAssignmentSerializer, CaseStatusUpdateSerializer
)
from .permissions import CasePermission
from .services import CaseService, EmailService
from emails.custom_sms_service import CustomSMSService

class CaseViewSet(viewsets.ModelViewSet):
    """ViewSet for Case model with advanced features"""
    queryset = Case.objects.select_related(
        'customer', 'company', 'assigned_to', 'created_by'
    ).prefetch_related('responses', 'attachments')
    serializer_class = CaseSerializer
    permission_classes = [permissions.IsAuthenticated, CasePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'status', 'priority', 'category', 'source', 'assigned_to', 
        'customer', 'company', 'created_by'
    ]
    search_fields = [
        'case_number', 'title', 'description'
    ]
    ordering_fields = [
        'created_at', 'updated_at', 'due_date', 'priority', 'status'
    ]
    ordering = ['-priority', '-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CaseCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CaseUpdateSerializer
        elif self.action == 'list':
            return CaseListSerializer
        return CaseSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role and permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Apply search filter if search parameter is provided
        search = self.request.query_params.get('search', None)
        print(f"Received search parameter: '{search}'")  # Debug log
        if search:
            queryset = self.filter_queryset_by_search(queryset, search)
        
        # Admins and managers can see all cases
        if user.is_manager:
            return queryset
        
        # Agents can see assigned cases and unassigned cases
        if user.role == 'agent':
            return queryset.filter(
                Q(assigned_to=user) | Q(assigned_to__isnull=True)
            )
        
        # Customers can only see their own cases
        if user.role == 'customer':
            return queryset.filter(customer__user=user)
        
        return queryset.none()
    
    def filter_queryset_by_search(self, queryset, search_term):
        """Custom search method to handle related field searches"""
        if not search_term:
            return queryset
        
        print(f"Searching for: '{search_term}'")  # Debug log
        
        # Create Q objects for different search fields
        search_filters = Q()
        
        # Direct field searches
        search_filters |= Q(case_number__icontains=search_term)
        search_filters |= Q(title__icontains=search_term)
        search_filters |= Q(description__icontains=search_term)
        
        # Related field searches - Contact has first_name and last_name, not name
        search_filters |= Q(customer__first_name__icontains=search_term)
        search_filters |= Q(customer__last_name__icontains=search_term)
        search_filters |= Q(customer__email__icontains=search_term)
        search_filters |= Q(company__name__icontains=search_term)
        
        # Assigned user searches
        search_filters |= Q(assigned_to__first_name__icontains=search_term)
        search_filters |= Q(assigned_to__last_name__icontains=search_term)
        search_filters |= Q(assigned_to__email__icontains=search_term)
        
        filtered_queryset = queryset.filter(search_filters)
        print(f"Found {filtered_queryset.count()} cases matching search")  # Debug log
        
        return filtered_queryset
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign case to an agent"""
        case = self.get_object()
        serializer = CaseAssignmentSerializer(data=request.data)
        
        if serializer.is_valid():
            assigned_to = serializer.validated_data['assigned_to']
            reason = serializer.validated_data.get('reason', '')
            
            # Update case assignment
            case.assigned_to = assigned_to
            case.status = 'assigned'
            case.save()
            
            # Create system note
            CaseResponse.objects.create(
                case=case,
                author=request.user,
                response_type='system',
                content=f"Case assigned to {assigned_to.get_full_name()}. {reason}".strip(),
                is_internal=True
            )
            
            # Send email notification
            email_result = EmailService.send_case_assignment_email(case, assigned_to)
            
            # Send SMS notification
            sms_result = None
            try:
                sms_result = CustomSMSService.send_case_assignment_sms(case, assigned_to)
            except Exception as e:
                # Log SMS error but don't fail the assignment
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"SMS notification failed for case assignment: {str(e)}")
            
            return Response({
                'message': f'Case assigned to {assigned_to.get_full_name()}',
                'case': CaseSerializer(case).data,
                'notifications': {
                    'email_sent': email_result is not None,
                    'sms_sent': sms_result is not None
                }
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_priority(self, request, pk=None):
        """Update case priority"""
        case = self.get_object()
        serializer = CasePriorityUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            old_priority = case.priority
            new_priority = serializer.validated_data['priority']
            reason = serializer.validated_data.get('reason', '')
            
            case.priority = new_priority
            case.save()
            
            # Create system note
            note_content = f"Priority changed from {old_priority} to {new_priority}"
            if reason:
                note_content += f". Reason: {reason}"
            
            CaseResponse.objects.create(
                case=case,
                author=request.user,
                response_type='system',
                content=note_content,
                is_internal=True
            )
            
            return Response({
                'message': f'Priority updated to {new_priority}',
                'case': CaseSerializer(case).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update case status"""
        case = self.get_object()
        serializer = CaseStatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            old_status = case.status
            new_status = serializer.validated_data['status']
            note = serializer.validated_data.get('note', '')
            
            case.status = new_status
            if new_status == 'resolved':
                case.resolved_at = timezone.now()
            case.save()
            
            # Create system note
            note_content = f"Status changed from {old_status} to {new_status}"
            if note:
                note_content += f". Note: {note}"
            
            CaseResponse.objects.create(
                case=case,
                author=request.user,
                response_type='system',
                content=note_content,
                is_internal=True
            )
            
            # Send SMS notification for case resolution
            sms_result = None
            if new_status == 'resolved' and case.customer.phone:
                try:
                    sms_result = CustomSMSService.send_case_resolution_sms(case)
                except Exception as e:
                    # Log SMS error but don't fail the status update
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"SMS notification failed for case resolution: {str(e)}")
            
            return Response({
                'message': f'Status updated to {new_status}',
                'case': CaseSerializer(case).data,
                'notifications': {
                    'sms_sent': sms_result is not None
                }
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Escalate case to manager"""
        case = self.get_object()
        
        # Find available managers
        from django.contrib.auth import get_user_model
        User = get_user_model()
        managers = User.objects.filter(role__in=['manager', 'admin'])
        
        if not managers.exists():
            return Response(
                {'error': 'No managers available for escalation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Assign to first available manager
        manager = managers.first()
        case.assigned_to = manager
        case.status = 'escalated'
        case.priority = 'high' if case.priority != 'urgent' else 'urgent'
        case.save()
        
        # Create system note
        CaseResponse.objects.create(
            case=case,
            author=request.user,
            response_type='system',
            content=f"Case escalated to {manager.get_full_name()}",
            is_internal=True
        )
        
        # Send escalation email
        email_result = EmailService.send_case_escalation_email(case, manager)
        
        # Send escalation SMS
        sms_result = None
        try:
            sms_result = CustomSMSService.send_case_escalation_sms(case, manager)
        except Exception as e:
            # Log SMS error but don't fail the escalation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"SMS notification failed for case escalation: {str(e)}")
        
        return Response({
            'message': f'Case escalated to {manager.get_full_name()}',
            'case': CaseSerializer(case).data,
            'notifications': {
                'email_sent': email_result is not None,
                'sms_sent': sms_result is not None
            }
        })
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for cases"""
        user = request.user
        queryset = self.get_queryset()
        
        # Filter by date range if provided
        days = request.query_params.get('days', 30)
        start_date = timezone.now() - timedelta(days=int(days))
        queryset = queryset.filter(created_at__gte=start_date)
        
        stats = {
            'total_cases': queryset.count(),
            'new_cases': queryset.filter(status='new').count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'resolved': queryset.filter(status='resolved').count(),
            'overdue': queryset.filter(due_date__lt=timezone.now()).count(),
            'by_priority': queryset.values('priority').annotate(count=Count('id')),
            'by_status': queryset.values('status').annotate(count=Count('id')),
            'by_category': queryset.values('category').annotate(count=Count('id')),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def my_cases(self, request):
        """Get cases assigned to current user"""
        user = request.user
        if user.role == 'customer':
            queryset = self.get_queryset().filter(customer__user=user)
        else:
            queryset = self.get_queryset().filter(assigned_to=user)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CaseListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = CaseListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def urgent_cases(self, request):
        """Get urgent and high priority cases"""
        queryset = self.get_queryset().filter(
            priority__in=['urgent', 'high']
        ).filter(
            status__in=['new', 'assigned', 'in_progress']
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CaseListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = CaseListSerializer(queryset, many=True)
        return Response(serializer.data)

class CaseResponseViewSet(viewsets.ModelViewSet):
    """ViewSet for CaseResponse model"""
    queryset = CaseResponse.objects.select_related('case', 'author')
    serializer_class = CaseResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['case', 'response_type', 'is_internal', 'author']
    ordering_fields = ['created_at']
    ordering = ['created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CaseResponseCreateSerializer
        return CaseResponseSerializer
    
    def perform_create(self, serializer):
        response = serializer.save()
        
        # Send email if it's a customer response
        email_result = None
        if response.response_type == 'customer' and response.email_to:
            email_result = EmailService.send_case_response_email(response)
        
        # Send SMS notification to customer for any response
        sms_result = None
        if response.response_type == 'customer' and response.case.customer.phone:
            try:
                sms_result = CustomSMSService.send_case_response_sms(response)
            except Exception as e:
                # Log SMS error but don't fail the response creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"SMS notification failed for case response: {str(e)}")
        
        # Log notification results
        if email_result or sms_result:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Case response notifications - Email: {email_result is not None}, SMS: {sms_result is not None}")
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send response as email"""
        response = self.get_object()
        
        if response.email_sent:
            return Response(
                {'error': 'Email already sent'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            EmailService.send_case_response_email(response)
            response.email_sent = True
            response.save()
            
            return Response({'message': 'Email sent successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 