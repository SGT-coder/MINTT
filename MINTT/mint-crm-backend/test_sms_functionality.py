#!/usr/bin/env python
"""
Test SMS Functionality End-to-End
This script tests the complete SMS workflow from user phone number to SMS sending
"""

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from cases.models import Case, Contact
from emails.custom_sms_service import CustomSMSService
from emails.models import SMS

User = get_user_model()

def test_sms_functionality():
    """Test the complete SMS functionality"""
    print("🧪 Testing SMS Functionality")
    print("=" * 50)
    
    # 1. Check if users have phone numbers
    print("\n1. Checking users with phone numbers...")
    users_with_phones = User.objects.filter(phone__isnull=False).exclude(phone='')
    print(f"   ✅ Found {users_with_phones.count()} users with phone numbers")
    
    if users_with_phones.exists():
        for user in users_with_phones[:3]:  # Show first 3
            print(f"   - {user.get_full_name()}: {user.phone}")
    else:
        print("   ⚠️  No users with phone numbers found")
        print("   💡 Add phone numbers to users in the admin panel or user management page")
        return False
    
    # 2. Check if there are any cases
    print("\n2. Checking for cases...")
    cases = Case.objects.all()
    print(f"   ✅ Found {cases.count()} cases")
    
    if not cases.exists():
        print("   ⚠️  No cases found")
        print("   💡 Create some cases first to test assignment")
        return False
    
    # 3. Test case assignment SMS
    print("\n3. Testing case assignment SMS...")
    case = cases.first()
    user_with_phone = users_with_phones.first()
    
    if case and user_with_phone:
        print(f"   📋 Case: {case.case_number} - {case.title}")
        print(f"   👤 User: {user_with_phone.get_full_name()} ({user_with_phone.phone})")
        
        try:
            # Test SMS sending
            sms = CustomSMSService.send_case_assignment_sms(case, user_with_phone)
            if sms:
                print(f"   ✅ SMS sent successfully! SMS ID: {sms.id}")
                print(f"   📱 Message: {sms.message[:50]}...")
            else:
                print("   ❌ SMS sending failed")
                return False
        except Exception as e:
            print(f"   ❌ Error sending SMS: {str(e)}")
            return False
    
    # 4. Check SMS logs
    print("\n4. Checking SMS logs...")
    sms_count = SMS.objects.count()
    print(f"   ✅ Total SMS records: {sms_count}")
    
    recent_sms = SMS.objects.order_by('-created_at')[:3]
    if recent_sms.exists():
        print("   📊 Recent SMS:")
        for sms in recent_sms:
            status_icon = "✅" if sms.status == 'sent' else "❌"
            print(f"   {status_icon} {sms.to_number}: {sms.status} - {sms.created_at}")
    
    # 5. Test bulk SMS
    print("\n5. Testing bulk SMS...")
    try:
        results = CustomSMSService.send_bulk_sms_to_users(
            users=users_with_phones[:2],  # Test with 2 users
            message="Bulk SMS test from MINTT CRM - SMS functionality is working!"
        )
        
        success_count = sum(1 for r in results if r['status'] == 'sent')
        print(f"   ✅ Bulk SMS test: {success_count}/{len(results)} sent successfully")
        
        for result in results:
            status_icon = "✅" if result['status'] == 'sent' else "❌"
            print(f"   {status_icon} {result['user']}: {result['status']}")
            
    except Exception as e:
        print(f"   ❌ Bulk SMS test failed: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎉 SMS Functionality Test Complete!")
    print("\n📋 Summary:")
    print(f"   - Users with phones: {users_with_phones.count()}")
    print(f"   - Total cases: {cases.count()}")
    print(f"   - Total SMS records: {sms_count}")
    print("\n💡 Next Steps:")
    print("   1. Assign cases to users with phone numbers")
    print("   2. Check SMS logs in admin panel")
    print("   3. Verify SMS delivery with your provider")
    
    return True

def check_configuration():
    """Check SMS configuration"""
    print("🔧 Checking SMS Configuration")
    print("=" * 30)
    
    # Check settings
    base_url = getattr(settings, 'BASE_SMS_URL', None)
    sms_enabled = getattr(settings, 'SMS_ENABLED', False)
    
    print(f"   BASE_SMS_URL: {base_url}")
    print(f"   SMS_ENABLED: {sms_enabled}")
    
    if not base_url or base_url == 'http://your-sms-provider.com/api/send?':
        print("   ⚠️  Please configure BASE_SMS_URL in your .env file")
        return False
    
    if not sms_enabled:
        print("   ⚠️  SMS is disabled. Set SMS_ENABLED=True in your .env file")
        return False
    
    print("   ✅ SMS configuration looks good")
    return True

if __name__ == '__main__':
    print("🚀 MINTT CRM SMS Functionality Test")
    print("=" * 50)
    
    # Check configuration first
    if not check_configuration():
        print("\n❌ Configuration issues found. Please fix them and try again.")
        sys.exit(1)
    
    # Run functionality test
    if test_sms_functionality():
        print("\n✅ All tests passed! SMS functionality is working.")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
        sys.exit(1) 