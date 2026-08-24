import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # App
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    PORT = int(os.getenv('PORT', 5000))
    
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '3306')
    DB_NAME = os.getenv('DB_NAME', 'dental_inventory')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    
    # JWT
    JWT_SECRET = os.getenv('JWT_SECRET', 'dev_secret_key')
    JWT_EXPIRES_IN = int(os.getenv('JWT_EXPIRES_IN', 7))
    
    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')