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
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required'
                }
            }), 400
        
        return_type = data.get('type')
        inventory_id = data.get('inventory_id') or data.get('unit_id') or data.get('refNo') or data.get('ref_no')
        
        if not return_type or not inventory_id:
            missing = []
            if not return_type: missing.append('type')
            if not inventory_id: missing.append('inventory_id')
            return jsonify({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': f'Missing required fields: {", ".join(missing)}'
                }
            }), 400
        
        if return_type not in ['exchange', 'creditNote']:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Type must be exchange or creditNote'
                }
            }), 400
        
        # Check if inventory unit or item exists
        from models.inventory_unit import InventoryUnit
        from models.product import Product

        inventory_item = None
        unit = InventoryUnit.find_by_id(inventory_id)
        if unit:
            product = Product.find_by_ref_no(unit.ref_no)
            inventory_item = Inventory({
                'id': unit.id,
                'ref_no': unit.ref_no,
                'product_name': product.product_name if product else unit.ref_no,
                'category': product.category if product else 'General',
                'company_name': product.company_name if product else '',
                'size': product.size if product else '',
                'lot_no': product.lot_no if product else '',
                'quantity': unit.quantity,
                'is_returnable': product.is_returnable if product else True,
            })
        else:
            inventory_item = Inventory.find_by_id(inventory_id) or Inventory.find_by_ref_no(inventory_id)

        if not inventory_item and data.get('ref_no'):
            product = Product.find_by_ref_no(data['ref_no'])
            if product:
                inventory_item = Inventory({
                    'id': data.get('ref_no'),
                    'ref_no': product.ref_no,
                    'product_name': product.product_name,
                    'category': product.category,
                    'company_name': product.company_name,
                    'size': product.size,
                    'lot_no': product.lot_no,
                    'quantity': 1,
                    'is_returnable': product.is_returnable,
                })

        if not inventory_item and (data.get('product_name') or data.get('product')):
            prod_name = data.get('product_name') or data.get('product')
            inventory_item = Inventory({
                'id': inventory_id,
                'ref_no': data.get('ref_no') or inventory_id,
                'product_name': prod_name,
                'category': 'General',
                'company_name': '',
                'size': '',
                'lot_no': '',
                'quantity': 1,
                'is_returnable': True,
            })

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
            'type': return_type,
            'unit_id': inventory_id,
            'inventory_id': inventory_id,
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
            details=f"Created {return_type} return for {inventory_item.product_name} ({inventory_item.ref_no})",
            user_id=current_user.id if current_user else None,
            user_name=current_user.name if current_user else 'Admin'
        )
        
        return jsonify({
            'success': True,
            'data': vendor_return.to_dict(),
            'message': 'Vendor return created successfully'
        }), 201
    except Exception as e:
        print(f"❌ Error in create_return: {e}")
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500

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
    
    raw_status = str(data.get('status', '')).strip().lower().replace(' ', '_')
    status_map = {
        'pending': 'pending',
        'in_progress': 'in_progress',
        'inprogress': 'in_progress',
        'completed': 'completed',
        'rejected': 'rejected'
    }
    status = status_map.get(raw_status)
    if not status:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid status. Must be pending, in_progress, completed, or rejected'
            }
        }), 400
    
    current_user = request.current_user
    
    # If completing a credit note or providing credit note, store the credit note number
    provided_credit_note = data.get('credit_note') or data.get('creditNote')
    credit_note = provided_credit_note if provided_credit_note else (vendor_return.credit_note if status == 'completed' else None)
    
    # Handle completion for exchange type
    new_batch_no = data.get('new_batch_no') or data.get('newBatchNo')
    if status == 'completed' and vendor_return.type == 'exchange':
        if not new_batch_no and not vendor_return.new_batch_no:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'new_batch_no is required for exchange completion'
                }
            }), 400
    
    updated_return = vendor_return.update_status(status, credit_note_number=credit_note, new_batch_no=new_batch_no)
    
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

@returns_bp.route('/<return_id>', methods=['DELETE'])
@token_required
def delete_return(return_id):
    """Delete / remove a credit note or vendor return record"""
    vendor_return = VendorReturn.find_by_id(return_id)
    if not vendor_return:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Return record not found'
            }
        }), 404

    current_user = request.current_user
    vendor_return.delete()

    AuditLog.create(
        action='DELETE_RETURN',
        entity_type='VENDOR_RETURN',
        entity_id=return_id,
        details=f"Deleted return/credit note for {vendor_return.product_name} ({vendor_return.ref_no})",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )

    return jsonify({
        'success': True,
        'message': 'Return record deleted successfully'
    }), 200