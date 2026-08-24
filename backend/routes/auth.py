from flask import Blueprint, request, jsonify
from models.user import User
from utils.validators import validate_login_data
import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    # Validate input
    errors = validate_login_data(email, password)
    if errors:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': errors[0],
                'details': errors
            }
        }), 400
    
    # Find user by email
    user = User.find_by_email(email)
    if not user:
        return jsonify({
            'success': False,
            'error': {
                'code': 'USER_NOT_FOUND',
                'message': 'Invalid email or password'
            }
        }), 401
    
    # Check password
    if not User.verify_password(password, user.password_hash):
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_CREDENTIALS',
                'message': 'Invalid email or password'
            }
        }), 401
    
    # Check user status
    if user.status != 'active':
        return jsonify({
            'success': False,
            'error': {
                'code': 'ACCOUNT_INACTIVE',
                'message': 'Your account is inactive. Please contact admin.'
            }
        }), 403
    
    # Generate token
    user_dict = user.to_dict()
    token = User.generate_token({
        'id': user.id,
        'email': user.email,
        'role': user.role
    })
    
    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user_dict
        },
        'message': f'Welcome back, {user.name}!'
    }), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user"""
    from middleware.auth import token_required
    
    # This route uses token_required as a function
    # We'll handle it with a decorator
    
    token = None
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
    
    payload = User.verify_token(token)
    if not payload:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_TOKEN',
                'message': 'Invalid or expired token'
            }
        }), 401
    
    user = User.find_by_id(payload['user_id'])
    if not user:
        return jsonify({
            'success': False,
            'error': {
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }
        }), 404
    
    return jsonify({
        'success': True,
        'data': user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user (client-side token removal)"""
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200