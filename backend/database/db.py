import mysql.connector
from mysql.connector import Error, pooling
from config import Config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connection pool singleton
_db_pool = None

def get_pool():
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = pooling.MySQLConnectionPool(
                pool_name="dental_inventory_pool",
                pool_size=10,
                pool_reset_session=True,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                database=Config.DB_NAME,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                autocommit=True,
                connect_timeout=5
            )
            logger.info("✅ MySQL connection pool created!")
        except Error as e:
            logger.error(f"❌ Connection pool creation failed: {e}")
            _db_pool = None
    return _db_pool


class Database:
    def __init__(self):
        self.connection = None
        self.cursor = None

    def _connect(self):
        """Get a connection from pool or direct fallback"""
        if self.connection and self.connection.is_connected():
            return
        try:
            pool = get_pool()
            if pool:
                self.connection = pool.get_connection()
            else:
                self.connection = mysql.connector.connect(
                    host=Config.DB_HOST,
                    port=Config.DB_PORT,
                    database=Config.DB_NAME,
                    user=Config.DB_USER,
                    password=Config.DB_PASSWORD,
                    autocommit=True,
                    connect_timeout=5
                )
            self.cursor = self.connection.cursor(dictionary=True)
        except Error as e:
            logger.error(f"❌ Connection failed: {e}")
            self.connection = None
            self.cursor = None
            raise

    def execute_query(self, query, params=None):
        """Execute a query using pooled connection"""
        try:
            self._connect()
            self.cursor.execute(query, params or ())
            
            if query.strip().upper().startswith('SELECT'):
                result = self.cursor.fetchall()
            else:
                result = self.cursor.lastrowid
            
            self._close()
            return result
        except Error as e:
            logger.error(f"❌ Query error: {e}")
            self._close()
            raise

    def _close(self):
        """Return connection to pool"""
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
