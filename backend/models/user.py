from database.db import Database
import bcrypt
import jwt
import datetime
from config import Config

class User:
    def __init__(self, data):
        self.id = data.get('id')
        self.name = data.get('name')
        self.email = data.get('email')
        self.password_hash = data.get('password_hash')
        self.role = data.get('role', 'staff')
        self.status = data.get('status', 'active')
        self.created_at = data.get('created_at')
    
    @staticmethod
    def get_db():
        return Database()
    
    @staticmethod
    def hash_password(password):
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password, password_hash):
        """Verify a password against a hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except ValueError:
            return False
    
    @staticmethod
    def generate_token(user_data):
        """Generate JWT token for a user"""
        payload = {
            'user_id': user_data['id'],
            'email': user_data['email'],
            'role': user_data['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=Config.JWT_EXPIRES_IN)
        }
        return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """Verify and decode a JWT token"""
        try:
            return jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @classmethod
    def find_by_email(cls, email):
        """Find a user by email"""
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM users WHERE email = %s",
            (email,)
        )
        if result:
            return cls(result[0])
        return None
    
    @classmethod
    def find_by_id(cls, user_id):
        """Find a user by ID"""
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM users WHERE id = %s",
            (user_id,)
        )
        if result:
            return cls(result[0])
        return None
    
    @classmethod
    def create(cls, name, email, password, role='staff'):
        """Create a new user"""
        db = cls.get_db()
        password_hash = cls.hash_password(password)
        
        user_id = db.execute_query(
            """INSERT INTO users (name, email, password_hash, role, status, created_at)
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            (name, email, password_hash, role, 'active')
        )
        
        return cls.find_by_id(user_id)
    
    def update(self, data):
        """Update user data"""
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['name', 'email', 'role', 'status']
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return self
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        params.append(self.id)
        
        db.execute_query(query, tuple(params))
        return User.find_by_id(self.id)
    
    def update_password(self, new_password):
        """Update user password"""
        db = self.get_db()
        password_hash = self.hash_password(new_password)
        db.execute_query(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, self.id)
        )
        return True
    
    def to_dict(self):
        """Convert user to dictionary (excludes sensitive data)"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }