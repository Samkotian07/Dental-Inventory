import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / '.env')

class Config:
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    PORT = int(os.getenv('PORT', 5000))
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', 3306)
    DB_NAME = os.getenv('DB_NAME', 'yendental')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    JWT_SECRET = os.getenv('JWT_SECRET', 'yendental-secret-key-2024')
    JWT_EXPIRES_IN = int(os.getenv('JWT_EXPIRES_IN', 7))
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')