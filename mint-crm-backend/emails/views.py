from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import Email, EmailTemplate, EmailAttachment, EmailLog, UserEmailConfig, SMS, SMSTemplate, SMSLog, UserSMSConfig
from .serializers import (
    EmailSerializer, EmailCreateSerializer, EmailTemplateSerializer,
    EmailTemplateCreateSerializer, EmailSendSerializer, EmailRetrySerializer,
    EmailTemplateRenderSerializer, UserEmailConfigSerializer, 
    UserEmailConfigCreateSerializer, UserEmailConfigTestSerializer,
    SMSSerializer, SMSCreateSerializer, SMSSendSerializer, SMSRetrySerializer,
    SMSTemplateSerializer, SMSTemplateCreateSerializer, SMSTemplateRenderSerializer,
    SMSLogSerializer, UserSMSConfigSerializer, UserSMSConfigCreateSerializer, UserSMSConfigTestSerializer,
    EmailAttachmentSerializer
)
from .services import EmailService, SMSService
from django.db.models import Count
import smtplib
import imaplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import serializers

class EmailViewSet(viewsets.ModelViewSet):
    """ViewSet for Email model"""
    queryset = Email.objects.select_related('template', 'case', 'user')
    serializer_class = EmailSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['email_type', 'status', 'template', 'case', 'user']
    search_fields = ['subject', 'to_email', 'from_email']
    ordering_fields = ['created_at', 'sent_at', 'subject']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EmailCreateSerializer
        return EmailSerializer
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry sending a failed email"""
        email = self.get_object()
        
        if not email.can_retry:
            return Response(
                {'error': 'Email cannot be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            EmailService.send_email(email)
            return Response({'message': 'Email sent successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def send_email(self, request):
        """Send a new email"""
        serializer = EmailSendSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                email_data = serializer.validated_data
                
                # Get user's email configuration
                user_config = EmailService.get_user_email_config(request.user)
                
                # Create email record
                email = Email.objects.create(
                    email_type='outbound',
                    status='draft',
                    subject=email_data['subject'],
                    from_email=user_config.email_address if user_config else settings.DEFAULT_FROM_EMAIL,
                    to_email=email_data['to_email'],
                    cc_emails=email_data.get('cc_emails', ''),
                    bcc_emails=email_data.get('bcc_emails', ''),
                    html_content=email_data.get('html_content', ''),
                    text_content=email_data.get('text_content', ''),
                    template=email_data.get('template_id'),
                    case=email_data.get('case_id'),
                    user=request.user
                )
                
                # Send email using user's configuration
                EmailService.send_email(email, user_config)
                
                return Response({
                    'message': 'Email sent successfully',
                    'email': EmailSerializer(email).data
                })
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to send email: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get email statistics"""
        queryset = self.get_queryset()
        
        # Filter by date range if provided
        days = request.query_params.get('days', 30)
        start_date = timezone.now() - timezone.timedelta(days=int(days))
        queryset = queryset.filter(created_at__gte=start_date)
        
        stats = {
            'total_emails': queryset.count(),
            'sent_emails': queryset.filter(status='sent').count(),
            'delivered_emails': queryset.filter(status='delivered').count(),
            'failed_emails': queryset.filter(status='failed').count(),
            'bounced_emails': queryset.filter(status='bounced').count(),
            'by_type': queryset.values('email_type').annotate(count=Count('id')),
            'by_status': queryset.values('status').annotate(count=Count('id')),
        }
        
        return Response(stats)

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """Reply to an email"""
        email = self.get_object()
        serializer = EmailSendSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                email_data = serializer.validated_data
                
                # Create reply email
                reply_email = Email.objects.create(
                    email_type='outbound',
                    status='draft',
                    subject=email_data['subject'],
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to_email=email.from_email,  # Reply to original sender
                    cc_emails=email_data.get('cc_emails', ''),
                    bcc_emails=email_data.get('bcc_emails', ''),
                    html_content=email_data.get('html_content', ''),
                    text_content=email_data.get('text_content', ''),
                    template=email_data.get('template_id'),
                    case=email.case,
                    user=request.user,
                    thread_id=email.thread_id or email.message_id,
                    reply_to=email.message_id
                )
                
                # Send reply email
                EmailService.send_email(reply_email)
                
                return Response({
                    'message': 'Reply sent successfully',
                    'email': EmailSerializer(reply_email).data
                })
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to send reply: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        """Forward an email"""
        email = self.get_object()
        to_email = request.data.get('to_email')
        subject = request.data.get('subject', f'Fwd: {email.subject}')
        message = request.data.get('message', '')
        
        if not to_email:
            return Response(
                {'error': 'Recipient email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create forward email
            forward_email = Email.objects.create(
                email_type='outbound',
                status='draft',
                subject=subject,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to_email=to_email,
                cc_emails=request.data.get('cc_emails', ''),
                bcc_emails=request.data.get('bcc_emails', ''),
                html_content=f"""
                <p>{message}</p>
                <hr>
                <p><strong>Forwarded message:</strong></p>
                <p><strong>From:</strong> {email.from_email}</p>
                <p><strong>Subject:</strong> {email.subject}</p>
                <p><strong>Date:</strong> {email.created_at}</p>
                <hr>
                {email.html_content}
                """,
                text_content=f"""
                {message}
                
                --- Forwarded message ---
                From: {email.from_email}
                Subject: {email.subject}
                Date: {email.created_at}
                
                {email.text_content}
                """,
                user=request.user,
                thread_id=email.thread_id or email.message_id
            )
            
            # Send forward email
            EmailService.send_email(forward_email)
            
            return Response({
                'message': 'Email forwarded successfully',
                'email': EmailSerializer(forward_email).data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to forward email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def create_case(self, request, pk=None):
        """Create a case from an email"""
        email = self.get_object()
        
        # Import here to avoid circular imports
        from cases.models import Case
        from cases.serializers import CaseSerializer
        
        case_data = {
            'title': request.data.get('title', email.subject),
            'description': request.data.get('description', email.text_content),
            'category': request.data.get('category', 'Email'),
            'priority': request.data.get('priority', 'Medium'),
            'source': 'Email',
            'customer': request.data.get('customer'),
            'company': request.data.get('company'),
            'assigned_to': request.data.get('assigned_to'),
            'email_thread_id': email.thread_id or email.message_id,
        }
        
        # Validate required fields
        if not case_data['customer']:
            return Response(
                {'error': 'Customer is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create case
            case = Case.objects.create(
                **case_data,
                created_by=request.user
            )
            
            # Link email to case
            email.case = case
            email.save(update_fields=['case'])
            
            return Response({
                'message': 'Case created successfully',
                'case': CaseSerializer(case).data,
                'email': EmailSerializer(email).data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create case: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='sync')
    def sync(self, request):
        """Manually sync emails from IMAP/Gmail for the authenticated user."""
        try:
            EmailService.sync_imap_emails(request.user)
            return Response({'message': 'Email sync completed.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmailTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for EmailTemplate model"""
    queryset = EmailTemplate.objects.select_related('created_by')
    serializer_class = EmailTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['template_type', 'is_active', 'created_by']
    search_fields = ['name', 'subject']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EmailTemplateCreateSerializer
        return EmailTemplateSerializer
    
    @action(detail=True, methods=['post'])
    def render(self, request, pk=None):
        """Render email template with context"""
        template = self.get_object()
        serializer = EmailTemplateRenderSerializer(data=request.data)
        
        if serializer.is_valid():
            context = serializer.validated_data['context']
            
            try:
                rendered = template.render_template(context)
                return Response(rendered)
            except Exception as e:
                return Response(
                    {'error': f'Failed to render template: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send_test(self, request, pk=None):
        """Send test email using template"""
        template = self.get_object()
        serializer = EmailTemplateRenderSerializer(data=request.data)
        
        if serializer.is_valid():
            context = serializer.validated_data['context']
            test_email = request.data.get('test_email', request.user.email)
            
            try:
                # Render template
                rendered = template.render_template(context)
                
                # Create test email
                email = Email.objects.create(
                    email_type='outbound',
                    status='draft',
                    subject=rendered['subject'],
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to_email=test_email,
                    html_content=rendered['html_content'],
                    text_content=rendered['text_content'],
                    template=template,
                    user=request.user
                )
                
                # Send test email
                EmailService.send_email(email)
                
                return Response({
                    'message': f'Test email sent to {test_email}',
                    'email': EmailSerializer(email).data
                })
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to send test email: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get templates grouped by type"""
        template_type = request.query_params.get('type')
        queryset = self.get_queryset().filter(is_active=True)
        
        if template_type:
            queryset = queryset.filter(template_type=template_type)
        
        templates = queryset.values('template_type').annotate(
            count=Count('id')
        ).order_by('template_type')
        
        return Response(templates) 

class UserEmailConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for UserEmailConfig model"""
    serializer_class = UserEmailConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own email configurations"""
        return UserEmailConfig.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserEmailConfigCreateSerializer
        return UserEmailConfigSerializer
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test email configuration connection"""
        config = self.get_object()
        serializer = UserEmailConfigTestSerializer(data=request.data)
        
        if serializer.is_valid():
            test_type = serializer.validated_data['test_type']
            results = {}
            
            try:
                if test_type in ['smtp', 'both']:
                    # Test SMTP connection
                    smtp_config = config.get_smtp_config()
                    smtp = smtplib.SMTP(smtp_config['host'], smtp_config['port'])
                    
                    if smtp_config['use_tls']:
                        smtp.starttls()
                    elif smtp_config['use_ssl']:
                        smtp = smtplib.SMTP_SSL(smtp_config['host'], smtp_config['port'])
                    
                    smtp.login(smtp_config['username'], smtp_config['password'])
                    
                    # Send test email
                    test_message = MIMEMultipart()
                    test_message['From'] = config.email_address
                    test_message['To'] = config.email_address
                    test_message['Subject'] = "Test Email from MINT CRM"
                    
                    body = "This is a test email to verify your email configuration."
                    test_message.attach(MIMEText(body, 'plain'))
                    
                    smtp.send_message(test_message)
                    smtp.quit()
                    
                    results['smtp'] = {'status': 'success', 'message': 'SMTP connection and test email sent successfully'}
                
                if test_type in ['imap', 'both']:
                    # Test IMAP connection
                    imap_config = config.get_imap_config()
                    if imap_config:
                        if imap_config['use_ssl']:
                            imap = imaplib.IMAP4_SSL(imap_config['host'], imap_config['port'])
                        else:
                            imap = imaplib.IMAP4(imap_config['host'], imap_config['port'])
                        
                        imap.login(imap_config['username'], imap_config['password'])
                        imap.select('INBOX')
                        imap.logout()
                        
                        results['imap'] = {'status': 'success', 'message': 'IMAP connection successful'}
                    else:
                        results['imap'] = {'status': 'skipped', 'message': 'IMAP not configured'}
                
                # Mark as verified if both tests pass
                if test_type == 'both' and all(r.get('status') == 'success' for r in results.values()):
                    config.is_verified = True
                    config.save()
                
                return Response({
                    'message': 'Connection test completed',
                    'results': results
                })
                
            except Exception as e:
                return Response({
                    'error': f'Connection test failed: {str(e)}',
                    'results': results
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify email configuration"""
        config = self.get_object()
        
        try:
            # Test SMTP connection
            smtp_config = config.get_smtp_config()
            smtp = smtplib.SMTP(smtp_config['host'], smtp_config['port'])
            
            if smtp_config['use_tls']:
                smtp.starttls()
            elif smtp_config['use_ssl']:
                smtp = smtplib.SMTP_SSL(smtp_config['host'], smtp_config['port'])
            
            smtp.login(smtp_config['username'], smtp_config['password'])
            smtp.quit()
            
            config.is_verified = True
            config.save()
            
            return Response({'message': 'Email configuration verified successfully'})
            
        except Exception as e:
            return Response({
                'error': f'Verification failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def providers(self, request):
        """Get available email providers"""
        providers = [
            {
                'value': choice[0],
                'label': choice[1],
                'smtp_host': self.get_provider_smtp_host(choice[0]),
                'smtp_port': self.get_provider_smtp_port(choice[0]),
                'imap_host': self.get_provider_imap_host(choice[0]),
                'imap_port': self.get_provider_imap_port(choice[0]),
                'use_tls': True,
                'use_ssl': False,
            }
            for choice in UserEmailConfig.EMAIL_PROVIDER_CHOICES
        ]
        
        return Response(providers)
    
    def get_provider_smtp_host(self, provider):
        """Get SMTP host for provider"""
        hosts = {
            'gmail': 'smtp.gmail.com',
            'outlook': 'smtp-mail.outlook.com',
            'yahoo': 'smtp.mail.yahoo.com',
            'custom': '',
        }
        return hosts.get(provider, '')
    
    def get_provider_smtp_port(self, provider):
        """Get SMTP port for provider"""
        ports = {
            'gmail': 587,
            'outlook': 587,
            'yahoo': 587,
            'custom': 587,
        }
        return ports.get(provider, 587)
    
    def get_provider_imap_host(self, provider):
        """Get IMAP host for provider"""
        hosts = {
            'gmail': 'imap.gmail.com',
            'outlook': 'outlook.office365.com',
            'yahoo': 'imap.mail.yahoo.com',
            'custom': '',
        }
        return hosts.get(provider, '')
    
    def get_provider_imap_port(self, provider):
        """Get IMAP port for provider"""
        ports = {
            'gmail': 993,
            'outlook': 993,
            'yahoo': 993,
            'custom': 993,
        }
        return ports.get(provider, 993) 

class SMSViewSet(viewsets.ModelViewSet):
    """ViewSet for SMS model"""
    queryset = SMS.objects.select_related('template', 'case', 'user', 'contact')
    serializer_class = SMSSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sms_type', 'status', 'template', 'case', 'user', 'contact']
    search_fields = ['message', 'to_number', 'from_number']
    ordering_fields = ['created_at', 'sent_at', 'message']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SMSCreateSerializer
        return SMSSerializer
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry sending a failed SMS"""
        sms = self.get_object()
        
        if not sms.can_retry:
            return Response(
                {'error': 'SMS cannot be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_config = SMSService.get_user_sms_config(request.user)
            SMSService.send_sms(sms, user_config)
            return Response({'message': 'SMS sent successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to send SMS: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def send_sms(self, request):
        """Send a new SMS"""
        serializer = SMSSendSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                sms_data = serializer.validated_data
                
                # Get user's SMS configuration
                user_config = SMSService.get_user_sms_config(request.user)
                
                # Create SMS record
                sms = SMS.objects.create(
                    sms_type='outbound',
                    status='draft',
                    message=sms_data['message'],
                    from_number=sms_data.get('from_number', user_config.from_number if user_config else ''),
                    to_number=sms_data['to_number'],
                    template=sms_data.get('template_id'),
                    case=sms_data.get('case_id'),
                    contact=sms_data.get('contact_id'),
                    user=request.user
                )
                
                # Send SMS using user's configuration
                SMSService.send_sms(sms, user_config)
                
                return Response({
                    'message': 'SMS sent successfully',
                    'sms': SMSSerializer(sms).data
                })
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to send SMS: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get SMS statistics"""
        queryset = self.get_queryset()
        
        total_sms = queryset.count()
        sent_sms = queryset.filter(status='sent').count()
        delivered_sms = queryset.filter(status='delivered').count()
        failed_sms = queryset.filter(status='failed').count()
        undelivered_sms = queryset.filter(status='undelivered').count()
        
        by_type = queryset.values('sms_type').annotate(count=Count('id'))
        by_status = queryset.values('status').annotate(count=Count('id'))
        
        return Response({
            'total_sms': total_sms,
            'sent_sms': sent_sms,
            'delivered_sms': delivered_sms,
            'failed_sms': failed_sms,
            'undelivered_sms': undelivered_sms,
            'by_type': list(by_type),
            'by_status': list(by_status),
        })

class SMSTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for SMSTemplate model"""
    queryset = SMSTemplate.objects.select_related('created_by')
    serializer_class = SMSTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['template_type', 'is_active', 'created_by']
    search_fields = ['name', 'message']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SMSTemplateCreateSerializer
        return SMSTemplateSerializer
    
    @action(detail=True, methods=['post'])
    def render(self, request, pk=None):
        """Render SMS template with context"""
        template = self.get_object()
        serializer = SMSTemplateRenderSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                context = serializer.validated_data['context']
                rendered = template.render_template(context)
                
                return Response({
                    'message': rendered['message'],
                    'template': SMSTemplateSerializer(template).data
                })
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to render template: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send_test(self, request, pk=None):
        """Send test SMS using template"""
        template = self.get_object()
        serializer = SMSTemplateRenderSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                context = serializer.validated_data['context']
                test_number = request.data.get('test_number', '')
                
                if not test_number:
                    return Response(
                        {'error': 'Test phone number is required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Send test SMS
                sms = SMSService.send_template_sms(
                    template.name,
                    context,
                    test_number,
                    sms_type='system',
                    user=request.user
                )
                
                return Response({
                    'message': 'Test SMS sent successfully',
                    'sms': SMSSerializer(sms).data
                })
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to send test SMS: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get SMS templates grouped by type"""
        templates = SMSTemplate.objects.filter(is_active=True).values('template_type').annotate(
            count=Count('id')
        )
        return Response(templates)

class UserSMSConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for UserSMSConfig model"""
    serializer_class = UserSMSConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own SMS configurations"""
        return UserSMSConfig.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserSMSConfigCreateSerializer
        return UserSMSConfigSerializer
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test SMS configuration connection"""
        config = self.get_object()
        serializer = UserSMSConfigTestSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # Test SMS configuration by sending a test message
                test_sms = SMS.objects.create(
                    sms_type='system',
                    status='draft',
                    message='Test SMS from MINT CRM',
                    from_number=config.from_number or 'TEST',
                    to_number=request.data.get('test_number', ''),
                    user=request.user
                )
                
                # Try to send the test SMS
                SMSService.send_sms(test_sms, config)
                
                # Mark as verified if successful
                config.is_verified = True
                config.save()
                
                return Response({
                    'message': 'SMS configuration test successful',
                    'test_sms': SMSSerializer(test_sms).data
                })
                
            except Exception as e:
                return Response({
                    'error': f'SMS configuration test failed: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify SMS configuration"""
        config = self.get_object()
        
        try:
            # Basic verification - check if required fields are present
            if config.provider == 'twilio' and (not config.account_sid or not config.auth_token):
                raise ValueError("Twilio requires Account SID and Auth Token")
            elif config.provider == 'aws_sns' and (not config.api_key or not config.api_secret):
                raise ValueError("AWS SNS requires API Key and Secret")
            elif config.provider == 'nexmo' and (not config.api_key or not config.api_secret):
                raise ValueError("Nexmo requires API Key and Secret")
            
            config.is_verified = True
            config.save()
            
            return Response({'message': 'SMS configuration verified successfully'})
            
        except Exception as e:
            return Response({
                'error': f'Verification failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def providers(self, request):
        """Get available SMS providers"""
        providers = [
            {
                'value': choice[0],
                'label': choice[1],
                'fields': UserSMSConfig._meta.get_field(choice[0]).choices if hasattr(UserSMSConfig._meta.get_field(choice[0]), 'choices') else []
            }
            for choice in UserSMSConfig.SMS_PROVIDER_CHOICES
        ]
        
        return Response(providers) 

class EmailAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for EmailAttachment model (upload, list, delete)"""
    queryset = EmailAttachment.objects.all()
    serializer_class = EmailAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['email']
    search_fields = ['filename']
    ordering_fields = ['created_at', 'filename', 'file_size']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        # Require email to be specified in the POST data
        email_id = self.request.data.get('email')
        if not email_id:
            raise serializers.ValidationError({'email': 'This field is required.'})
        serializer.save(email_id=email_id) 