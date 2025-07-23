from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import Email, EmailTemplate, EmailLog, UserEmailConfig, SMS, SMSTemplate, SMSLog, UserSMSConfig
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import requests
import json
import imaplib
import email as pyemail
from email.header import decode_header
import base64
import logging

class EmailService:
    """Service class for email operations"""
    
    @staticmethod
    def send_email(email, user_config=None):
        """Send an email and update its status"""
        try:
            # Use user-specific config if provided, otherwise fall back to default
            if user_config and user_config.is_verified:
                EmailService._send_with_user_config(email, user_config)
            else:
                EmailService._send_with_default_config(email)
            
            # Update email status
            email.mark_as_sent()
            
            # Log the event
            EmailLog.objects.create(
                email=email,
                event='sent',
                data={'method': 'user_config' if user_config else 'default_config'}
            )
            
            return True
            
        except Exception as e:
            # Mark email as failed
            email.mark_as_failed(str(e))
            
            # Log the error
            EmailLog.objects.create(
                email=email,
                event='failed',
                data={'error': str(e), 'method': 'user_config' if user_config else 'default_config'}
            )
            
            raise e
    
    @staticmethod
    def _send_with_user_config(email, user_config):
        """Send email using user-specific configuration"""
        smtp_config = user_config.get_smtp_config()
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = user_config.email_address
        msg['To'] = email.to_email
        msg['Subject'] = email.subject
        
        if email.cc_emails:
            msg['Cc'] = email.cc_emails
        
        # Add body
        if email.html_content:
            msg.attach(MIMEText(email.html_content, 'html'))
        else:
            msg.attach(MIMEText(email.text_content, 'plain'))
        
        # Add attachments
        for attachment in email.attachments.all():
            with open(attachment.file.path, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {attachment.filename}'
                )
                msg.attach(part)
        
        # Connect to SMTP server
        if smtp_config['use_ssl']:
            server = smtplib.SMTP_SSL(smtp_config['host'], smtp_config['port'])
        else:
            server = smtplib.SMTP(smtp_config['host'], smtp_config['port'])
        
        if smtp_config['use_tls']:
            server.starttls()
        
        # Login
        server.login(smtp_config['username'], smtp_config['password'])
        
        # Prepare recipients
        recipients = [email.to_email]
        if email.cc_emails:
            recipients.extend([e.strip() for e in email.cc_emails.split(',')])
        
        # Send email
        server.sendmail(user_config.email_address, recipients, msg.as_string())
        server.quit()
    
    @staticmethod
    def _send_with_default_config(email):
        """Send email using default Django configuration"""
        # Prepare recipient lists
        recipient_list = [email.to_email]
        if email.cc_emails:
            recipient_list.extend([e.strip() for e in email.cc_emails.split(',')])
        
        # Send email using Django's default mail backend
        send_mail(
            subject=email.subject,
            message=email.text_content,
            from_email=email.from_email,
            recipient_list=recipient_list,
            html_message=email.html_content,
            fail_silently=False,
        )
    
    @staticmethod
    def get_user_email_config(user):
        """Get user's email configuration if available"""
        try:
            return UserEmailConfig.objects.get(user=user, is_active=True, is_verified=True)
        except UserEmailConfig.DoesNotExist:
            return None
    
    @staticmethod
    def send_template_email(template_name, context, to_email, **kwargs):
        """Send email using a template"""
        try:
            template = EmailTemplate.objects.get(name=template_name, is_active=True)
            rendered = template.render_template(context)
            
            # Create email record
            email = Email.objects.create(
                email_type=kwargs.get('email_type', 'outbound'),
                subject=rendered['subject'],
                from_email=kwargs.get('from_email', settings.DEFAULT_FROM_EMAIL),
                to_email=to_email,
                html_content=rendered['html_content'],
                text_content=rendered['text_content'],
                template=template,
                **kwargs
            )
            
            # Send email
            EmailService.send_email(email)
            
            return email
            
        except EmailTemplate.DoesNotExist:
            raise ValueError(f"Email template '{template_name}' not found")
    
    @staticmethod
    def send_case_assignment_email(case, assigned_user):
        """Send case assignment notification email"""
        context = {
            'case': case,
            'assigned_user': assigned_user,
            'customer': case.customer,
        }
        
        return EmailService.send_template_email(
            'case_assignment',
            context,
            assigned_user.email,
            case=case,
            user=assigned_user
        )
    
    @staticmethod
    def send_case_response_email(response):
        """Send case response email to customer"""
        case = response.case
        
        context = {
            'case': case,
            'response': response,
            'agent': response.author,
        }
        
        email = EmailService.send_template_email(
            'case_response',
            context,
            case.customer.email,
            case=case,
            user=response.author
        )
        
        # Update case email tracking
        case.last_email_sent = timezone.now()
        case.save(update_fields=['last_email_sent'])
        
        return email
    
    @staticmethod
    def send_case_escalation_email(case, manager):
        """Send escalation notification email"""
        context = {
            'case': case,
            'manager': manager,
            'customer': case.customer,
        }
        
        return EmailService.send_template_email(
            'case_escalation',
            context,
            manager.email,
            case=case,
            user=manager
        )
    
    @staticmethod
    def send_case_resolution_email(case):
        """Send case resolution notification to customer"""
        context = {
            'case': case,
            'customer': case.customer,
        }
        
        return EmailService.send_template_email(
            'case_resolution',
            context,
            case.customer.email,
            case=case
        )
    
    @staticmethod
    def create_default_templates():
        """Create default email templates"""
        templates_data = [
            {
                'name': 'Case Assignment',
                'template_type': 'case_assignment',
                'subject': 'Case {{ case.case_number }} assigned to you',
                'html_content': '''
                <h2>Case Assignment</h2>
                <p>Hello {{ assigned_user.first_name }},</p>
                <p>A new case has been assigned to you:</p>
                <ul>
                    <li><strong>Case Number:</strong> {{ case.case_number }}</li>
                    <li><strong>Title:</strong> {{ case.title }}</li>
                    <li><strong>Priority:</strong> {{ case.get_priority_display }}</li>
                    <li><strong>Customer:</strong> {{ customer.get_full_name }}</li>
                </ul>
                <p><strong>Description:</strong></p>
                <p>{{ case.description }}</p>
                <p>Please review and take appropriate action.</p>
                ''',
                'text_content': '''
                Case Assignment
                
                Hello {{ assigned_user.first_name }},
                
                A new case has been assigned to you:
                
                Case Number: {{ case.case_number }}
                Title: {{ case.title }}
                Priority: {{ case.get_priority_display }}
                Customer: {{ customer.get_full_name }}
                
                Description:
                {{ case.description }}
                
                Please review and take appropriate action.
                ''',
                'variables': {
                    'case': 'Case object with all fields',
                    'assigned_user': 'User object assigned to the case',
                    'customer': 'Contact object representing the customer'
                }
            },
            {
                'name': 'Case Response',
                'template_type': 'case_response',
                'subject': 'Re: {{ case.title }} - {{ case.case_number }}',
                'html_content': '''
                <h2>Case Update</h2>
                <p>Dear {{ customer.get_full_name }},</p>
                <p>Your case has been updated:</p>
                <ul>
                    <li><strong>Case Number:</strong> {{ case.case_number }}</li>
                    <li><strong>Title:</strong> {{ case.title }}</li>
                    <li><strong>Status:</strong> {{ case.get_status_display }}</li>
                </ul>
                <p><strong>Response:</strong></p>
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
                
                Response:
                {{ response.content }}
                
                Best regards,
                {{ agent.get_full_name }}
                ''',
                'variables': {
                    'case': 'Case object',
                    'customer': 'Contact object',
                    'response': 'CaseResponse object',
                    'agent': 'User object (response author)'
                }
            },
            {
                'name': 'Case Escalation',
                'template_type': 'case_escalation',
                'subject': 'Case {{ case.case_number }} escalated - {{ case.title }}',
                'html_content': '''
                <h2>Case Escalation</h2>
                <p>Hello {{ manager.first_name }},</p>
                <p>A case has been escalated to you:</p>
                <ul>
                    <li><strong>Case Number:</strong> {{ case.case_number }}</li>
                    <li><strong>Title:</strong> {{ case.title }}</li>
                    <li><strong>Priority:</strong> {{ case.get_priority_display }}</li>
                    <li><strong>Customer:</strong> {{ customer.get_full_name }}</li>
                </ul>
                <p><strong>Description:</strong></p>
                <p>{{ case.description }}</p>
                <p>Please review and take appropriate action.</p>
                ''',
                'text_content': '''
                Case Escalation
                
                Hello {{ manager.first_name }},
                
                A case has been escalated to you:
                
                Case Number: {{ case.case_number }}
                Title: {{ case.title }}
                Priority: {{ case.get_priority_display }}
                Customer: {{ customer.get_full_name }}
                
                Description:
                {{ case.description }}
                
                Please review and take appropriate action.
                ''',
                'variables': {
                    'case': 'Case object',
                    'manager': 'User object (manager)',
                    'customer': 'Contact object'
                }
            },
            {
                'name': 'Case Resolution',
                'template_type': 'case_resolution',
                'subject': 'Case {{ case.case_number }} resolved - {{ case.title }}',
                'html_content': '''
                <h2>Case Resolved</h2>
                <p>Dear {{ customer.get_full_name }},</p>
                <p>Your case has been resolved:</p>
                <ul>
                    <li><strong>Case Number:</strong> {{ case.case_number }}</li>
                    <li><strong>Title:</strong> {{ case.title }}</li>
                    <li><strong>Resolution Date:</strong> {{ case.resolved_at|date:"F j, Y" }}</li>
                </ul>
                <p>Thank you for your patience. If you have any further questions, please don't hesitate to contact us.</p>
                ''',
                'text_content': '''
                Case Resolved
                
                Dear {{ customer.get_full_name }},
                
                Your case has been resolved:
                
                Case Number: {{ case.case_number }}
                Title: {{ case.title }}
                Resolution Date: {{ case.resolved_at|date:"F j, Y" }}
                
                Thank you for your patience. If you have any further questions, please don't hesitate to contact us.
                ''',
                'variables': {
                    'case': 'Case object',
                    'customer': 'Contact object'
                }
            }
        ]
        
        for template_data in templates_data:
            EmailTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults=template_data
            ) 

    @staticmethod
    def sync_imap_emails(user):
        """Sync emails from user's IMAP (Gmail) account into the Email model."""
        config = EmailService.get_user_email_config(user)
        if not config or not config.imap_host or not config.imap_username:
            raise Exception("No IMAP config found for user.")
        try:
            if config.oauth_access_token:
                # Gmail XOAUTH2
                imap = imaplib.IMAP4_SSL(config.imap_host, config.imap_port)
                auth_string = f'user={config.imap_username}\1auth=Bearer {config.oauth_access_token}\1\1'
                imap.authenticate('XOAUTH2', lambda x: auth_string.encode())
            else:
                imap = imaplib.IMAP4_SSL(config.imap_host, config.imap_port)
                imap.login(config.imap_username, config.imap_password)
            imap.select('INBOX')
            status, messages = imap.search(None, 'ALL')
            if status != 'OK':
                raise Exception('Failed to search mailbox')
            for num in messages[0].split():
                status, msg_data = imap.fetch(num, '(RFC822)')
                if status != 'OK':
                    continue
                msg = pyemail.message_from_bytes(msg_data[0][1])
                subject, encoding = decode_header(msg.get('Subject', ''))[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding or 'utf-8', errors='ignore')
                from_email = msg.get('From', '')
                to_email = msg.get('To', '')
                date = msg.get('Date', '')
                message_id = msg.get('Message-ID', '')
                # Check if already exists
                if Email.objects.filter(message_id=message_id).exists():
                    continue
                # Get body
                text_content = ''
                html_content = ''
                if msg.is_multipart():
                    for part in msg.walk():
                        ctype = part.get_content_type()
                        cdispo = str(part.get('Content-Disposition'))
                        if ctype == 'text/plain' and 'attachment' not in cdispo:
                            text_content += part.get_payload(decode=True).decode(errors='ignore')
                        elif ctype == 'text/html' and 'attachment' not in cdispo:
                            html_content += part.get_payload(decode=True).decode(errors='ignore')
                else:
                    ctype = msg.get_content_type()
                    if ctype == 'text/plain':
                        text_content = msg.get_payload(decode=True).decode(errors='ignore')
                    elif ctype == 'text/html':
                        html_content = msg.get_payload(decode=True).decode(errors='ignore')
                # Save email
                Email.objects.create(
                    email_type='inbound',
                    status='delivered',
                    subject=subject,
                    from_email=from_email,
                    to_email=to_email,
                    text_content=text_content,
                    html_content=html_content,
                    message_id=message_id,
                    user=user
                )
            imap.logout()
        except Exception as e:
            logging.exception(f"IMAP sync failed for user {user.email}: {e}")
            raise Exception(f"IMAP sync failed: {e}")

class SMSService:
    """Service class for SMS operations"""
    
    @staticmethod
    def send_sms(sms, user_config=None):
        """Send an SMS and update its status"""
        try:
            # Use user-specific config if provided, otherwise fall back to default
            if user_config and user_config.is_verified:
                SMSService._send_with_user_config(sms, user_config)
            else:
                SMSService._send_with_default_config(sms)
            
            # Update SMS status
            sms.mark_as_sent()
            
            # Log the event
            SMSLog.objects.create(
                sms=sms,
                event='sent',
                data={'method': 'user_config' if user_config else 'default_config'}
            )
            
            return True
            
        except Exception as e:
            # Mark SMS as failed
            sms.mark_as_failed(str(e))
            
            # Log the error
            SMSLog.objects.create(
                sms=sms,
                event='failed',
                data={'error': str(e), 'method': 'user_config' if user_config else 'default_config'}
            )
            
            raise e
    
    @staticmethod
    def _send_with_user_config(sms, user_config):
        """Send SMS using user-specific configuration"""
        config = user_config.get_provider_config()
        
        if config['provider'] == 'twilio':
            SMSService._send_with_twilio(sms, config)
        elif config['provider'] == 'aws_sns':
            SMSService._send_with_aws_sns(sms, config)
        elif config['provider'] == 'nexmo':
            SMSService._send_with_nexmo(sms, config)
        else:
            raise ValueError(f"Unsupported SMS provider: {config['provider']}")
    
    @staticmethod
    def _send_with_twilio(sms, config):
        """Send SMS using Twilio"""
        try:
            from twilio.rest import Client
            
            client = Client(config['account_sid'], config['auth_token'])
            message = client.messages.create(
                body=sms.message,
                from_=config['from_number'],
                to=sms.to_number
            )
            
            # Update SMS with Twilio message ID
            sms.message_id = message.sid
            sms.save(update_fields=['message_id'])
            
        except ImportError:
            raise ImportError("Twilio library not installed. Run: pip install twilio")
    
    @staticmethod
    def _send_with_aws_sns(sms, config):
        """Send SMS using AWS SNS"""
        try:
            import boto3
            
            sns = boto3.client(
                'sns',
                aws_access_key_id=config['api_key'],
                aws_secret_access_key=config['api_secret'],
                region_name='us-east-1'  # Default region
            )
            
            response = sns.publish(
                PhoneNumber=sms.to_number,
                Message=sms.message,
                MessageAttributes={
                    'AWS.SNS.SMS.SMSType': {
                        'DataType': 'String',
                        'StringValue': 'Transactional'
                    }
                }
            )
            
            # Update SMS with AWS message ID
            sms.message_id = response['MessageId']
            sms.save(update_fields=['message_id'])
            
        except ImportError:
            raise ImportError("Boto3 library not installed. Run: pip install boto3")
    
    @staticmethod
    def _send_with_nexmo(sms, config):
        """Send SMS using Nexmo/Vonage"""
        url = "https://rest.nexmo.com/sms/json"
        data = {
            'api_key': config['api_key'],
            'api_secret': config['api_secret'],
            'to': sms.to_number,
            'from': config['from_number'],
            'text': sms.message
        }
        
        response = requests.post(url, data=data)
        result = response.json()
        
        if result['messages'][0]['status'] == '0':
            # Update SMS with Nexmo message ID
            sms.message_id = result['messages'][0]['message-id']
            sms.save(update_fields=['message_id'])
        else:
            raise Exception(f"Nexmo error: {result['messages'][0]['error-text']}")
    
    @staticmethod
    def _send_with_default_config(sms):
        """Send SMS using default configuration (placeholder for demo)"""
        # This would typically use a default SMS provider
        # For demo purposes, we'll just mark it as sent
        print(f"DEMO: SMS would be sent to {sms.to_number}: {sms.message}")
    
    @staticmethod
    def get_user_sms_config(user):
        """Get user's SMS configuration if available"""
        try:
            return UserSMSConfig.objects.get(user=user, is_active=True, is_verified=True)
        except UserSMSConfig.DoesNotExist:
            return None
    
    @staticmethod
    def send_template_sms(template_name, context, to_number, **kwargs):
        """Send SMS using a template"""
        try:
            template = SMSTemplate.objects.get(name=template_name, is_active=True)
            rendered = template.render_template(context)
            
            # Create SMS record
            sms = SMS.objects.create(
                sms_type=kwargs.get('sms_type', 'outbound'),
                message=rendered['message'],
                from_number=kwargs.get('from_number', ''),
                to_number=to_number,
                template=template,
                **kwargs
            )
            
            # Send SMS
            SMSService.send_sms(sms)
            
            return sms
            
        except SMSTemplate.DoesNotExist:
            raise ValueError(f"SMS template '{template_name}' not found")
    
    @staticmethod
    def send_case_assignment_sms(case, assigned_user):
        """Send case assignment notification SMS"""
        if not assigned_user.phone:
            return None
        
        context = {
            'case': case,
            'assigned_user': assigned_user,
            'customer': case.customer,
        }
        
        return SMSService.send_template_sms(
            'case_assignment',
            context,
            assigned_user.phone,
            case=case,
            user=assigned_user
        )
    
    @staticmethod
    def send_case_response_sms(response):
        """Send case response SMS to customer"""
        if not response.case.customer.phone:
            return None
        
        context = {
            'case': response.case,
            'response': response,
            'customer': response.case.customer,
        }
        
        return SMSService.send_template_sms(
            'case_response',
            context,
            response.case.customer.phone,
            case=response.case,
            contact=response.case.customer
        )
    
    @staticmethod
    def send_case_escalation_sms(case, manager):
        """Send case escalation notification SMS"""
        if not manager.phone:
            return None
        
        context = {
            'case': case,
            'manager': manager,
            'customer': case.customer,
        }
        
        return SMSService.send_template_sms(
            'case_escalation',
            context,
            manager.phone,
            case=case,
            user=manager
        )
    
    @staticmethod
    def send_case_resolution_sms(case):
        """Send case resolution notification SMS"""
        if not case.customer.phone:
            return None
        
        context = {
            'case': case,
            'customer': case.customer,
        }
        
        return SMSService.send_template_sms(
            'case_resolution',
            context,
            case.customer.phone,
            case=case,
            contact=case.customer
        )
    
    @staticmethod
    def create_default_sms_templates():
        """Create default SMS templates"""
        templates_data = [
            {
                'name': 'case_assignment',
                'template_type': 'case_assignment',
                'message': 'Hi {{ assigned_user.first_name }}, you have been assigned case #{{ case.case_number }}. Please review and respond promptly.',
            },
            {
                'name': 'case_response',
                'template_type': 'case_response',
                'message': 'Hi {{ customer.first_name }}, we have responded to your case #{{ case.case_number }}. Check your email for details.',
            },
            {
                'name': 'case_escalation',
                'template_type': 'case_escalation',
                'message': 'Hi {{ manager.first_name }}, case #{{ case.case_number }} has been escalated and requires your attention.',
            },
            {
                'name': 'case_resolution',
                'template_type': 'case_resolution',
                'message': 'Hi {{ customer.first_name }}, your case #{{ case.case_number }} has been resolved. Thank you for your patience.',
            },
        ]
        
        for template_data in templates_data:
            SMSTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults={
                    'template_type': template_data['template_type'],
                    'message': template_data['message'],
                    'variables': {},
                    'is_active': True,
                }
            ) 