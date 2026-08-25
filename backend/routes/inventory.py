from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.inventory import Inventory
from models.audit_log import AuditLog
import datetime

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')

@inventory_bp.route('/', methods=['GET'])
@token_required
def get_inventory():
    """Get all inventory items"""
    items = Inventory.find_all()
    return jsonify({
        'success': True,
        'data': [item.to_dict() for item in items]
    }), 200

@inventory_bp.route('/low-stock', methods=['GET'])
@token_required
def get_low_stock():
    """Get low stock items"""
    items = Inventory.find_low_stock()
    return jsonify({
        'success': True,
        'data': [item.to_dict() for item in items]
    }), 200

@inventory_bp.route('/<item_id>', methods=['GET'])
@token_required
def get_inventory_item(item_id):
    """Get inventory item by ID"""
    item = Inventory.find_by_id(item_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Inventory item not found'
            }
        }), 404
    
    return jsonify({
        'success': True,
        'data': item.to_dict()
    }), 200

@inventory_bp.route('/', methods=['POST'])
@token_required
@admin_required
def create_inventory_item():
    """Create a new inventory item (Admin only)"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    required = ['product_name', 'category', 'lot_no']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': f'Missing required fields: {", ".join(missing)}'
            }
        }), 400
    
    # Check if ref_no already exists
    if data.get('ref_no'):
        existing = Inventory.find_by_ref_no(data['ref_no'])
        if existing:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'REF_NO_EXISTS',
                    'message': 'Reference number already exists'
                }
            }), 400
    
    # Get current user from request context
    current_user = request.current_user
    data['created_by'] = current_user.name if current_user else 'Admin'
    
    item = Inventory.create(data)
    
    # Log the action
    AuditLog.create(
        action='CREATE',
        entity_type='INVENTORY',
        entity_id=item.id,
        details=f"Created inventory item: {item.product_name} ({item.ref_no})",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': item.to_dict(),
        'message': 'Inventory item created successfully'
    }), 201

@inventory_bp.route('/<item_id>', methods=['PUT'])
@token_required
@admin_required
def update_inventory_item(item_id):
    """Update an inventory item (Admin only)"""
    item = Inventory.find_by_id(item_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Inventory item not found'
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
    
    updated_item = item.update(data)
    
    # Log the action
    current_user = request.current_user
    AuditLog.create(
        action='UPDATE',
        entity_type='INVENTORY',
        entity_id=item_id,
        details=f"Updated inventory item: {item.product_name} ({item.ref_no})",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': updated_item.to_dict(),
        'message': 'Inventory item updated successfully'
    }), 200

@inventory_bp.route('/<item_id>/status', methods=['PUT'])
@token_required
@admin_required
def toggle_inventory_status(item_id):
    """Toggle inventory item status (Admin only)"""
    item = Inventory.find_by_id(item_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Inventory item not found'
            }
        }), 404
    
    new_status = 'inactive' if item.status == 'active' else 'active'
    updated_item = item.update({'status': new_status})
    
    current_user = request.current_user
    AuditLog.create(
        action='UPDATE',
        entity_type='INVENTORY',
        entity_id=item_id,
        details=f"Toggled inventory status to {new_status}: {item.product_name} ({item.ref_no})",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': updated_item.to_dict(),
        'message': f'Inventory status changed to {new_status}'
    }), 200