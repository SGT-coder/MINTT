from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from meetings.models import Meeting, MeetingCategory
from cases.models import Case
from contacts.models import Contact, Company

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up sample meeting data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Setting up sample meeting data...')
        
        # Get or create users
        try:
            admin_user = User.objects.get(email='admin@example.com')
        except User.DoesNotExist:
            admin_user = User.objects.create_user(
                email='admin@example.com',
                password='admin123',
                first_name='Admin',
                last_name='User',
                role='admin'
            )
        
        try:
            agent_user = User.objects.get(email='agent@example.com')
        except User.DoesNotExist:
            agent_user = User.objects.create_user(
                email='agent@example.com',
                password='agent123',
                first_name='John',
                last_name='Agent',
                role='agent'
            )
        
        try:
            manager_user = User.objects.get(email='manager@example.com')
        except User.DoesNotExist:
            manager_user = User.objects.create_user(
                email='manager@example.com',
                password='manager123',
                first_name='Sarah',
                last_name='Manager',
                role='manager'
            )
        
        # Get or create meeting categories
        categories = []
        category_data = [
            {'name': 'Team Meeting', 'color': '#3B82F6', 'description': 'Regular team meetings'},
            {'name': 'Client Meeting', 'color': '#10B981', 'description': 'Meetings with clients'},
            {'name': 'Sales Meeting', 'color': '#F59E0B', 'description': 'Sales related meetings'},
            {'name': 'Training', 'color': '#8B5CF6', 'description': 'Training sessions'},
            {'name': 'Review', 'color': '#EF4444', 'description': 'Review meetings'},
        ]
        
        for cat_data in category_data:
            category, created = MeetingCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'color': cat_data['color'],
                    'description': cat_data['description'],
                    'created_by': admin_user,
                    'is_active': True,
                }
            )
            categories.append(category)
            if created:
                self.stdout.write(f'Created category: {category.name}')
        
        # Get or create sample cases, contacts, and companies
        try:
            case = Case.objects.first()
        except Case.DoesNotExist:
            case = None
        
        try:
            contact = Contact.objects.first()
        except Contact.DoesNotExist:
            contact = None
        
        try:
            company = Company.objects.first()
        except Company.DoesNotExist:
            company = None
        
        # Create sample meetings
        now = timezone.now()
        meetings_data = [
            {
                'title': 'Weekly Team Standup',
                'description': 'Daily standup meeting to discuss progress and blockers',
                'meeting_type': 'internal',
                'status': 'scheduled',
                'priority': 'medium',
                'start_time': now + timedelta(hours=1),
                'end_time': now + timedelta(hours=1, minutes=30),
                'location': 'Conference Room A',
                'location_type': 'physical',
                'agenda': '1. Project updates\n2. Blockers discussion\n3. Next steps',
                'organizer': admin_user,
                'attendees': [agent_user, manager_user],
                'category': categories[0],
                'case': case,
                'contact': contact,
                'company': company,
            },
            {
                'title': 'Client Presentation',
                'description': 'Present quarterly results to client',
                'meeting_type': 'client',
                'status': 'confirmed',
                'priority': 'high',
                'start_time': now + timedelta(days=1, hours=10),
                'end_time': now + timedelta(days=1, hours=11, minutes=30),
                'location': 'Zoom Meeting',
                'location_type': 'virtual',
                'meeting_url': 'https://zoom.us/j/123456789',
                'agenda': '1. Q3 Results Review\n2. Q4 Planning\n3. Q&A Session',
                'organizer': manager_user,
                'attendees': [admin_user, agent_user],
                'category': categories[1],
                'case': case,
                'contact': contact,
                'company': company,
            },
            {
                'title': 'Sales Strategy Meeting',
                'description': 'Discuss new sales strategies and targets',
                'meeting_type': 'sales',
                'status': 'scheduled',
                'priority': 'high',
                'start_time': now + timedelta(days=2, hours=14),
                'end_time': now + timedelta(days=2, hours=15, minutes=30),
                'location': 'Sales Office',
                'location_type': 'physical',
                'agenda': '1. Current pipeline review\n2. New strategies\n3. Target setting',
                'organizer': manager_user,
                'attendees': [admin_user, agent_user],
                'category': categories[2],
            },
            {
                'title': 'Product Training Session',
                'description': 'Training session on new product features',
                'meeting_type': 'training',
                'status': 'scheduled',
                'priority': 'medium',
                'start_time': now + timedelta(days=3, hours=9),
                'end_time': now + timedelta(days=3, hours=11),
                'location': 'Training Room',
                'location_type': 'physical',
                'agenda': '1. New features overview\n2. Hands-on practice\n3. Q&A',
                'organizer': admin_user,
                'attendees': [agent_user, manager_user],
                'category': categories[3],
            },
            {
                'title': 'Monthly Performance Review',
                'description': 'Monthly performance review meeting',
                'meeting_type': 'review',
                'status': 'scheduled',
                'priority': 'medium',
                'start_time': now + timedelta(days=5, hours=13),
                'end_time': now + timedelta(days=5, hours=14),
                'location': 'HR Office',
                'location_type': 'physical',
                'agenda': '1. Performance metrics\n2. Goals review\n3. Feedback discussion',
                'organizer': manager_user,
                'attendees': [admin_user, agent_user],
                'category': categories[4],
            },
            {
                'title': 'Past Meeting Example',
                'description': 'This is a past meeting for testing',
                'meeting_type': 'internal',
                'status': 'completed',
                'priority': 'low',
                'start_time': now - timedelta(days=2, hours=10),
                'end_time': now - timedelta(days=2, hours=11),
                'location': 'Conference Room B',
                'location_type': 'physical',
                'agenda': 'Past meeting agenda',
                'organizer': admin_user,
                'attendees': [agent_user],
                'category': categories[0],
            },
        ]
        
        for meeting_data in meetings_data:
            attendees = meeting_data.pop('attendees')
            meeting, created = Meeting.objects.get_or_create(
                title=meeting_data['title'],
                start_time=meeting_data['start_time'],
                defaults=meeting_data
            )
            
            if created:
                meeting.attendees.set(attendees)
                self.stdout.write(f'Created meeting: {meeting.title}')
            else:
                self.stdout.write(f'Meeting already exists: {meeting.title}')
        
        self.stdout.write(
            self.style.SUCCESS('Successfully set up sample meeting data!')
        ) 