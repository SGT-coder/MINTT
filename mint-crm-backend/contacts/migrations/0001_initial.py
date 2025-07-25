# Generated by Django 5.0.2 on 2025-07-19 12:40

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Company',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('industry', models.CharField(choices=[('technology', 'Technology'), ('healthcare', 'Healthcare'), ('finance', 'Finance'), ('education', 'Education'), ('retail', 'Retail'), ('manufacturing', 'Manufacturing'), ('consulting', 'Consulting'), ('other', 'Other')], default='other', max_length=20)),
                ('website', models.URLField(blank=True)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('address', models.TextField(blank=True)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('state', models.CharField(blank=True, max_length=100)),
                ('country', models.CharField(blank=True, max_length=100)),
                ('postal_code', models.CharField(blank=True, max_length=20)),
                ('description', models.TextField(blank=True)),
                ('annual_revenue', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('employee_count', models.PositiveIntegerField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_customer', models.BooleanField(default=False)),
                ('is_prospect', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'company',
                'verbose_name_plural': 'companies',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Contact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, choices=[('mr', 'Mr.'), ('mrs', 'Mrs.'), ('ms', 'Ms.'), ('dr', 'Dr.'), ('prof', 'Prof.'), ('other', 'Other')], max_length=10)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('mobile', models.CharField(blank=True, max_length=20)),
                ('job_title', models.CharField(blank=True, max_length=100)),
                ('department', models.CharField(blank=True, max_length=100)),
                ('address', models.TextField(blank=True)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('state', models.CharField(blank=True, max_length=100)),
                ('country', models.CharField(blank=True, max_length=100)),
                ('postal_code', models.CharField(blank=True, max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('birthday', models.DateField(blank=True, null=True)),
                ('linkedin_url', models.URLField(blank=True)),
                ('twitter_handle', models.CharField(blank=True, max_length=50)),
                ('is_active', models.BooleanField(default=True)),
                ('is_customer', models.BooleanField(default=False)),
                ('is_prospect', models.BooleanField(default=True)),
                ('email_opt_out', models.BooleanField(default=False)),
                ('phone_opt_out', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='contacts', to='contacts.company')),
            ],
            options={
                'ordering': ['first_name', 'last_name'],
            },
        ),
    ]
