import mysql.connector
from config import Config
import sys

def debug_connection():
    print("=" * 60)
    print("🔍 DENTAL INVENTORY BACKEND DEBUG")
    print("=" * 60)
    
    # 1. Check Config
    print("\n📋 1. CONFIGURATION:")
    print(f"   DB_HOST: {Config.DB_HOST}")
    print(f"   DB_PORT: {Config.DB_PORT}")
    print(f"   DB_NAME: {Config.DB_NAME}")
    print(f"   DB_USER: {Config.DB_USER}")
    print(f"   DB_PASSWORD: {'*' * len(Config.DB_PASSWORD) if Config.DB_PASSWORD else '(empty)'}")
    print(f"   FRONTEND_URL: {Config.FRONTEND_URL}")
    
    # 2. Test Database Connection
    print("\n📊 2. DATABASE CONNECTION:")
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            database=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            connect_timeout=5
        )
        cursor = conn.cursor(dictionary=True)
        print("   ✅ Connection successful!")
        
        # Check tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"\n   📁 Tables found: {len(tables)}")
        for table in tables:
            table_name = list(table.values())[0]
            cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
            count = cursor.fetchone()
            print(f"      - {table_name}: {count['count']} rows")
        
        # Check students specifically
        print("\n   👨‍🎓 STUDENTS TABLE:")
        cursor.execute("SELECT COUNT(*) as count FROM students")
        count = cursor.fetchone()
        print(f"      Total students: {count['count']}")
        
        if count['count'] > 0:
            cursor.execute("SELECT * FROM students LIMIT 3")
            students = cursor.fetchall()
            print("      Sample students:")
            for s in students:
                print(f"         - {s.get('name', 'N/A')} ({s.get('campus_id', 'N/A')})")
        
        cursor.close()
        conn.close()
        print("\n   ✅ Database check complete!")
        
    except mysql.connector.Error as e:
        print(f"   ❌ Database error: {e}")
        return False
    
    # 3. Check API Endpoints
    print("\n🔌 3. API ENDPOINTS (via curl):")
    print("   Run these commands in PowerShell to test:")
    print("")
    print("   # Test health")
    print(f"   curl http://localhost:5000/api/health")
    print("")
    print("   # Test login")
    print(f"   curl -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{{\"email\":\"admin@yendental.com\",\"password\":\"admin123\"}}'")
    print("")
    print("   # Test students (replace TOKEN with actual token)")
    print(f"   curl http://localhost:5000/api/students/ -H 'Authorization: Bearer TOKEN'")
    
    print("\n" + "=" * 60)
    print("✅ Debug complete!")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    debug_connection()