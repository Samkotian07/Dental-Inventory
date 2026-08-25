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
        self.token_version = data.get('token_version', 1)
    
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

    @classmethod
    def _ensure_token_blacklist_table(cls):
        """Ensure token_blacklist table exists"""
        try:
            db = cls.get_db()
            db.execute_query("""
                CREATE TABLE IF NOT EXISTS token_blacklist (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    token VARCHAR(512) NOT NULL,
                    user_id INT,
                    blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_token (token(255))
                )
            """)
        except Exception as e:
            print(f"Error ensuring token_blacklist table: {e}")

    @classmethod
    def blacklist_token(cls, token, user_id=None):
        """Blacklist a single token"""
        try:
            cls._ensure_token_blacklist_table()
            db = cls.get_db()
            db.execute_query(
                "INSERT INTO token_blacklist (token, user_id) VALUES (%s, %s)",
                (token, user_id)
            )
            return True
        except Exception as e:
            print(f"Error blacklisting token: {e}")
            return False

    @classmethod
    def is_token_blacklisted(cls, token):
        """Check if a token is in the blacklist"""
        try:
            cls._ensure_token_blacklist_table()
            db = cls.get_db()
            result = db.execute_query(
                "SELECT id FROM token_blacklist WHERE token = %s",
                (token,)
            )
            return bool(result)
        except Exception:
            return False

    @classmethod
    def revoke_all_user_tokens(cls, user_id):
        """Revoke all tokens for a user by blacklisting or updating token_version if column exists"""
        try:
            db = cls.get_db()
            # Attempt to add token_version column if missing, then increment
            try:
                db.execute_query("ALTER TABLE users ADD COLUMN token_version INT DEFAULT 1")
            except Exception:
                pass # Column likely exists
            
            db.execute_query(
                "UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = %s",
                (user_id,)
            )
            return True
        except Exception as e:
            print(f"Error revoking all user tokens: {e}")
            return False
    
    @classmethod
    def generate_token(cls, user_data):
        """Generate JWT token for a user"""
        user_id = user_data['id']
        token_version = user_data.get('token_version', 1)
        
        # If user has token_version in db, fetch it
        user = cls.find_by_id(user_id)
        if user and getattr(user, 'token_version', None) is not None:
            token_version = user.token_version

        payload = {
            'user_id': user_id,
            'email': user_data['email'],
            'role': user_data['role'],
            'token_version': token_version,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=Config.JWT_EXPIRES_IN)
        }
        return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')
    
    @classmethod
    def verify_token(cls, token):
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
            if cls.is_token_blacklisted(token):
                return None
            
            # Check user token_version if present
            if 'token_version' in payload:
                user = cls.find_by_id(payload['user_id'])
                if user and getattr(user, 'token_version', None) is not None:
                    if payload['token_version'] < user.token_version:
                        return None

            return payload
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
    def find_by_email_exclude_id(cls, email, exclude_id):
        """Find a user by email excluding a specific user ID"""
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM users WHERE email = %s AND id != %s",
            (email, exclude_id)
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