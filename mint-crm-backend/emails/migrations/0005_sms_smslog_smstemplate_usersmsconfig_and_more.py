# Generated by Django 5.0.2 on 2025-07-20 20:06

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0002_initial'),
        ('contacts', '0002_initial'),
        ('emails', '0004_useremailconfig'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SMS',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sms_type', models.CharField(choices=[('outbound', 'Outbound'), ('inbound', 'Inbound'), ('system', 'System')], default='outbound', max_length=10)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('queued', 'Queued'), ('sent', 'Sent'), ('delivered', 'Delivered'), ('failed', 'Failed'), ('undelivered', 'Undelivered')], default='draft', max_length=15)),
                ('message', models.TextField(max_length=1600)),
                ('from_number', models.CharField(max_length=20)),
                ('to_number', models.CharField(max_length=20)),
                ('message_id', models.CharField(blank=True, help_text='SMS message ID from provider', max_length=255)),
                ('conversation_id', models.CharField(blank=True, help_text='SMS conversation ID', max_length=255)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('retry_count', models.PositiveIntegerField(default=0)),
                ('max_retries', models.PositiveIntegerField(default=3)),
                ('starred', models.BooleanField(default=False, help_text='Whether the SMS is starred')),
                ('archived', models.BooleanField(default=False, help_text='Whether the SMS is archived')),
                ('read', models.BooleanField(default=False, help_text='Whether the SMS has been read')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('case', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sms_messages', to='cases.case')),
                ('contact', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sms_messages', to='contacts.contact')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sms_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SMSLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event', models.CharField(choices=[('sent', 'Sent'), ('delivered', 'Delivered'), ('read', 'Read'), ('failed', 'Failed'), ('undelivered', 'Undelivered')], max_length=20)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('data', models.JSONField(default=dict, help_text='Additional event data')),
                ('sms', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='emails.sms')),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='SMSTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('template_type', models.CharField(choices=[('case_assignment', 'Case Assignment'), ('case_response', 'Case Response'), ('case_escalation', 'Case Escalation'), ('case_resolution', 'Case Resolution'), ('welcome', 'Welcome SMS'), ('notification', 'General Notification'), ('custom', 'Custom Template')], max_length=30)),
                ('message', models.TextField(help_text='SMS message template', max_length=1600)),
                ('variables', models.JSONField(default=dict, help_text='Available template variables')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_sms_templates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='UserSMSConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('twilio', 'Twilio'), ('aws_sns', 'AWS SNS'), ('nexmo', 'Nexmo/Vonage'), ('custom', 'Custom API')], max_length=20)),
                ('account_sid', models.CharField(blank=True, max_length=255)),
                ('auth_token', models.CharField(blank=True, max_length=255)),
                ('api_key', models.CharField(blank=True, max_length=255)),
                ('api_secret', models.CharField(blank=True, max_length=255)),
                ('from_number', models.CharField(blank=True, max_length=20)),
                ('webhook_url', models.URLField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('last_sync', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='sms_config', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User SMS Configuration',
                'verbose_name_plural': 'User SMS Configurations',
            },
        ),
        migrations.AddIndex(
            model_name='sms',
            index=models.Index(fields=['status', 'sms_type'], name='emails_sms_status_b28bb9_idx'),
        ),
        migrations.AddIndex(
            model_name='sms',
            index=models.Index(fields=['case', 'created_at'], name='emails_sms_case_id_c512cc_idx'),
        ),
        migrations.AddIndex(
            model_name='sms',
            index=models.Index(fields=['user', 'created_at'], name='emails_sms_user_id_d195e6_idx'),
        ),
        migrations.AddIndex(
            model_name='sms',
            index=models.Index(fields=['contact', 'created_at'], name='emails_sms_contact_aa8ddd_idx'),
        ),
        migrations.AddIndex(
            model_name='sms',
            index=models.Index(fields=['message_id'], name='emails_sms_message_76381d_idx'),
        ),
        migrations.AddIndex(
            model_name='sms',
            index=models.Index(fields=['conversation_id'], name='emails_sms_convers_649baa_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='smstemplate',
            unique_together={('name', 'template_type')},
        ),
    ]
