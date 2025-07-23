from rest_framework import viewsets, permissions
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Notification

class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for Notification model"""
    queryset = Notification.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['notification_type', 'is_read', 'is_active', 'recipient']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'read_at']
    ordering = ['-created_at'] 