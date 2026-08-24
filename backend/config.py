import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / '.env')

class Config:
    # App
    FLASK_ENV = os.getenv('FLASK_ENV')
    PORT = int(os.getenv('PORT'))
    
    # Database
    DB_HOST = os.getenv('DB_HOST')
    DB_PORT = os.getenv('DB_PORT')
    DB_NAME = os.getenv('DB_NAME')
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    
    # JWT
    JWT_SECRET = os.getenv('JWT_SECRET')
    JWT_EXPIRES_IN = int(os.getenv('JWT_EXPIRES_IN'))
    
    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL')