#!/usr/bin/env python
"""
Database setup script for MINT CRM
This script initializes the PostgreSQL database and creates initial data
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.contrib.auth import get_user_model
from django.db import connection

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')
django.setup()

User = get_user_model()

def setup_database():
    """Set up the database with initial data"""
    print("Setting up MINT CRM database...")
    
    # Run migrations
    print("Running migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    # Create superuser if it doesn't exist
    if not User.objects.filter(email='admin@mintcrm.com').exists():
        print("Creating superuser...")
        User.objects.create_superuser(
            email='admin@mintcrm.com',
            password='admin123',
            first_name='Admin',
            last_name='User'
        )
        print("Superuser created: admin@mintcrm.com / admin123")
    
    # Create test users
    test_users = [
        {
            'email': 'manager@mintcrm.com',
            'password': 'manager123',
            'first_name': 'Manager',
            'last_name': 'User',
            'role': 'manager'
        },
        {
            'email': 'agent@mintcrm.com',
            'password': 'agent123',
            'first_name': 'Agent',
            'last_name': 'User',
            'role': 'agent'
        },
        {
            'email': 'customer@mintcrm.com',
            'password': 'customer123',
            'first_name': 'Customer',
            'last_name': 'User',
            'role': 'customer'
        }
    ]
    
    for user_data in test_users:
        if not User.objects.filter(email=user_data['email']).exists():
            user = User.objects.create_user(
                email=user_data['email'],
                password=user_data['password'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                role=user_data['role']
            )
            print(f"Created {user_data['role']} user: {user_data['email']} / {user_data['password']}")
    
    # Run sample data setup commands
    print("Setting up sample data...")
    try:
        execute_from_command_line(['manage.py', 'setup_crm'])
        execute_from_command_line(['manage.py', 'setup_sample_emails'])
    except Exception as e:
        print(f"Warning: Could not run sample data setup: {e}")
    
    print("Database setup completed successfully!")
    print("\nDefault users:")
    print("- Admin: admin@mintcrm.com / admin123")
    print("- Manager: manager@mintcrm.com / manager123")
    print("- Agent: agent@mintcrm.com / agent123")
    print("- Customer: customer@mintcrm.com / customer123")

if __name__ == '__main__':
    setup_database() 