from emails.models import Email
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(is_superuser=True).first()
if u:
    Email.objects.create(
        email_type='inbound',
        status='queued',
        subject='Test Inbox Email',
        from_email='test@sender.com',
        to_email='admin@mintcrm.com',
        text_content='This is a test inbox email.',
        user=u
    )
    Email.objects.create(
        email_type='outbound',
        status='sent',
        subject='Test Sent Email',
        from_email='admin@mintcrm.com',
        to_email='test@receiver.com',
        text_content='This is a test sent email.',
        user=u
    )
    print('Test emails created.')
else:
    print('No superuser found.') 