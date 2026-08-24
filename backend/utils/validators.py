import re

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength (min 6 characters)"""
    return len(password) >= 6

def validate_login_data(email, password):
    """Validate login data"""
    errors = []
    
    if not email:
        errors.append("Email is required")
    elif not validate_email(email):
        errors.append("Invalid email format")
    
    if not password:
        errors.append("Password is required")
    elif not validate_password(password):
        errors.append("Password must be at least 6 characters")
    
    return errors