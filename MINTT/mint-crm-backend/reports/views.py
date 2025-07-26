from rest_framework import viewsets, permissions
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Report

class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet for Report model"""
    queryset = Report.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type', 'is_active', 'created_by']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'last_generated']
    ordering = ['-created_at'] 