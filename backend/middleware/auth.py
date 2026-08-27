from functools import wraps
from flask import request, jsonify
from models.user import User

def token_required(f):
    """Decorator to require authentication token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Authentication token is missing'
                }
            }), 401
        
        # Verify token
        payload = User.verify_token(token)
        if not payload:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired token'
                }
            }), 401
        
        # Get user from database
        user = User.find_by_id(payload['user_id'])
        if not user:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        if user.status != 'active':
            return jsonify({
                'success': False,
                'error': {
                    'code': 'USER_INACTIVE',
                    'message': 'User account is inactive'
                }
            }), 403
        
        # ⭐ Add user to request context
        request.current_user = user
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.current_user.role != 'admin':
            return jsonify({
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Admin access required'
                }
            }), 403
        return f(*args, **kwargs)
    
    return decorated


# ⭐ NEW: Helper function to get current user safely
def get_current_user():
    """Get current user from request context or token"""
    if hasattr(request, 'current_user') and request.current_user:
        return request.current_user
    
    # Try to get from token
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = User.verify_token(token)
        if payload:
            user = User.find_by_id(payload['user_id'])
            if user:
                request.current_user = user
                return user
    
    return None


# ⭐ NEW: Helper to get user name for audit logs
def get_user_name():
    """Get current user name for audit logs"""
    user = get_current_user()
    return user.name if user else 'System'