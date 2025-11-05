#!/usr/bin/env python3
"""
B4OS GitHub Classroom Sync Script
Synchronizes GitHub Classroom data to Supabase for the admin dashboard.

Usage:
    python sync-classroom.py

Requirements:
    - GitHub CLI installed and authenticated
    - Supabase credentials configured
    - Python dependencies installed
"""

import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env.local (skip in CI)
if not os.getenv('CI'):
    env_path = Path(__file__).parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded environment variables from {env_path}")
    else:
        print(f"⚠️  Environment file not found: {env_path}")
else:
    print("✅ Running in CI mode - using environment variables from GitHub Secrets")

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

def check_requirements():
    """Check if all requirements are met."""
    print("🔍 Checking requirements...")
    
    # Check if GitHub CLI is installed
    try:
        result = subprocess.run(['gh', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ GitHub CLI is installed")
        else:
            print("❌ GitHub CLI not found")
            return False
    except FileNotFoundError:
        print("❌ GitHub CLI not found")
        return False
    
    # Check if GitHub CLI is authenticated
    try:
        result = subprocess.run(['gh', 'auth', 'status'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ GitHub CLI is authenticated")
        else:
            print("❌ GitHub CLI not authenticated. Please run: gh auth login")
            return False
    except FileNotFoundError:
        print("❌ GitHub CLI not found")
        return False
    
    # Check if Supabase credentials are configured
    # Map from .env.local variable names to expected names
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
    # Use anon key for now (service role key seems to have issues)
    supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found in environment variables")
        print("   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return False
    else:
        print("✅ Supabase credentials found")
        # Check if it's a service role key by looking at the JWT payload
        try:
            import base64
            import json
            parts = supabase_key.split('.')
            if len(parts) >= 2:
                payload = parts[1]
                payload += '=' * (4 - len(payload) % 4)
                decoded = base64.b64decode(payload)
                data = json.loads(decoded)
                key_type = 'Service Role' if data.get('role') == 'service_role' else 'Anon'
            else:
                key_type = 'Unknown'
        except:
            key_type = 'Unknown'
        print(f"   Using key type: {key_type}")
        # Set the variables for the sync script
        os.environ['SUPABASE_URL'] = supabase_url
        os.environ['SUPABASE_KEY'] = supabase_key
    
    # Set classroom name (hardcoded for B4OS-Dev-2025)
    classroom_name = os.getenv('CLASSROOM_NAME', 'B4OS-Dev-2025')
    os.environ['CLASSROOM_NAME'] = classroom_name
    print(f"✅ Classroom name set to: {classroom_name}")
    
    return True

def install_dependencies():
    """Install required Python dependencies."""
    print("📦 Installing Python dependencies...")
    
    dependencies = [
        'pandas',
        'python-dotenv',
        'supabase'
    ]
    
    for dep in dependencies:
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', dep], check=True)
            print(f"✅ Installed {dep}")
        except subprocess.CalledProcessError:
            print(f"❌ Failed to install {dep}")
            return False
    
    return True

def main():
    """Main function to run the sync process."""
    print("🚀 B4OS GitHub Classroom Sync")
    print("=" * 40)
    
    # Check requirements
    if not check_requirements():
        print("\n❌ Requirements not met. Please fix the issues above.")
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("\n❌ Failed to install dependencies.")
        sys.exit(1)
    
    # Import and run the sync
    try:
        from src.lib.classroom_sync import ClassroomSupabaseSync, create_config_from_env
        
        print("\n🔄 Starting sync process...")
        config = create_config_from_env()
        sync_client = ClassroomSupabaseSync(config)
        sync_client.run_sync()
        
        print("\n✅ Sync completed successfully!")
        
    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print("   Make sure you're running this from the project root directory")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Sync failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
