from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Folder(models.Model):
    name = models.CharField(max_length=200)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subfolders')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='folders')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    """Document model for file management"""
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='documents/')
    file_type = models.CharField(max_length=50, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    
    # Relationships
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_documents')
    folder = models.ForeignKey(Folder, null=True, blank=True, on_delete=models.SET_NULL, related_name='documents')
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title 