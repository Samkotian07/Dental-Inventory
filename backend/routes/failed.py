from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.failed_inventory import FailedInventory
from models.inventory import Inventory
from models.audit_log import AuditLog
import datetime

failed_bp = Blueprint('failed', __name__, url_prefix='/api/failed-inventory')

@failed_bp.route('/', methods=['GET'])
@token_required
def get_failed_items():
    """Get all failed inventory items"""
    items = FailedInventory.find_all()
    return jsonify({
        'success': True,
        'data': [item.to_dict() for item in items]
    }), 200

@failed_bp.route('/<failed_id>', methods=['GET'])
@token_required
def get_failed_item(failed_id):
    """Get failed item by ID"""
    item = FailedInventory.find_by_id(failed_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Failed inventory item not found'
            }
        }), 404
    
    return jsonify({
        'success': True,
        'data': item.to_dict()
    }), 200

# ⭐ FIXED: Removed @admin_required - Staff can move to failed
@failed_bp.route('/', methods=['POST'])
@token_required
def create_failed_item():
    """Move an item to failed inventory"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    inventory_id = data.get('inventory_id') or data.get('unit_id') or data.get('refNo') or data.get('ref_no')
    failure_reason = data.get('failure_reason') or data.get('reason')
    
    if not inventory_id or not failure_reason:
        missing = []
        if not inventory_id: missing.append('inventory_id')
        if not failure_reason: missing.append('failure_reason')
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': f'Missing required fields: {", ".join(missing)}'
            }
        }), 400
    
    # Check if inventory item or unit exists
    inventory_item = Inventory.find_by_id(inventory_id)
    if not inventory_item:
        try:
            from models.inventory_unit import InventoryUnit
            unit = InventoryUnit.find_by_id(inventory_id)
            if unit:
                from models.product import Product
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
        except Exception:
            pass

    if not inventory_item:
        inventory_item = Inventory.find_by_ref_no(inventory_id)

    if not inventory_item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVENTORY_NOT_FOUND',
                'message': 'Inventory item not found'
            }
        }), 404
    
    # Check if item is already in failed inventory
    existing = FailedInventory.find_by_id(data.get('id'))
    if existing:
        return jsonify({
            'success': False,
            'error': {
                'code': 'ALREADY_FAILED',
                'message': 'Item already in failed inventory'
            }
        }), 400
    
    current_user = request.current_user
    
    # Create failed inventory entry
    failed_data = {
        'ref_no': inventory_item.ref_no,
        'product_name': inventory_item.product_name,
        'category': inventory_item.category,
        'company_name': inventory_item.company_name,
        'size': inventory_item.size,
        'lot_no': inventory_item.lot_no,
        'quantity': data.get('quantity', inventory_item.quantity),
        'expiry_date': inventory_item.expiry_date,
        'failure_reason': failure_reason,
        'unit_id': inventory_id,
        'original_inventory_id': inventory_item.id or inventory_id,
        'moved_by': current_user.name if current_user else 'Admin'
    }
    
    failed_item = FailedInventory.create(failed_data)
    
    # Log the action
    AuditLog.create(
        action='MOVE_TO_FAILED',
        entity_type='FAILED_INVENTORY',
        entity_id=failed_item.id,
        details=f"Moved {inventory_item.product_name} ({inventory_item.ref_no}) to failed inventory. Reason: {data['failure_reason']}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': failed_item.to_dict(),
        'message': 'Item moved to failed inventory'
    }), 201

# ⭐ FIXED: Removed @admin_required - Staff can mark sent to vendor
@failed_bp.route('/<failed_id>/sent-to-vendor', methods=['PUT'])
@token_required
def mark_sent_to_vendor(failed_id):
    """Mark failed item as sent to vendor"""
    item = FailedInventory.find_by_id(failed_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Failed inventory item not found'
            }
        }), 404
    
    updated_item = item.mark_sent_to_vendor()
    
    current_user = request.current_user
    AuditLog.create(
        action='SENT_TO_VENDOR',
        entity_type='FAILED_INVENTORY',
        entity_id=failed_id,
        details=f"Marked {item.product_name} ({item.ref_no}) as sent to vendor",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': updated_item.to_dict(),
        'message': 'Item marked as sent to vendor'
    }), 200

# ⭐ FIXED: Removed @admin_required - Staff can restore failed item
@failed_bp.route('/<failed_id>/restore', methods=['PUT'])
@token_required
def restore_failed_item(failed_id):
    """Restore a failed item back to inventory"""
    item = FailedInventory.find_by_id(failed_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Failed inventory item not found'
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
    
    if not data.get('inventory_data'):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'inventory_data is required'
            }
        }), 400
    
    current_user = request.current_user
    
    # Create new inventory item with updated details
    inv_data = data['inventory_data']
    inv_data['created_by'] = current_user.name if current_user else 'Admin'
    inv_data['document_type'] = 'restored'
    inv_data['document_number'] = f"REST-{failed_id}"
    
    new_inventory = Inventory.create(inv_data)
    
    # Update failed item status
    updated_item = item.mark_restored(new_inventory.id)
    
    # Log the action
    AuditLog.create(
        action='RESTORE',
        entity_type='FAILED_INVENTORY',
        entity_id=failed_id,
        details=f"Restored {item.product_name} ({item.ref_no}) back to inventory with new ID: {new_inventory.id}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': {
            'failed_item': updated_item.to_dict(),
            'new_inventory': new_inventory.to_dict()
        },
        'message': 'Item restored to inventory successfully'
    }), 200

# ⭐ FIXED: Removed @admin_required - Staff can dispose failed item
@failed_bp.route('/<failed_id>/dispose', methods=['PUT'])
@token_required
def dispose_failed_item(failed_id):
    """Dispose a failed item"""
    item = FailedInventory.find_by_id(failed_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Failed inventory item not found'
            }
        }), 404
    
    updated_item = item.mark_disposed()
    
    current_user = request.current_user
    AuditLog.create(
        action='DISPOSE',
        entity_type='FAILED_INVENTORY',
        entity_id=failed_id,
        details=f"Disposed {item.product_name} ({item.ref_no})",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': updated_item.to_dict(),
        'message': 'Item disposed successfully'
    }), 200