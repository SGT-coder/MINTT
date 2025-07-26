from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from emails.custom_sms_service import CustomSMSService
from cases.models import Case
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Test SMS integration with the custom SMS service'

    def add_arguments(self, parser):
        parser.add_argument(
            '--phone',
            type=str,
            help='Phone number to test SMS sending',
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to test SMS sending to',
        )
        parser.add_argument(
            '--case-id',
            type=int,
            help='Case ID to test case assignment SMS',
        )
        parser.add_argument(
            '--message',
            type=str,
            default='Test SMS from MINTT CRM',
            help='Custom message to send',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting SMS integration test...')
        )

        # Test 1: Basic SMS sending
        if options['phone']:
            self.test_basic_sms(options['phone'], options['message'])
        
        # Test 2: SMS to user
        if options['user_id']:
            self.test_user_sms(options['user_id'], options['message'])
        
        # Test 3: Case assignment SMS
        if options['case_id']:
            self.test_case_assignment_sms(options['case_id'])
        
        # Test 4: Bulk SMS
        self.test_bulk_sms()

    def test_basic_sms(self, phone_number, message):
        """Test basic SMS sending"""
        self.stdout.write(f'Testing basic SMS to {phone_number}...')
        
        try:
            result = CustomSMSService.send_sms(
                phone_number=phone_number,
                message=message
            )
            self.stdout.write(
                self.style.SUCCESS(f'✅ Basic SMS test passed: {result}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Basic SMS test failed: {str(e)}')
            )

    def test_user_sms(self, user_id, message):
        """Test SMS sending to a specific user"""
        self.stdout.write(f'Testing SMS to user {user_id}...')
        
        try:
            user = User.objects.get(id=user_id)
            if not user.phone:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ User {user.email} has no phone number')
                )
                return
            
            sms = CustomSMSService.send_sms_to_user(
                user=user,
                message=message
            )
            
            if sms:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ User SMS test passed: SMS ID {sms.id}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('❌ User SMS test failed: No SMS created')
                )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'❌ User with ID {user_id} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ User SMS test failed: {str(e)}')
            )

    def test_case_assignment_sms(self, case_id):
        """Test case assignment SMS"""
        self.stdout.write(f'Testing case assignment SMS for case {case_id}...')
        
        try:
            case = Case.objects.get(id=case_id)
            
            if not case.assigned_to:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ Case {case.case_number} has no assigned user')
                )
                return
            
            if not case.assigned_to.phone:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ Assigned user {case.assigned_to.email} has no phone number')
                )
                return
            
            sms = CustomSMSService.send_case_assignment_sms(case, case.assigned_to)
            
            if sms:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Case assignment SMS test passed: SMS ID {sms.id}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('❌ Case assignment SMS test failed: No SMS created')
                )
        except Case.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'❌ Case with ID {case_id} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Case assignment SMS test failed: {str(e)}')
            )

    def test_bulk_sms(self):
        """Test bulk SMS sending"""
        self.stdout.write('Testing bulk SMS...')
        
        try:
            # Get users with phone numbers
            users_with_phones = User.objects.filter(
                phone__isnull=False
            ).exclude(phone='')[:3]  # Limit to 3 users for testing
            
            if not users_with_phones.exists():
                self.stdout.write(
                    self.style.WARNING('⚠️ No users with phone numbers found')
                )
                return
            
            message = "Bulk SMS test from MINTT CRM"
            results = CustomSMSService.send_bulk_sms_to_users(
                users=users_with_phones,
                message=message
            )
            
            success_count = sum(1 for r in results if r['status'] == 'sent')
            total_count = len(results)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Bulk SMS test completed: {success_count}/{total_count} sent successfully'
                )
            )
            
            for result in results:
                status_icon = '✅' if result['status'] == 'sent' else '❌'
                self.stdout.write(f'  {status_icon} {result["user"]}: {result["status"]}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Bulk SMS test failed: {str(e)}')
            )

    def print_configuration_info(self):
        """Print current SMS configuration"""
        self.stdout.write('\n📋 SMS Configuration:')
        self.stdout.write(f'  BASE_SMS_URL: {getattr(settings, "BASE_SMS_URL", "Not set")}')
        self.stdout.write(f'  DEFAULT_SMS_FROM_NUMBER: {getattr(settings, "DEFAULT_SMS_FROM_NUMBER", "Not set")}')
        self.stdout.write(f'  SMS_ENABLED: {getattr(settings, "SMS_ENABLED", "Not set")}')
        
        # Count users with phone numbers
        users_with_phones = User.objects.filter(
            phone__isnull=False
        ).exclude(phone='').count()
        
        self.stdout.write(f'  Users with phone numbers: {users_with_phones}')
        self.stdout.write('') 