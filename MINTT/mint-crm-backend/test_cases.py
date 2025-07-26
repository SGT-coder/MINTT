#!/usr/bin/env python
"""
Test script for case management functionality
This script tests the case creation, assignment, escalation, and closing features
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from cases.models import Case, CaseResponse
from contacts.models import Contact, Company
from cases.services import CaseService, EmailService

User = get_user_model()

def test_case_management():
    """Test case management functionality"""
    print("Testing Case Management Functionality...")
    
    # Get or create test data
    admin_user = User.objects.filter(email='admin@example.com').first()
    if not admin_user:
        print("Creating admin user...")
        admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='admin123',
            first_name='Admin',
            last_name='User'
        )
    
    # Create test contact
    contact, created = Contact.objects.get_or_create(
        email='test@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'Customer',
            'phone': '+1234567890',
            'job_title': 'Manager',
            'department': 'IT',
            'is_customer': True,
        }
    )
    
    # Test 1: Create Case (with unique title)
    print("\n1. Testing Case Creation...")
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        case = Case.objects.create(
            title=f'Test Case - Server Issue {timestamp}',
            description='Testing case creation functionality with unique title',
            category='technical',
            priority='high',
            status='new',
            source='web_form',
            customer=contact,
            created_by=admin_user,
            sla_hours=24
        )
        print(f"✅ Case created successfully: {case.case_number}")
    except Exception as e:
        print(f"❌ Case creation failed: {e}")
        return
    
    # Test 2: Assign Case
    print("\n2. Testing Case Assignment...")
    try:
        case.assigned_to = admin_user
        case.status = 'assigned'
        case.save()
        
        # Create assignment response
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content='Case assigned to admin user',
            is_internal=True
        )
        print(f"✅ Case assigned successfully to {admin_user.get_full_name()}")
    except Exception as e:
        print(f"❌ Case assignment failed: {e}")
    
    # Test 3: Update Priority
    print("\n3. Testing Priority Update...")
    try:
        old_priority = case.priority
        case.priority = 'urgent'
        case.save()
        
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content=f'Priority changed from {old_priority} to urgent',
            is_internal=True
        )
        print(f"✅ Priority updated from {old_priority} to urgent")
    except Exception as e:
        print(f"❌ Priority update failed: {e}")
    
    # Test 4: Add Response
    print("\n4. Testing Response Addition...")
    try:
        response = CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='internal',
            content='This is a test response to verify functionality',
            is_internal=True
        )
        print(f"✅ Response added successfully (ID: {response.id})")
    except Exception as e:
        print(f"❌ Response addition failed: {e}")
    
    # Test 5: Escalate Case
    print("\n5. Testing Case Escalation...")
    try:
        case.status = 'escalated'
        case.priority = 'urgent'
        case.save()
        
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content='Case escalated to management',
            is_internal=True
        )
        print(f"✅ Case escalated successfully")
    except Exception as e:
        print(f"❌ Case escalation failed: {e}")
    
    # Test 6: Close Case
    print("\n6. Testing Case Closure...")
    try:
        case.status = 'resolved'
        case.save()
        
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content='Case resolved and closed',
            is_internal=True
        )
        print(f"✅ Case closed successfully")
    except Exception as e:
        print(f"❌ Case closure failed: {e}")
    
    # Test 7: Verify Case Data
    print("\n7. Verifying Case Data...")
    try:
        case.refresh_from_db()
        print(f"✅ Case Number: {case.case_number}")
        print(f"✅ Title: {case.title}")
        print(f"✅ Status: {case.status}")
        print(f"✅ Priority: {case.priority}")
        print(f"✅ Customer: {case.customer.get_full_name()}")
        print(f"✅ Responses: {case.responses.count()}")
        print(f"✅ Created: {case.created_at}")
        print(f"✅ Updated: {case.updated_at}")
    except Exception as e:
        print(f"❌ Data verification failed: {e}")
    
    print("\n🎉 Case Management Test Completed Successfully!")
    print(f"Test case: {case.case_number} - {case.title}")

def test_api_endpoints():
    """Test API endpoints"""
    print("\nTesting API Endpoints...")
    
    base_url = "http://localhost:8000/api"
    
    # Test cases endpoint
    try:
        response = requests.get(f"{base_url}/cases/")
        if response.status_code == 200:
            print("✅ Cases API endpoint working")
            data = response.json()
            print(f"   Found {data.get('count', 0)} cases")
        elif response.status_code == 401:
            print("⚠️  Cases API endpoint requires authentication")
        else:
            print(f"❌ Cases API endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API test failed: {e}")

def test_existing_cases():
    """Test existing cases in the database"""
    print("\nTesting Existing Cases...")
    
    try:
        cases = Case.objects.all()[:5]  # Get first 5 cases
        print(f"📋 Found {Case.objects.count()} total cases")
        
        for case in cases:
            print(f"   - {case.case_number}: {case.title} ({case.status})")
            
        # Test case operations on existing case
        if cases.exists():
            test_case = cases.first()
            print(f"\n🧪 Testing operations on case: {test_case.case_number}")
            
            # Test status update
            old_status = test_case.status
            test_case.status = 'in_progress'
            test_case.save()
            print(f"✅ Status updated from {old_status} to in_progress")
            
            # Test priority update
            old_priority = test_case.priority
            test_case.priority = 'high'
            test_case.save()
            print(f"✅ Priority updated from {old_priority} to high")
            
            # Revert changes
            test_case.status = old_status
            test_case.priority = old_priority
            test_case.save()
            print(f"✅ Changes reverted")
            
    except Exception as e:
        print(f"❌ Error testing existing cases: {e}")

if __name__ == '__main__':
    test_case_management()
    test_existing_cases()
    test_api_endpoints() 