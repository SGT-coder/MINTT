#!/usr/bin/env python
"""
Script to update .env file with proper values
"""

import os
import re

def update_env_file():
    """Update .env file with proper values"""
    print("🔧 Updating .env file...")
    
    # Read current .env file
    with open('.env', 'r') as f:
        content = f.read()
    
    # Generate new secret key
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')
    django.setup()
    
    from django.core.management.utils import get_random_secret_key
    new_secret_key = get_random_secret_key()
    
    # Update secret key
    content = re.sub(
        r'SECRET_KEY=.*',
        f'SECRET_KEY={new_secret_key}',
        content
    )
    
    # Write updated content
    with open('.env', 'w') as f:
        f.write(content)
    
    print("✅ .env file updated!")
    print(f"📝 New secret key generated: {new_secret_key[:20]}...")
    print("\n⚠️  IMPORTANT: You still need to update:")
    print("   1. DB_PASSWORD=your_actual_postgresql_password")
    print("   2. EMAIL_HOST_USER=your_email@gmail.com")
    print("   3. EMAIL_HOST_PASSWORD=your_email_app_password")
    print("\n💡 To update DB_PASSWORD, edit the .env file and replace:")
    print("   DB_PASSWORD=your_password_here")
    print("   with your actual PostgreSQL password")

if __name__ == '__main__':
    update_env_file() 