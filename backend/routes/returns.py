from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.vendor_return import VendorReturn
from models.inventory import Inventory
from models.audit_log import AuditLog
import datetime


returns_bp = Blueprint('returns', __name__, url_prefix='/api/returns')

@returns_bp.route('/', methods=['GET'])
@token_required
def get_returns():
    """Get all vendor returns"""
    items = VendorReturn.find_all()
    return jsonify({
        'success': True,
        'data': [item.to_dict() for item in items]
    }), 200

@returns_bp.route('/<return_id>', methods=['GET'])
@token_required
def get_return(return_id):
    """Get vendor return by ID"""
    item = VendorReturn.find_by_id(return_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Return record not found'
            }
        }), 404
    
    return jsonify({
        'success': True,
        'data': item.to_dict()
    }), 200

# ⭐ FIXED: Removed @admin_required - Staff can create returns
@returns_bp.route('/', methods=['POST'])
@token_required
def create_return():
    """Create a new vendor return"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    required = ['type', 'inventory_id']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': f'Missing required fields: {", ".join(missing)}'
            }
        }), 400
    
    if data['type'] not in ['exchange', 'creditNote']:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Type must be exchange or creditNote'
            }
        }), 400
    
    # Check if inventory item exists
    inventory_item = Inventory.find_by_id(data['inventory_id'])
    if not inventory_item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVENTORY_NOT_FOUND',
                'message': 'Inventory item not found'
            }
        }), 404
    
    current_user = request.current_user
    
    return_data = {
        'type': data['type'],
        'inventory_id': data['inventory_id'],
        'ref_no': inventory_item.ref_no,
        'product_name': inventory_item.product_name,
        'old_batch_no': inventory_item.lot_no,
        'new_batch_no': data.get('new_batch_no'),
        'quantity': data.get('quantity', 1),
        'reason': data.get('reason'),
        'return_date': data.get('return_date', datetime.date.today().isoformat()),
        'credit_note': data.get('credit_note'),
        'created_by': current_user.name if current_user else 'Admin'
    }
    
    vendor_return = VendorReturn.create(return_data)
    
    # Log the action
    AuditLog.create(
        action='CREATE_RETURN',
        entity_type='VENDOR_RETURN',
        entity_id=vendor_return.return_id,
        details=f"Created {data['type']} return for {inventory_item.product_name} ({inventory_item.ref_no})",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': vendor_return.to_dict(),
        'message': 'Vendor return created successfully'
    }), 201

# ⭐ FIXED: Removed @admin_required - Staff can update return status
@returns_bp.route('/<return_id>/status', methods=['PUT'])
@token_required
def update_return_status(return_id):
    """Update vendor return status"""
    vendor_return = VendorReturn.find_by_id(return_id)
    if not vendor_return:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Return record not found'
            }
        }), 404
    
    data = request.get_json()
    if not data or not data.get('status'):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Status is required'
            }
        }), 400
    
    status = data['status']
    if status not in ['pending', 'in_progress', 'completed', 'rejected']:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid status. Must be pending, in_progress, completed, or rejected'
            }
        }), 400
    
    current_user = request.current_user
    
    # If completing a credit note, store the credit note number
    credit_note = data.get('credit_note') if status == 'completed' and vendor_return.type == 'creditNote' else None
    
    # Handle completion for exchange type
    if status == 'completed' and vendor_return.type == 'exchange':
        if not data.get('new_batch_no'):
            return jsonify({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'new_batch_no is required for exchange completion'
                }
            }), 400
        
        # Update the vendor_return with new batch no
        vendor_return.new_batch_no = data['new_batch_no']
    
    updated_return = vendor_return.update_status(status, credit_note)
    
    # Log the action
    AuditLog.create(
        action='UPDATE_RETURN_STATUS',
        entity_type='VENDOR_RETURN',
        entity_id=return_id,
        details=f"Updated return status to {status} for {vendor_return.product_name}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': updated_return.to_dict(),
        'message': f'Return status updated to {status}'
    }), 200