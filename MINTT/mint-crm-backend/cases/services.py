from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import Case, CaseResponse
from django.db.models import Count, Q

class CaseService:
    """Service class for case management operations"""
    
    @staticmethod
    def create_case_from_email(email_data):
        """Create a case from incoming email"""
        from contacts.models import Contact, Company
        
        # Extract email data
        sender_email = email_data.get('from')
        subject = email_data.get('subject', '')
        body = email_data.get('body', '')
        
        # Find or create contact
        contact, created = Contact.objects.get_or_create(
            email=sender_email,
            defaults={
                'name': email_data.get('from_name', 'Unknown'),
                'phone': email_data.get('phone', ''),
            }
        )
        
        # Create case
        case = Case.objects.create(
            title=subject or 'Email Support Request',
            description=body,
            customer=contact,
            source='email',
            email_thread_id=email_data.get('thread_id', ''),
            priority='medium',  # Default priority
            category='general'
        )
        
        # Create initial response
        CaseResponse.objects.create(
            case=case,
            author=contact.user if contact.user else None,
            response_type='customer',
            content=body,
            is_internal=False,
            email_message_id=email_data.get('message_id', ''),
            email_from=sender_email,
            email_subject=subject
        )
        
        return case
    
    @staticmethod
    def calculate_sla_metrics(case):
        """Calculate SLA metrics for a case"""
        if not case.responses.exists():
            return
        
        # Calculate first response time
        first_response = case.responses.filter(
            response_type__in=['internal', 'email']
        ).exclude(author=case.customer.user).first()
        
        if first_response:
            case.first_response_time = first_response.created_at - case.created_at
            case.save(update_fields=['first_response_time'])
        
        # Calculate resolution time if resolved
        if case.status == 'resolved' and case.resolved_at:
            case.resolution_time = case.resolved_at - case.created_at
            case.save(update_fields=['resolution_time'])
    
    @staticmethod
    def auto_assign_case(case):
        """Automatically assign case to available agent"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Find available agents (not assigned to too many cases)
        agents = User.objects.filter(
            role__in=['agent', 'manager'],
            is_active=True
        ).annotate(
            case_count=Count('assigned_cases', filter=Q(assigned_cases__status__in=['new', 'assigned', 'in_progress']))
        ).order_by('case_count')
        
        if agents.exists():
            case.assigned_to = agents.first()
            case.status = 'assigned'
            case.save()
            return case.assigned_to
        
        return None
    
    @staticmethod
    def escalate_overdue_cases():
        """Escalate cases that are overdue"""
        overdue_cases = Case.objects.filter(
            due_date__lt=timezone.now(),
            status__in=['new', 'assigned', 'in_progress'],
            priority__in=['medium', 'high']
        )
        
        for case in overdue_cases:
            case.priority = 'high' if case.priority == 'medium' else 'urgent'
            case.status = 'escalated'
            case.save()
            
            # Create escalation note
            CaseResponse.objects.create(
                case=case,
                author=None,  # System
                response_type='system',
                content='Case automatically escalated due to overdue status',
                is_internal=True
            )

class EmailService:
    """Service class for email operations"""
    
    @staticmethod
    def send_case_assignment_email(case, assigned_user):
        """Send email notification for case assignment"""
        subject = f"Case {case.case_number} assigned to you"
        
        context = {
            'case': case,
            'assigned_user': assigned_user,
            'customer': case.customer,
        }
        
        html_message = render_to_string('emails/case_assignment.html', context)
        text_message = render_to_string('emails/case_assignment.txt', context)
        
        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[assigned_user.email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            # Log email sending error
            print(f"Failed to send assignment email: {e}")
    
    @staticmethod
    def send_case_response_email(response):
        """Send email response to customer"""
        case = response.case
        
        subject = f"Re: {case.title} - {case.case_number}"
        
        context = {
            'case': case,
            'response': response,
            'agent': response.author,
        }
        
        html_message = render_to_string('emails/case_response.html', context)
        text_message = render_to_string('emails/case_response.txt', context)
        
        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[case.customer.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            # Update case email tracking
            case.last_email_sent = timezone.now()
            case.save(update_fields=['last_email_sent'])
            
        except Exception as e:
            # Log email sending error
            print(f"Failed to send response email: {e}")
    
    @staticmethod
    def send_case_escalation_email(case, manager):
        """Send escalation notification email"""
        subject = f"Case {case.case_number} escalated - {case.title}"
        
        context = {
            'case': case,
            'manager': manager,
            'customer': case.customer,
        }
        
        html_message = render_to_string('emails/case_escalation.html', context)
        text_message = render_to_string('emails/case_escalation.txt', context)
        
        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[manager.email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            # Log email sending error
            print(f"Failed to send escalation email: {e}")
    
    @staticmethod
    def send_case_resolution_email(case):
        """Send case resolution notification to customer"""
        subject = f"Case {case.case_number} resolved - {case.title}"
        
        context = {
            'case': case,
            'customer': case.customer,
        }
        
        html_message = render_to_string('emails/case_resolution.html', context)
        text_message = render_to_string('emails/case_resolution.txt', context)
        
        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[case.customer.email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            # Log email sending error
            print(f"Failed to send resolution email: {e}") 