from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q
from .models import Contact, Company
from .serializers import (
    ContactSerializer, ContactCreateSerializer, ContactUpdateSerializer, ContactListSerializer,
    CompanySerializer, CompanyCreateSerializer
)

class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for Company model"""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['industry', 'is_active', 'is_customer', 'is_prospect']
    search_fields = ['name', 'website', 'phone', 'address']
    ordering_fields = ['name', 'created_at', 'annual_revenue']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompanyCreateSerializer
        return CompanySerializer
    
    @action(detail=False, methods=['get'])
    def customers(self, request):
        """Get all customer companies"""
        customers = self.get_queryset().filter(is_customer=True)
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def prospects(self, request):
        """Get all prospect companies"""
        prospects = self.get_queryset().filter(is_prospect=True)
        serializer = self.get_serializer(prospects, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get company statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_companies': queryset.count(),
            'customers': queryset.filter(is_customer=True).count(),
            'prospects': queryset.filter(is_prospect=True).count(),
            'by_industry': queryset.values('industry').annotate(count=Count('id')),
        }
        
        return Response(stats)

class ContactViewSet(viewsets.ModelViewSet):
    """ViewSet for Contact model"""
    queryset = Contact.objects.select_related('company', 'user')
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['company', 'is_customer', 'is_prospect', 'is_active']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['first_name', 'last_name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ContactCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ContactUpdateSerializer
        elif self.action == 'list':
            return ContactListSerializer
        return ContactSerializer
    
    def get_queryset(self):
        """Filter queryset with custom search"""
        queryset = super().get_queryset()
        
        # Apply search filter if search parameter is provided
        search = self.request.query_params.get('search', None)
        if search:
            queryset = self.filter_queryset_by_search(queryset, search)
        
        return queryset
    
    def filter_queryset_by_search(self, queryset, search_term):
        """Custom search method to handle related field searches"""
        if not search_term:
            return queryset
        
        # Create Q objects for different search fields
        search_filters = Q()
        
        # Direct field searches
        search_filters |= Q(first_name__icontains=search_term)
        search_filters |= Q(last_name__icontains=search_term)
        search_filters |= Q(email__icontains=search_term)
        search_filters |= Q(phone__icontains=search_term)
        
        # Related field searches
        search_filters |= Q(company__name__icontains=search_term)
        
        return queryset.filter(search_filters)
    
    @action(detail=False, methods=['get'])
    def customers(self, request):
        """Get all customer contacts"""
        customers = self.get_queryset().filter(is_customer=True)
        serializer = ContactListSerializer(customers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def prospects(self, request):
        """Get all prospect contacts"""
        prospects = self.get_queryset().filter(is_prospect=True)
        serializer = ContactListSerializer(prospects, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced search for contacts"""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Search query required'}, status=status.HTTP_400_BAD_REQUEST)
        
        contacts = self.get_queryset().filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query) |
            Q(phone__icontains=query) |
            Q(company__name__icontains=query)
        )
        
        serializer = ContactListSerializer(contacts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get contact statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_contacts': queryset.count(),
            'customers': queryset.filter(is_customer=True).count(),
            'prospects': queryset.filter(is_prospect=True).count(),
            'by_company': queryset.values('company__name').annotate(count=Count('id')),
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def convert_to_customer(self, request, pk=None):
        """Convert prospect to customer"""
        contact = self.get_object()
        
        if contact.is_customer:
            return Response(
                {'error': 'Contact is already a customer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        contact.is_customer = True
        contact.is_prospect = False
        contact.save()
        
        return Response({
            'message': f'{contact.get_full_name()} converted to customer',
            'contact': ContactSerializer(contact).data
        }) 