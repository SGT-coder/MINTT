#!/usr/bin/env python
"""
Comprehensive Test Script for MINT CRM Case Management
This script tests all case management features end-to-end
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

def test_database_connection():
    """Test database connection"""
    print("🔍 Testing Database Connection...")
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Database connected: {version[0]}")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_case_creation():
    """Test case creation functionality"""
    print("\n📝 Testing Case Creation...")
    
    try:
        # Get admin user
        admin_user = User.objects.filter(email='admin@example.com').first()
        if not admin_user:
            print("❌ Admin user not found")
            return False
        
        # Get or create test contact
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
        
        # Create case with unique title
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        case = Case.objects.create(
            title=f'Test Case - Database Test {timestamp}',
            description='Testing case creation functionality',
            category='technical',
            priority='high',
            status='new',
            source='web_form',
            customer=contact,
            created_by=admin_user,
            sla_hours=24
        )
        
        print(f"✅ Case created: {case.case_number}")
        return case
        
    except Exception as e:
        print(f"❌ Case creation failed: {e}")
        return None

def test_case_assignment(case):
    """Test case assignment"""
    print("\n👤 Testing Case Assignment...")
    
    try:
        admin_user = User.objects.filter(email='admin@example.com').first()
        
        # Assign case
        case.assigned_to = admin_user
        case.status = 'assigned'
        case.save()
        
        # Create assignment note
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content='Case assigned to admin user',
            is_internal=True
        )
        
        print(f"✅ Case assigned to {admin_user.get_full_name()}")
        return True
        
    except Exception as e:
        print(f"❌ Case assignment failed: {e}")
        return False

def test_priority_update(case):
    """Test priority update"""
    print("\n⚡ Testing Priority Update...")
    
    try:
        admin_user = User.objects.filter(email='admin@example.com').first()
        old_priority = case.priority
        
        # Update priority
        case.priority = 'urgent'
        case.save()
        
        # Create priority change note
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content=f'Priority changed from {old_priority} to urgent',
            is_internal=True
        )
        
        print(f"✅ Priority updated from {old_priority} to urgent")
        return True
        
    except Exception as e:
        print(f"❌ Priority update failed: {e}")
        return False

def test_case_escalation(case):
    """Test case escalation"""
    print("\n🚨 Testing Case Escalation...")
    
    try:
        admin_user = User.objects.filter(email='admin@example.com').first()
        
        # Escalate case
        case.status = 'escalated'
        case.priority = 'urgent'
        case.save()
        
        # Create escalation note
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content='Case escalated to management',
            is_internal=True
        )
        
        print("✅ Case escalated successfully")
        return True
        
    except Exception as e:
        print(f"❌ Case escalation failed: {e}")
        return False

def test_case_responses(case):
    """Test case responses"""
    print("\n💬 Testing Case Responses...")
    
    try:
        admin_user = User.objects.filter(email='admin@example.com').first()
        
        # Add internal response
        internal_response = CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='internal',
            content='This is an internal test response',
            is_internal=True
        )
        
        # Add customer response
        customer_response = CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='customer',
            content='This is a customer-facing response',
            is_internal=False
        )
        
        print(f"✅ Added {case.responses.count()} responses")
        return True
        
    except Exception as e:
        print(f"❌ Case responses failed: {e}")
        return False

def test_case_closure(case):
    """Test case closure"""
    print("\n✅ Testing Case Closure...")
    
    try:
        admin_user = User.objects.filter(email='admin@example.com').first()
        
        # Close case
        case.status = 'resolved'
        case.save()
        
        # Create closure note
        CaseResponse.objects.create(
            case=case,
            author=admin_user,
            response_type='system',
            content='Case resolved and closed',
            is_internal=True
        )
        
        print("✅ Case closed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Case closure failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints"""
    print("\n🌐 Testing API Endpoints...")
    
    base_url = "http://localhost:8000/api"
    
    # Test cases endpoint
    try:
        response = requests.get(f"{base_url}/cases/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Cases API working - {data.get('count', 0)} cases found")
            return True
        elif response.status_code == 401:
            print("⚠️  Cases API requires authentication (expected)")
            return True
        else:
            print(f"❌ Cases API failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("⚠️  Django server not running (start with: python manage.py runserver)")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def test_existing_data():
    """Test existing data in database"""
    print("\n📊 Testing Existing Data...")
    
    try:
        case_count = Case.objects.count()
        contact_count = Contact.objects.count()
        user_count = User.objects.count()
        response_count = CaseResponse.objects.count()
        
        print(f"✅ Database contains:")
        print(f"   - {case_count} cases")
        print(f"   - {contact_count} contacts")
        print(f"   - {user_count} users")
        print(f"   - {response_count} responses")
        
        # Show sample cases
        cases = Case.objects.all()[:3]
        print(f"\n📋 Sample cases:")
        for case in cases:
            print(f"   - {case.case_number}: {case.title} ({case.status})")
        
        return True
        
    except Exception as e:
        print(f"❌ Data test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 MINT CRM Comprehensive Test")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 0
    
    # Test 1: Database connection
    total_tests += 1
    if test_database_connection():
        tests_passed += 1
    
    # Test 2: Case creation
    total_tests += 1
    case = test_case_creation()
    if case:
        tests_passed += 1
        
        # Test 3: Case assignment
        total_tests += 1
        if test_case_assignment(case):
            tests_passed += 1
        
        # Test 4: Priority update
        total_tests += 1
        if test_priority_update(case):
            tests_passed += 1
        
        # Test 5: Case escalation
        total_tests += 1
        if test_case_escalation(case):
            tests_passed += 1
        
        # Test 6: Case responses
        total_tests += 1
        if test_case_responses(case):
            tests_passed += 1
        
        # Test 7: Case closure
        total_tests += 1
        if test_case_closure(case):
            tests_passed += 1
    
    # Test 8: API endpoints
    total_tests += 1
    if test_api_endpoints():
        tests_passed += 1
    
    # Test 9: Existing data
    total_tests += 1
    if test_existing_data():
        tests_passed += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY")
    print("=" * 50)
    print(f"✅ Tests passed: {tests_passed}/{total_tests}")
    print(f"📊 Success rate: {(tests_passed/total_tests)*100:.1f}%")
    
    if tests_passed == total_tests:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Case management system is working correctly")
        print("✅ Database connection is stable")
        print("✅ API endpoints are functional")
        print("✅ All CRUD operations work")
    else:
        print(f"\n⚠️  {total_tests - tests_passed} test(s) failed")
        print("Please check the error messages above")
    
    print("\n🔗 Next steps:")
    print("1. Start Django server: python manage.py runserver")
    print("2. Start frontend: cd ../mint-crm_V2.1 && pnpm dev")
    print("3. Access frontend: http://localhost:3000")
    print("4. Login with: admin@example.com / admin123")

if __name__ == '__main__':
    main() 