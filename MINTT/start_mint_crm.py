#!/usr/bin/env python
"""
MINT CRM Quick Start Script
This script starts both the Django backend and Next.js frontend
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    print("Checking dependencies...")
    
    # Check Python
    try:
        import django
        print("✅ Django installed")
    except ImportError:
        print("❌ Django not installed. Run: pip install -r mint-crm-backend/requirements.txt")
        return False
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js installed: {result.stdout.strip()}")
        else:
            print("❌ Node.js not installed")
            return False
    except FileNotFoundError:
        print("❌ Node.js not found in PATH")
        return False
    
    # Check npm/pnpm
    try:
        result = subprocess.run(['pnpm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ pnpm installed: {result.stdout.strip()}")
            package_manager = 'pnpm'
        else:
            result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ npm installed: {result.stdout.strip()}")
                package_manager = 'npm'
            else:
                print("❌ Neither pnpm nor npm found")
                return False
    except FileNotFoundError:
        print("❌ Package manager not found")
        return False
    
    return True

def setup_backend():
    """Set up the Django backend"""
    print("\nSetting up Django backend...")
    
    backend_dir = Path("mint-crm-backend")
    if not backend_dir.exists():
        print("❌ Backend directory not found")
        return False
    
    # Check if virtual environment exists
    venv_dir = backend_dir / "venv"
    if not venv_dir.exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], cwd=backend_dir)
    
    # Install requirements
    print("Installing Python dependencies...")
    if os.name == 'nt':  # Windows
        pip_cmd = str(venv_dir / "Scripts" / "pip")
    else:  # Unix/Linux/macOS
        pip_cmd = str(venv_dir / "bin" / "pip")
    
    subprocess.run([pip_cmd, "install", "-r", "requirements.txt"], cwd=backend_dir)
    
    # Set up environment file
    env_file = backend_dir / ".env"
    if not env_file.exists():
        print("Creating environment file...")
        subprocess.run(["cp", "env.example", ".env"], cwd=backend_dir)
        print("⚠️  Please edit mint-crm-backend/.env with your database settings")
    
    # Run database setup
    print("Setting up database...")
    if os.name == 'nt':  # Windows
        python_cmd = str(venv_dir / "Scripts" / "python")
    else:  # Unix/Linux/macOS
        python_cmd = str(venv_dir / "bin" / "python")
    
    subprocess.run([python_cmd, "setup_database.py"], cwd=backend_dir)
    
    return True

def setup_frontend():
    """Set up the Next.js frontend"""
    print("\nSetting up Next.js frontend...")
    
    frontend_dir = Path("mint-crm_V2.1")
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return False
    
    # Install dependencies
    print("Installing Node.js dependencies...")
    subprocess.run(["pnpm", "install"], cwd=frontend_dir)
    
    # Set up environment file
    env_file = frontend_dir / ".env.local"
    if not env_file.exists():
        print("Creating environment file...")
        with open(env_file, 'w') as f:
            f.write("NEXT_PUBLIC_API_URL=http://localhost:8000/api\n")
    
    return True

def start_backend():
    """Start the Django backend server"""
    print("\nStarting Django backend...")
    
    backend_dir = Path("mint-crm-backend")
    if os.name == 'nt':  # Windows
        python_cmd = str(backend_dir / "venv" / "Scripts" / "python")
    else:  # Unix/Linux/macOS
        python_cmd = str(backend_dir / "venv" / "bin" / "python")
    
    subprocess.run([python_cmd, "manage.py", "runserver"], cwd=backend_dir)

def start_frontend():
    """Start the Next.js frontend server"""
    print("\nStarting Next.js frontend...")
    
    frontend_dir = Path("mint-crm_V2.1")
    subprocess.run(["pnpm", "dev"], cwd=frontend_dir)

def main():
    """Main function"""
    print("🚀 MINT CRM Quick Start")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Dependencies check failed. Please install required software.")
        return
    
    # Set up backend
    if not setup_backend():
        print("\n❌ Backend setup failed.")
        return
    
    # Set up frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed.")
        return
    
    print("\n✅ Setup completed successfully!")
    print("\nStarting servers...")
    print("Backend will be available at: http://localhost:8000")
    print("Frontend will be available at: http://localhost:3000")
    print("\nPress Ctrl+C to stop all servers")
    
    # Start servers in separate threads
    backend_thread = threading.Thread(target=start_backend)
    frontend_thread = threading.Thread(target=start_frontend)
    
    backend_thread.daemon = True
    frontend_thread.daemon = True
    
    backend_thread.start()
    time.sleep(3)  # Give backend time to start
    frontend_thread.start()
    
    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping servers...")
        sys.exit(0)

if __name__ == '__main__':
    main() 