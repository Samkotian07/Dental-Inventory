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
    move_qty = int(data.get('quantity', 1))
    
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
    
    from models.inventory_unit import InventoryUnit
    from models.product import Product
    from database.db import Database
    db = Database()

    inventory_item = None
    unit = InventoryUnit.find_by_id(inventory_id)
    if unit:
        product = Product.find_by_ref_no(unit.ref_no)
        inventory_item = Inventory({
            'id': unit.unit_id,
            'ref_no': unit.ref_no,
            'product_name': product.get_product_name() if product else unit.ref_no,
            'category': product.get_category() if product else 'General',
            'company_name': product.company_name if product else '',
            'size': product.get_size() if product else '',
            'lot_no': product.lot_no if product else '',
            'quantity': unit.quantity,
            'expiry_date': product.expiry_date if product else None,
            'is_returnable': product.get_is_returnable() if product else True,
        })
    else:
        units = InventoryUnit.find_by_ref_no(inventory_id)
        if not units:
            res_units = db.execute_query(
                "SELECT * FROM inventory_units WHERE unit_id LIKE %s OR ref_no LIKE %s LIMIT 10",
                (f"{inventory_id}%", f"{inventory_id}%")
            )
            if res_units:
                units = [InventoryUnit(r) for r in res_units]

        if units:
            unit = units[0]
            product = Product.find_by_ref_no(unit.ref_no)
            inventory_item = Inventory({
                'id': unit.unit_id,
                'ref_no': unit.ref_no,
                'product_name': product.get_product_name() if product else unit.ref_no,
                'category': product.get_category() if product else 'General',
                'company_name': product.company_name if product else '',
                'size': product.get_size() if product else '',
                'lot_no': product.lot_no if product else '',
                'quantity': sum(u.quantity for u in units),
                'expiry_date': product.expiry_date if product else None,
                'is_returnable': product.get_is_returnable() if product else True,
            })
        else:
            inventory_item = Inventory.find_by_id(inventory_id) or Inventory.find_by_ref_no(inventory_id)

    # Fallback to payload data if item record not found in inventory tables
    if not inventory_item and (data.get('product_name') or data.get('productName') or data.get('ref_no') or data.get('refNo')):
        ref = data.get('ref_no') or data.get('refNo') or inventory_id
        name = data.get('product_name') or data.get('productName') or ref
        inventory_item = Inventory({
            'id': inventory_id,
            'ref_no': ref,
            'product_name': name,
            'category': data.get('category') or 'General',
            'company_name': data.get('company_name') or data.get('companyName') or '',
            'size': data.get('size') or '',
            'lot_no': data.get('lot_no') or data.get('lotNo') or '',
            'quantity': move_qty,
            'expiry_date': data.get('expiry_date') or data.get('expiryDate'),
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
    
    failed_data = {
        'ref_no': inventory_item.ref_no,
        'product_name': inventory_item.product_name,
        'category': inventory_item.category,
        'company_name': inventory_item.company_name,
        'size': inventory_item.size,
        'lot_no': inventory_item.lot_no,
        'quantity': move_qty,
        'failure_reason': failure_reason,
        'unit_id': unit.unit_id if unit else inventory_id,
        'original_inventory_id': unit.unit_id if unit else inventory_id,
        'moved_by': current_user.name if current_user else 'Admin'
    }
    
    failed_item = FailedInventory.create(failed_data)
    
    AuditLog.create(
        action='MOVE_TO_FAILED',
        entity_type='FAILED_INVENTORY',
        entity_id=failed_item.id,
        details=f"Moved {move_qty} unit(s) of {inventory_item.product_name} ({inventory_item.ref_no}) to failed inventory. Reason: {failure_reason}",
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