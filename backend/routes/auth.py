from flask import Blueprint, request, jsonify
from models.user import User
from models.audit_log import AuditLog
from utils.validators import validate_login_data
from middleware.rate_limiter import rate_limit
import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
@rate_limit(limit=5, period=60)
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
    
    # ⭐ LOG THE LOGIN ACTION
    AuditLog.create(
        action='LOGIN',
        entity_type='USER',
        entity_id=str(user.id),
        details=f'User {user.name} logged in successfully',
        user_id=user.id,
        user_name=user.name
    )
    
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
    """Logout user (server-side token revocation & audit logging)"""
    from middleware.auth import token_required
    
    @token_required
    def _logout():
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if token:
            User.blacklist_token(token, request.current_user.id)
        
        # ⭐ LOG THE LOGOUT ACTION
        AuditLog.create(
            action='LOGOUT',
            entity_type='USER',
            entity_id=str(request.current_user.id),
            details=f'User {request.current_user.name} logged out',
            user_id=request.current_user.id,
            user_name=request.current_user.name
        )
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    return _logout()


@auth_bp.route('/logout-all', methods=['POST'])
def logout_all():
    """Logout user from all devices"""
    from middleware.auth import token_required
    
    @token_required
    def _logout_all():
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if token:
            User.blacklist_token(token, request.current_user.id)
            
        User.revoke_all_user_tokens(request.current_user.id)
        
        # ⭐ LOG THE LOGOUT ALL ACTION
        AuditLog.create(
            action='LOGOUT_ALL',
            entity_type='USER',
            entity_id=str(request.current_user.id),
            details=f'User {request.current_user.name} logged out of all devices',
            user_id=request.current_user.id,
            user_name=request.current_user.name
        )
        
        return jsonify({
            'success': True,
            'message': 'Logged out of all devices successfully'
        }), 200
        
    return _logout_all()


@auth_bp.route('/change-password', methods=['POST'])
@rate_limit(limit=5, period=60)
def change_password():
    """Change current user password with current password verification"""
    from middleware.auth import token_required

    @token_required
    def _change_password():
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required'
                }
            }), 400

        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Both current and new passwords are required'
                }
            }), 400

        user = User.find_by_id(request.current_user.id)
        if not user:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404

        # Verify current password
        if not User.verify_password(current_password, user.password_hash):
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_PASSWORD',
                    'message': 'Current password is incorrect'
                }
            }), 400

        if len(new_password) < 6:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'New password must be at least 6 characters'
                }
            }), 400

        user.update_password(new_password)

        AuditLog.create(
            action='CHANGE_PASSWORD',
            entity_type='USER',
            entity_id=str(user.id),
            details=f'User {user.name} changed their password',
            user_id=user.id,
            user_name=user.name
        )

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200

    return _change_password()