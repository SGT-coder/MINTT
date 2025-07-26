from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from cases.models import Case
from contacts.models import Contact, Company
from emails.models import EmailTemplate
from emails.services import EmailService

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up initial CRM data and configurations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-admin',
            action='store_true',
            help='Create admin user',
        )
        parser.add_argument(
            '--create-sample-data',
            action='store_true',
            help='Create sample data for testing',
        )

    def handle(self, *args, **options):
        self.stdout.write('Setting up MInT CRM system...')
        
        if options['create_admin']:
            self.create_admin_user()
        
        if options['create_sample_data']:
            self.create_sample_data()
        
        # Always create default email templates
        self.create_default_templates()
        
        self.stdout.write(
            self.style.SUCCESS('CRM setup completed successfully!')
        )

    def create_admin_user(self):
        """Create admin user if it doesn't exist"""
        if not User.objects.filter(role='admin').exists():
            admin_user = User.objects.create_user(
                email='admin@mintcrm.com',
                password='admin123',
                first_name='Admin',
                last_name='User',
                role='admin',
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(
                self.style.SUCCESS(f'Created admin user: {admin_user.email}')
            )
        else:
            self.stdout.write('Admin user already exists')

    def create_sample_data(self):
        """Create sample data for testing"""
        with transaction.atomic():
            # Create sample company
            company, created = Company.objects.get_or_create(
                name='Sample Company Inc.',
                defaults={
                    'industry': 'technology',
                    'website': 'https://samplecompany.com',
                    'phone': '+1234567890',
                    'address': '123 Main St',
                    'city': 'New York',
                    'state': 'NY',
                    'country': 'USA',
                    'postal_code': '10001',
                    'is_customer': True,
                    'is_prospect': False,
                }
            )
            
            if created:
                self.stdout.write(f'Created sample company: {company.name}')
            
            # Create sample contact
            contact, created = Contact.objects.get_or_create(
                email='john.doe@samplecompany.com',
                defaults={
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'title': 'mr',
                    'phone': '+1234567891',
                    'company': company,
                    'job_title': 'CTO',
                    'department': 'Technology',
                    'is_customer': True,
                    'is_prospect': False,
                }
            )
            
            if created:
                self.stdout.write(f'Created sample contact: {contact.get_full_name()}')
            
            # Create sample manager
            manager, created = User.objects.get_or_create(
                email='manager@mintcrm.com',
                defaults={
                    'first_name': 'Sarah',
                    'last_name': 'Manager',
                    'role': 'manager',
                    'department': 'Support',
                }
            )
            
            if created:
                manager.set_password('manager123')
                manager.save()
                self.stdout.write(f'Created sample manager: {manager.get_full_name()}')
            
            # Create sample agent
            agent, created = User.objects.get_or_create(
                email='agent@mintcrm.com',
                defaults={
                    'first_name': 'Mike',
                    'last_name': 'Agent',
                    'role': 'agent',
                    'department': 'Support',
                }
            )
            
            if created:
                agent.set_password('agent123')
                agent.save()
                self.stdout.write(f'Created sample agent: {agent.get_full_name()}')
            
            # Create sample case
            case, created = Case.objects.get_or_create(
                case_number='CASE-000001',
                defaults={
                    'title': 'Sample Support Request',
                    'description': 'This is a sample support request for testing purposes.',
                    'category': 'technical',
                    'priority': 'medium',
                    'status': 'assigned',
                    'source': 'web_form',
                    'customer': contact,
                    'company': company,
                    'assigned_to': agent,
                    'created_by': manager,
                    'sla_hours': 24,
                }
            )
            
            if created:
                self.stdout.write(f'Created sample case: {case.case_number}')

    def create_default_templates(self):
        """Create default email templates"""
        EmailService.create_default_templates()
        self.stdout.write('Created default email templates') 