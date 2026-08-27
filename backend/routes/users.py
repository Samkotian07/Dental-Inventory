from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.user import User
import re

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

@users_bp.route('/', methods=['GET'])
@token_required
@admin_required
def get_users():
    """Get all users (Admin only)"""
    db = User.get_db()
    results = db.execute_query("""
        SELECT * 
        FROM users 
        ORDER BY created_at DESC
    """)
    users_data = [User(row).to_dict() for row in results]
    return jsonify({
        'success': True,
        'data': users_data
    }), 200

@users_bp.route('/<int:user_id>', methods=['GET'])
@token_required
@admin_required
def get_user(user_id):
    """Get user by ID (Admin only)"""
    user = User.find_by_id(user_id)
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

@users_bp.route('/', methods=['POST'])
@token_required
@admin_required
def create_user():
    """Create a new staff user (Admin only)"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    required = ['name', 'email', 'password']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': f'Missing required fields: {", ".join(missing)}'
            }
        }), 400
    
    email = data['email'].strip()
    if not re.match(EMAIL_REGEX, email):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid email address format'
            }
        }), 400
    
    if len(data['password']) < 6:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Password must be at least 6 characters'
            }
        }), 400
    
    existing = User.find_by_email(email)
    if existing:
        return jsonify({
            'success': False,
            'error': {
                'code': 'EMAIL_EXISTS',
                'message': 'Email already registered'
            }
        }), 400
    
    role = data.get('role', 'staff')
    if role not in ['admin', 'staff']:
        role = 'staff'
    
    user = User.create(
        name=data['name'].strip(),
        email=email,
        password=data['password'],
        role=role
    )
    
    return jsonify({
        'success': True,
        'data': user.to_dict(),
        'message': 'Staff member created successfully'
    }), 201

@users_bp.route('/<int:user_id>', methods=['PUT'])
@token_required
@admin_required
def update_user(user_id):
    """Update a user (Admin only)"""
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({
            'success': False,
            'error': {
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }
        }), 404
    
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    # Email uniqueness check if email is being updated
    if 'email' in data:
        email = data['email'].strip()
        if not re.match(EMAIL_REGEX, email):
            return jsonify({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid email address format'
                }
            }), 400
        
        existing = User.find_by_email_exclude_id(email, user_id)
        if existing:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'EMAIL_EXISTS',
                    'message': 'Email already registered by another user'
                }
            }), 400
        data['email'] = email

    # Prevent logged-in admin from demoting themselves
    if 'role' in data:
        if data['role'] not in ['admin', 'staff']:
            data['role'] = 'staff'
        if request.current_user.id == user_id and data['role'] != 'admin':
            return jsonify({
                'success': False,
                'error': {
                    'code': 'CANNOT_DEMOTE_SELF',
                    'message': 'You cannot remove your own admin role'
                }
            }), 400

    updated_user = user.update(data)
    
    return jsonify({
        'success': True,
        'data': updated_user.to_dict(),
        'message': 'Staff member updated successfully'
    }), 200

@users_bp.route('/<int:user_id>/password', methods=['PUT'])
@token_required
def update_user_password(user_id):
    """Update a user's password (Admin or self)"""
    current_user = request.current_user
    if current_user.role != 'admin' and current_user.id != user_id:
        return jsonify({
            'success': False,
            'error': {
                'code': 'FORBIDDEN',
                'message': 'You can only update your own password'
            }
        }), 403

    user = User.find_by_id(user_id)
    if not user:
        return jsonify({
            'success': False,
            'error': {
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }
        }), 404
    
    data = request.get_json()
    if not data or not data.get('password'):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'New password is required'
            }
        }), 400
    
    if len(data['password']) < 6:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Password must be at least 6 characters'
            }
        }), 400
    
    user.update_password(data['password'])
    
    return jsonify({
        'success': True,
        'message': 'Password updated successfully'
    }), 200

@users_bp.route('/<int:user_id>/status', methods=['PUT'])
@token_required
@admin_required
def toggle_user_status(user_id):
    """Toggle user status (Admin only)"""
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({
            'success': False,
            'error': {
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }
        }), 404
    
    # Prevent deactivating admin accounts
    if user.role == 'admin':
        return jsonify({
            'success': False,
            'error': {
                'code': 'CANNOT_DEACTIVATE_ADMIN',
                'message': 'Admin accounts cannot be deactivated'
            }
        }), 400
    
    # Prevent self-deactivation
    if request.current_user.id == user_id:
        return jsonify({
            'success': False,
            'error': {
                'code': 'CANNOT_DEACTIVATE_SELF',
                'message': 'You cannot deactivate your own account'
            }
        }), 400
    
    new_status = 'inactive' if user.status == 'active' else 'active'
    user.update({'status': new_status})
    
    return jsonify({
        'success': True,
        'data': user.to_dict(),
        'message': f'User status changed to {new_status}'
    }), 200

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(user_id):
    """Delete a user (Admin only)"""
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({
            'success': False,
            'error': {
                'code': 'USER_NOT_FOUND',
                'message': 'User not found'
            }
        }), 404
    
    # Safeguard 1: Admin accounts cannot be deleted
    if user.role == 'admin':
        return jsonify({
            'success': False,
            'error': {
                'code': 'CANNOT_DELETE_ADMIN',
                'message': 'Admin accounts cannot be deleted'
            }
        }), 400
    
    # Safeguard 2: Logged-in user cannot delete themselves
    if request.current_user.id == user_id:
        return jsonify({
            'success': False,
            'error': {
                'code': 'CANNOT_DELETE_SELF',
                'message': 'You cannot delete your own account'
            }
        }), 400
    
    db = User.get_db()
    db.execute_query("DELETE FROM users WHERE id = %s", (user_id,))
    
    return jsonify({
        'success': True,
        'message': 'Staff member deleted successfully'
    }), 200