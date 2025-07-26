import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')

app = Celery('mint_crm')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

# Periodic tasks
app.conf.beat_schedule = {
    'escalate-overdue-cases': {
        'task': 'cases.tasks.escalate_overdue_cases',
        'schedule': 3600.0,  # Every hour
    },
    'send-scheduled-emails': {
        'task': 'emails.tasks.send_scheduled_emails',
        'schedule': 300.0,  # Every 5 minutes
    },
    'cleanup-old-emails': {
        'task': 'emails.tasks.cleanup_old_emails',
        'schedule': 86400.0,  # Daily
    },
    'generate-daily-reports': {
        'task': 'reports.tasks.generate_daily_reports',
        'schedule': 86400.0,  # Daily at midnight
    },
} 