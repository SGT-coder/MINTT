#!/usr/bin/env python
"""
Simple database connection test
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')
django.setup()

def test_connection():
    """Test database connection"""
    print("🔍 Testing Database Connection...")
    
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Database connected: {version[0]}")
            
            # Test case count
            from cases.models import Case
            case_count = Case.objects.count()
            print(f"✅ Found {case_count} cases in database")
            
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Make sure to update DB_PASSWORD in your .env file")
        print("   with your actual PostgreSQL password")
        return False

if __name__ == '__main__':
    test_connection() 