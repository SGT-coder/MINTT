from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Document, Folder
from .serializers import DocumentSerializer, FolderSerializer

class FolderViewSet(viewsets.ModelViewSet):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['parent', 'created_by']
    search_fields = ['name']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['folder', 'uploaded_by', 'file_type']
    search_fields = ['title', 'description']

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user) 