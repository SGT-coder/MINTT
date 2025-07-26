#!/usr/bin/env python
"""
Database Connection Test Script
This script tests the PostgreSQL connection and shows current configuration
"""

import os
import sys
import django
from django.conf import settings
from django.db import connection
from django.core.management import execute_from_command_line

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mint_crm.settings')
django.setup()

def test_database_connection():
    """Test the database connection"""
    print("🔍 Testing Database Connection...")
    print("=" * 50)
    
    # Show current database configuration
    db_config = settings.DATABASES['default']
    print("📋 Current Database Configuration:")
    print(f"   Engine: {db_config['ENGINE']}")
    print(f"   Name: {db_config['NAME']}")
    print(f"   User: {db_config['USER']}")
    print(f"   Host: {db_config['HOST']}")
    print(f"   Port: {db_config['PORT']}")
    print(f"   Password: {'*' * len(db_config['PASSWORD']) if db_config['PASSWORD'] else 'Not set'}")
    print()
    
    # Test connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print("✅ Database connection successful!")
            print(f"📊 PostgreSQL Version: {version[0]}")
            
            # Check if database exists and has tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            
            if tables:
                print(f"📋 Found {len(tables)} tables:")
                for table in tables:
                    print(f"   - {table[0]}")
            else:
                print("⚠️  No tables found in database")
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    return True

def check_migrations():
    """Check migration status"""
    print("\n🔄 Checking Migration Status...")
    print("=" * 30)
    
    try:
        # Run migration check
        from django.core.management import call_command
        from io import StringIO
        
        out = StringIO()
        call_command('showmigrations', stdout=out)
        migrations_output = out.getvalue()
        
        print("Migration Status:")
        print(migrations_output)
        
        # Check for unapplied migrations
        if '[ ]' in migrations_output:
            print("⚠️  There are unapplied migrations!")
            return False
        else:
            print("✅ All migrations are applied!")
            return True
            
    except Exception as e:
        print(f"❌ Error checking migrations: {e}")
        return False

def test_case_models():
    """Test case-related models"""
    print("\n📋 Testing Case Models...")
    print("=" * 30)
    
    try:
        from cases.models import Case
        from contacts.models import Contact
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Check if models can be imported
        print("✅ Case models imported successfully")
        
        # Check if tables exist
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('cases_case', 'contacts_contact', 'users_user')
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            
            expected_tables = ['cases_case', 'contacts_contact', 'users_user']
            found_tables = [table[0] for table in tables]
            
            print(f"📊 Found tables: {found_tables}")
            
            for table in expected_tables:
                if table in found_tables:
                    print(f"✅ {table} exists")
                else:
                    print(f"❌ {table} missing")
        
        # Test model queries
        case_count = Case.objects.count()
        contact_count = Contact.objects.count()
        user_count = User.objects.count()
        
        print(f"\n📊 Current Data Counts:")
        print(f"   Cases: {case_count}")
        print(f"   Contacts: {contact_count}")
        print(f"   Users: {user_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing models: {e}")
        return False

def create_test_data():
    """Create test data if none exists"""
    print("\n🧪 Creating Test Data...")
    print("=" * 30)
    
    try:
        from django.contrib.auth import get_user_model
        from contacts.models import Contact, Company
        from cases.models import Case
        
        User = get_user_model()
        
        # Create test user if none exists
        if User.objects.count() == 0:
            print("Creating test admin user...")
            admin_user = User.objects.create_superuser(
                email='admin@mintcrm.com',
                password='admin123',
                first_name='Admin',
                last_name='User'
            )
            print(f"✅ Created admin user: {admin_user.email}")
        else:
            admin_user = User.objects.first()
            print(f"✅ Using existing user: {admin_user.email}")
        
        # Create test contact if none exists
        if Contact.objects.count() == 0:
            print("Creating test contact...")
            contact = Contact.objects.create(
                first_name='Test',
                last_name='Customer',
                email='test@example.com',
                phone='+1234567890',
                job_title='Manager',
                department='IT',
                is_customer=True
            )
            print(f"✅ Created test contact: {contact.get_full_name()}")
        else:
            contact = Contact.objects.first()
            print(f"✅ Using existing contact: {contact.get_full_name()}")
        
        # Create test case if none exists
        if Case.objects.count() == 0:
            print("Creating test case...")
            case = Case.objects.create(
                title='Test Case - Database Connection',
                description='This is a test case to verify database functionality',
                category='technical',
                priority='medium',
                status='new',
                source='web_form',
                customer=contact,
                created_by=admin_user
            )
            print(f"✅ Created test case: {case.case_number}")
        else:
            case = Case.objects.first()
            print(f"✅ Using existing case: {case.case_number}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        return False

def main():
    """Main function"""
    print("🚀 MINT CRM Database Test")
    print("=" * 50)
    
    # Test database connection
    if not test_database_connection():
        print("\n❌ Database connection failed. Please check your configuration.")
        return
    
    # Check migrations
    if not check_migrations():
        print("\n⚠️  Running migrations...")
        try:
            execute_from_command_line(['manage.py', 'migrate'])
            print("✅ Migrations completed!")
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            return
    
    # Test models
    if not test_case_models():
        print("\n❌ Model test failed.")
        return
    
    # Create test data
    if not create_test_data():
        print("\n❌ Test data creation failed.")
        return
    
    print("\n🎉 Database test completed successfully!")
    print("\n📋 Summary:")
    print("   ✅ Database connection working")
    print("   ✅ Migrations applied")
    print("   ✅ Models functional")
    print("   ✅ Test data created")
    print("\n🔗 You can now test the case management features!")

if __name__ == '__main__':
    main() 