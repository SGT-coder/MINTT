# Generated by Django 5.0.2 on 2025-07-19 12:40

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('cases', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='email_attachments/')),
                ('filename', models.CharField(max_length=255)),
                ('content_type', models.CharField(max_length=100)),
                ('file_size', models.PositiveIntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='EmailLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event', models.CharField(choices=[('sent', 'Sent'), ('delivered', 'Delivered'), ('opened', 'Opened'), ('clicked', 'Clicked'), ('bounced', 'Bounced'), ('complained', 'Complained'), ('unsubscribed', 'Unsubscribed')], max_length=20)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('data', models.JSONField(default=dict, help_text='Additional event data')),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='EmailTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('template_type', models.CharField(choices=[('case_assignment', 'Case Assignment'), ('case_response', 'Case Response'), ('case_escalation', 'Case Escalation'), ('case_resolution', 'Case Resolution'), ('welcome', 'Welcome Email'), ('password_reset', 'Password Reset'), ('notification', 'General Notification'), ('custom', 'Custom Template')], max_length=30)),
                ('subject', models.CharField(max_length=200)),
                ('html_content', models.TextField(help_text='HTML version of the email')),
                ('text_content', models.TextField(help_text='Plain text version of the email')),
                ('variables', models.JSONField(default=dict, help_text='Available template variables')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Email',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_type', models.CharField(choices=[('outbound', 'Outbound'), ('inbound', 'Inbound'), ('system', 'System')], default='outbound', max_length=10)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('queued', 'Queued'), ('sent', 'Sent'), ('delivered', 'Delivered'), ('failed', 'Failed'), ('bounced', 'Bounced')], default='draft', max_length=10)),
                ('subject', models.CharField(max_length=200)),
                ('from_email', models.EmailField(max_length=254)),
                ('to_email', models.EmailField(max_length=254)),
                ('cc_emails', models.TextField(blank=True, help_text='Comma-separated CC emails')),
                ('bcc_emails', models.TextField(blank=True, help_text='Comma-separated BCC emails')),
                ('html_content', models.TextField(blank=True)),
                ('text_content', models.TextField(blank=True)),
                ('message_id', models.CharField(blank=True, help_text='Email message ID', max_length=255)),
                ('thread_id', models.CharField(blank=True, help_text='Email thread ID', max_length=255)),
                ('reply_to', models.EmailField(blank=True, max_length=254)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('opened_at', models.DateTimeField(blank=True, null=True)),
                ('clicked_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('retry_count', models.PositiveIntegerField(default=0)),
                ('max_retries', models.PositiveIntegerField(default=3)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('case', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='emails', to='cases.case')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
