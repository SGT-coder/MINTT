#!/usr/bin/env python
"""
Script to fix case number conflicts in the database
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')
django.setup()

from cases.models import Case

def check_case_numbers():
    """Check existing case numbers"""
    print("🔍 Checking existing case numbers...")
    
    cases = Case.objects.all().order_by('case_number')
    case_numbers = []
    
    for case in cases:
        case_numbers.append(case.case_number)
        print(f"   - {case.case_number}: {case.title}")
    
    return case_numbers

def fix_case_numbers():
    """Fix case number conflicts"""
    print("\n🔧 Fixing case number conflicts...")
    
    cases = Case.objects.all().order_by('id')
    next_number = 1
    
    for case in cases:
        expected_number = f"CASE-{next_number:06d}"
        
        if case.case_number != expected_number:
            print(f"   Fixing {case.case_number} -> {expected_number}")
            case.case_number = expected_number
            case.save(update_fields=['case_number'])
        
        next_number += 1
    
    print("✅ Case numbers fixed!")

def test_case_creation():
    """Test case creation after fix"""
    print("\n🧪 Testing case creation...")
    
    from django.contrib.auth import get_user_model
    from contacts.models import Contact
    
    User = get_user_model()
    
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
    
    # Create test case
    try:
        case = Case.objects.create(
            title='Test Case - Fixed Number',
            description='Testing case creation after number fix',
            category='technical',
            priority='high',
            status='new',
            source='web_form',
            customer=contact,
            created_by=admin_user,
            sla_hours=24
        )
        print(f"✅ Case created successfully: {case.case_number}")
        return True
    except Exception as e:
        print(f"❌ Case creation failed: {e}")
        return False

if __name__ == '__main__':
    print("🚀 Case Number Fix Script")
    print("=" * 40)
    
    # Check current case numbers
    case_numbers = check_case_numbers()
    
    # Fix case numbers
    fix_case_numbers()
    
    # Check again
    print("\n📋 After fix:")
    check_case_numbers()
    
    # Test creation
    test_case_creation()
    
    print("\n✅ Script completed!") 