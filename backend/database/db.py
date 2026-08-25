import mysql.connector
from mysql.connector import Error
from config import Config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        """Create a brand new connection every time"""
        self.connection = None
        self.cursor = None
        self._connect()
    
    def _connect(self):
        """Create a new connection"""
        try:
            logger.info("🔄 Connecting to MySQL...")
            self.connection = mysql.connector.connect(
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                database=Config.DB_NAME,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                autocommit=True,
                connect_timeout=5,
                use_pure=True
            )
            self.cursor = self.connection.cursor(dictionary=True)
            logger.info("✅ MySQL connected!")
        except Error as e:
            logger.error(f"❌ Connection failed: {e}")
            self.connection = None
            self.cursor = None
            raise
    
    def execute_query(self, query, params=None):
        """Execute a query with a fresh connection"""
        try:
            # Always create a fresh connection
            self._connect()
            
            self.cursor.execute(query, params or ())
            
            if query.strip().upper().startswith('SELECT'):
                result = self.cursor.fetchall()
                # Close connection after query
                self._close()
                return result
            else:
                result = self.cursor.lastrowid
                self._close()
                return result
                
        except Error as e:
            logger.error(f"❌ Query error: {e}")
            self._close()
            raise
    
    def _close(self):
        """Close connection"""
        try:
            if self.cursor:
                self.cursor.close()
        except:
            pass
        try:
            if self.connection and self.connection.is_connected():
                self.connection.close()
        except:
            pass
        self.connection = None
        self.cursor = None