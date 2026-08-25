import mysql.connector
from mysql.connector import Error
from config import Config
import time

class Database:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        self.connection = None
        self.cursor = None
        self._connect()
    
    def _connect(self):
        """Establish database connection"""
        try:
            if self.connection and self.connection.is_connected():
                return
            
            self.connection = mysql.connector.connect(
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                database=Config.DB_NAME,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                autocommit=False,
                connect_timeout=30,
                get_warnings=True
            )
            self.cursor = self.connection.cursor(dictionary=True)
            print("✅ Database connected successfully!")
        except Error as e:
            print(f"❌ Database connection failed: {e}")
            self.connection = None
            self.cursor = None
            raise
    
    def _ensure_connection(self):
        """Ensure connection is alive, reconnect if needed"""
        try:
            if self.connection and self.connection.is_connected():
                self.connection.ping(reconnect=True)
                return
        except:
            pass
        
        print("🔄 Reconnecting to database...")
        self._connect()
    
    def execute_query(self, query, params=None):
        """Execute a query and return results with automatic reconnection"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                self._ensure_connection()
                self.cursor.execute(query, params or ())
                if query.strip().upper().startswith('SELECT'):
                    return self.cursor.fetchall()
                self.connection.commit()
                return self.cursor.lastrowid
            except Error as e:
                try:
                    self.connection.rollback()
                except:
                    pass
                if attempt < max_retries - 1:
                    print(f"⚠️ Query error, retrying ({attempt + 1}/{max_retries}): {e}")
                    time.sleep(1)
                    continue
                raise e
    
    def close(self):
        if self.cursor:
            self.cursor.close()
        if self.connection and self.connection.is_connected():
            self.connection.close()