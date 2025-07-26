from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from emails.models import Email, EmailTemplate
from contacts.models import Contact
from cases.models import Case
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up sample email data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Setting up sample email data...')

        # Get or create a test user
        user, created = User.objects.get_or_create(
            email='admin@mintcrm.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            user.set_password('admin123')
            user.save()

        # Get or create a test contact
        contact, created = Contact.objects.get_or_create(
            email='customer@example.com',
            defaults={
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+1234567890',
                'job_title': 'Manager',
                'department': 'IT',
                'is_customer': True,
            }
        )

        # Get or create a test case
        case, created = Case.objects.get_or_create(
            case_number='CASE-001',
            defaults={
                'title': 'Server connectivity issues',
                'description': 'We are experiencing intermittent server connectivity issues.',
                'category': 'Technical',
                'priority': 'High',
                'status': 'Open',
                'source': 'Email',
                'customer': contact,
                'created_by': user,
                'assigned_to': user,
            }
        )

        # Create sample email templates
        templates_data = [
            {
                'name': 'Welcome Email',
                'template_type': 'welcome',
                'subject': 'Welcome to MINT CRM',
                'html_content': '''
                <h2>Welcome to MINT CRM!</h2>
                <p>Dear {{ customer.get_full_name }},</p>
                <p>Thank you for choosing MINT CRM. We're excited to have you on board!</p>
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The MINT CRM Team</p>
                ''',
                'text_content': '''
                Welcome to MINT CRM!
                
                Dear {{ customer.get_full_name }},
                
                Thank you for choosing MINT CRM. We're excited to have you on board!
                
                If you have any questions, please don't hesitate to contact our support team.
                
                Best regards,
                The MINT CRM Team
                ''',
                'variables': {
                    'customer': 'Contact object with customer information'
                }
            },
            {
                'name': 'Case Update',
                'template_type': 'case_response',
                'subject': 'Case Update - {{ case.case_number }}',
                'html_content': '''
                <h2>Case Update</h2>
                <p>Dear {{ customer.get_full_name }},</p>
                <p>Your case has been updated:</p>
                <ul>
                    <li><strong>Case Number:</strong> {{ case.case_number }}</li>
                    <li><strong>Title:</strong> {{ case.title }}</li>
                    <li><strong>Status:</strong> {{ case.get_status_display }}</li>
                </ul>
                <p><strong>Update:</strong></p>
                <p>{{ response.content }}</p>
                <p>Best regards,<br>{{ agent.get_full_name }}</p>
                ''',
                'text_content': '''
                Case Update
                
                Dear {{ customer.get_full_name }},
                
                Your case has been updated:
                
                Case Number: {{ case.case_number }}
                Title: {{ case.title }}
                Status: {{ case.get_status_display }}
                
                Update:
                {{ response.content }}
                
                Best regards,
                {{ agent.get_full_name }}
                ''',
                'variables': {
                    'case': 'Case object',
                    'customer': 'Contact object',
                    'response': 'CaseResponse object',
                    'agent': 'User object'
                }
            }
        ]

        for template_data in templates_data:
            template, created = EmailTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults={
                    **template_data,
                    'created_by': user,
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(f'Created template: {template.name}')

        # Create sample emails
        sample_emails = [
            {
                'email_type': 'inbound',
                'status': 'delivered',
                'subject': 'Server connectivity issues',
                'from_email': 'alice@techcorp.com',
                'to_email': 'support@mintcrm.com',
                'cc_emails': '',
                'bcc_emails': '',
                'html_content': '<p>We are experiencing intermittent server connectivity issues that are affecting our daily operations.</p>',
                'text_content': 'We are experiencing intermittent server connectivity issues that are affecting our daily operations. This started yesterday around 3 PM and continues to persist. Can you please investigate and provide an update?',
                'case': case,
                'user': user,
                'message_id': 'msg_001',
                'thread_id': 'thread_001',
                'reply_to': '',
                'sent_at': timezone.now() - timedelta(hours=2),
                'delivered_at': timezone.now() - timedelta(hours=2),
                'starred': True,
                'archived': False,
                'read': False,
            },
            {
                'email_type': 'inbound',
                'status': 'delivered',
                'subject': 'Email configuration help needed',
                'from_email': 'bob@abccorp.com',
                'to_email': 'support@mintcrm.com',
                'cc_emails': '',
                'bcc_emails': '',
                'html_content': '<p>I need assistance with configuring email settings for our new domain.</p>',
                'text_content': 'I need assistance with configuring email settings for our new domain. The current setup is not working properly and emails are not being delivered.',
                'case': None,
                'user': user,
                'message_id': 'msg_002',
                'thread_id': 'thread_002',
                'reply_to': '',
                'sent_at': timezone.now() - timedelta(hours=4),
                'delivered_at': timezone.now() - timedelta(hours=4),
                'starred': False,
                'archived': False,
                'read': True,
            },
            {
                'email_type': 'outbound',
                'status': 'sent',
                'subject': 'Re: Server connectivity issues',
                'from_email': 'support@mintcrm.com',
                'to_email': 'alice@techcorp.com',
                'cc_emails': '',
                'bcc_emails': '',
                'html_content': '<p>Thank you for reporting this issue. We have assigned it to our technical team for investigation.</p>',
                'text_content': 'Thank you for reporting this issue. We have assigned it to our technical team for investigation. You can track the progress using case number CASE-001.',
                'case': case,
                'user': user,
                'message_id': 'msg_003',
                'thread_id': 'thread_001',
                'reply_to': 'msg_001',
                'sent_at': timezone.now() - timedelta(hours=1),
                'delivered_at': timezone.now() - timedelta(hours=1),
                'starred': False,
                'archived': False,
                'read': True,
            },
            {
                'email_type': 'system',
                'status': 'delivered',
                'subject': 'Daily backup report',
                'from_email': 'system@mintcrm.com',
                'to_email': 'admin@mintcrm.com',
                'cc_emails': '',
                'bcc_emails': '',
                'html_content': '<p>Daily backup completed successfully.</p>',
                'text_content': 'Daily backup completed successfully. All systems backed up at 2:00 AM. No errors reported.',
                'case': None,
                'user': user,
                'message_id': 'msg_004',
                'thread_id': 'thread_004',
                'reply_to': '',
                'sent_at': timezone.now() - timedelta(days=1),
                'delivered_at': timezone.now() - timedelta(days=1),
                'starred': False,
                'archived': False,
                'read': True,
            },
            {
                'email_type': 'outbound',
                'status': 'draft',
                'subject': 'Welcome to MINT CRM',
                'from_email': 'support@mintcrm.com',
                'to_email': 'newcustomer@example.com',
                'cc_emails': '',
                'bcc_emails': '',
                'html_content': '<p>Welcome to MINT CRM! We\'re excited to have you on board.</p>',
                'text_content': 'Welcome to MINT CRM! We\'re excited to have you on board. If you have any questions, please don\'t hesitate to contact our support team.',
                'case': None,
                'user': user,
                'message_id': '',
                'thread_id': 'thread_005',
                'reply_to': '',
                'sent_at': None,
                'delivered_at': None,
                'starred': False,
                'archived': False,
                'read': True,
            }
        ]

        for email_data in sample_emails:
            email, created = Email.objects.get_or_create(
                message_id=email_data['message_id'] if email_data['message_id'] else f'draft_{timezone.now().timestamp()}',
                defaults=email_data
            )
            if created:
                self.stdout.write(f'Created email: {email.subject}')

        self.stdout.write(
            self.style.SUCCESS('Successfully set up sample email data!')
        )
        self.stdout.write(f'Created {Email.objects.count()} emails')
        self.stdout.write(f'Created {EmailTemplate.objects.count()} templates') 