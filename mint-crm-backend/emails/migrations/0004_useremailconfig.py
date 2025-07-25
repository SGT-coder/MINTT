# Generated by Django 5.0.2 on 2025-07-20 19:55

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('emails', '0003_email_archived_email_read_email_starred'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserEmailConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('gmail', 'Gmail'), ('outlook', 'Outlook/Hotmail'), ('yahoo', 'Yahoo'), ('custom', 'Custom SMTP')], max_length=20)),
                ('email_address', models.EmailField(max_length=254)),
                ('display_name', models.CharField(blank=True, max_length=100)),
                ('smtp_host', models.CharField(max_length=255)),
                ('smtp_port', models.PositiveIntegerField()),
                ('smtp_username', models.EmailField(max_length=254)),
                ('smtp_password', models.CharField(max_length=255)),
                ('use_tls', models.BooleanField(default=True)),
                ('use_ssl', models.BooleanField(default=False)),
                ('imap_host', models.CharField(blank=True, max_length=255)),
                ('imap_port', models.PositiveIntegerField(default=993)),
                ('imap_username', models.EmailField(blank=True, max_length=254)),
                ('imap_password', models.CharField(blank=True, max_length=255)),
                ('use_imap_ssl', models.BooleanField(default=True)),
                ('oauth_access_token', models.TextField(blank=True)),
                ('oauth_refresh_token', models.TextField(blank=True)),
                ('oauth_expires_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('last_sync', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='email_config', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Email Configuration',
                'verbose_name_plural': 'User Email Configurations',
            },
        ),
    ]
