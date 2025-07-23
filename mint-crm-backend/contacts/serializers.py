from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Contact, Company

User = get_user_model()

class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model"""
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'industry', 'website', 'phone', 'address', 'city',
            'state', 'country', 'postal_code', 'description', 'annual_revenue',
            'employee_count', 'is_active', 'is_customer', 'is_prospect',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class CompanyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating companies"""
    
    class Meta:
        model = Company
        fields = [
            'name', 'industry', 'website', 'phone', 'address', 'city',
            'state', 'country', 'postal_code', 'description', 'annual_revenue',
            'employee_count', 'is_active', 'is_customer', 'is_prospect'
        ]

class ContactSerializer(serializers.ModelSerializer):
    """Serializer for Contact model"""
    
    company = CompanySerializer(read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Contact
        fields = [
            'id', 'title', 'first_name', 'last_name', 'email', 'phone', 'mobile',
            'company', 'job_title', 'department', 'address', 'city', 'state',
            'country', 'postal_code', 'notes', 'birthday', 'linkedin_url',
            'twitter_handle', 'is_active', 'is_customer', 'is_prospect',
            'email_opt_out', 'phone_opt_out', 'user', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class ContactCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating contacts"""
    
    class Meta:
        model = Contact
        fields = [
            'title', 'first_name', 'last_name', 'email', 'phone', 'mobile',
            'company', 'job_title', 'department', 'address', 'city', 'state',
            'country', 'postal_code', 'notes', 'birthday', 'linkedin_url',
            'twitter_handle', 'is_active', 'is_customer', 'is_prospect',
            'email_opt_out', 'phone_opt_out'
        ]

class ContactUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating contacts"""
    
    class Meta:
        model = Contact
        fields = [
            'title', 'first_name', 'last_name', 'phone', 'mobile', 'company',
            'job_title', 'department', 'address', 'city', 'state', 'country',
            'postal_code', 'notes', 'birthday', 'linkedin_url', 'twitter_handle',
            'is_active', 'is_customer', 'is_prospect', 'email_opt_out', 'phone_opt_out'
        ]

class ContactListSerializer(serializers.ModelSerializer):
    """Simplified serializer for contact lists"""
    
    company = serializers.StringRelatedField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Contact
        fields = [
            'id', 'full_name', 'email', 'phone', 'company', 'job_title',
            'is_customer', 'is_active', 'created_at'
        ]
    
    def get_full_name(self, obj):
        return obj.get_full_name() 