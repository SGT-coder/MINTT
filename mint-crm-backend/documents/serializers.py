from rest_framework import serializers
from .models import Document, Folder

class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')

class DocumentSerializer(serializers.ModelSerializer):
    folder = FolderSerializer(read_only=True)
    folder_id = serializers.PrimaryKeyRelatedField(queryset=Folder.objects.all(), source='folder', write_only=True, required=False, allow_null=True)

    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'created_at', 'updated_at') 