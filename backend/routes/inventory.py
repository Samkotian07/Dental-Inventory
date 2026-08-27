from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from middleware.rate_limiter import rate_limit
from models.inventory import Inventory
from models.issued_item import IssuedItem
from models.audit_log import AuditLog
import datetime

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')


# ⭐⭐⭐ PUBLIC ENDPOINT - NO AUTH REQUIRED ⭐⭐⭐
# This must be at the TOP to avoid route conflicts with /<item_id>
@inventory_bp.route('/public-history/<ref_no>', methods=['GET'])
@rate_limit(limit=30, period=60)
def get_public_product_history(ref_no):
    """Public endpoint to get product details and full cycle history by ref_no (No auth required for QR scans)"""
    try:
        print(f"🔍 QR SCAN: Looking for ref_no: {ref_no}")
        
        # Try multiple ways to find the item
        item = Inventory.find_by_ref_no(ref_no)
        if not item:
            print(f"   ⚠️ Not found by ref_no, trying by id...")
            item = Inventory.find_by_id(ref_no)
        if not item:
            print(f"   ⚠️ Not found by id, trying case-insensitive...")
            db = Inventory.get_db()
            results = db.execute_query(
                "SELECT * FROM inventory WHERE LOWER(ref_no) = LOWER(%s) OR LOWER(id) = LOWER(%s) LIMIT 1",
                (ref_no, ref_no)
            )
            if results:
                item = Inventory(results[0])
                print(f"   ✅ Found with case-insensitive: {item.ref_no}")
        
        if not item:
            print(f"❌ Item NOT FOUND for: {ref_no}")
            return jsonify({
                'success': False,
                'message': f'Product with reference {ref_no} not found'
            }), 404

        db = Inventory.get_db()
        inv_id = item.id if item else ref_no
        
        # Get issued history
        sql = """
            SELECT * FROM issued_items 
            WHERE LOWER(ref_no) = LOWER(%s) OR LOWER(inventory_id) = LOWER(%s)
            ORDER BY created_at ASC
        """
        results = db.execute_query(sql, (ref_no, str(inv_id)))
        issued_list = [IssuedItem(row).to_dict() for row in results]
        
        print(f"   ✅ Found {len(issued_list)} issued records for {ref_no}")

        # Build product dict
        product_dict = item.to_dict()

        # Build cycle history
        cycles = []
        for idx, iss in enumerate(issued_list, 1):
            status_str = str(iss.get('status') or '').lower()
            if status_str == 'returned':
                status_label = '✅ Complete'
            elif status_str == 'condemned':
                status_label = '❌ Condemned'
            else:
                status_label = '🔄 Current'

            cycles.append({
                'cycle': idx,
                'student': iss.get('studentName') or iss.get('student') or 'Student',
                'studentId': iss.get('studentId') or '',
                'issued': iss.get('issueDate') or iss.get('createdAt') or '—',
                'returned': iss.get('returnDate') if status_str in ['returned', 'condemned'] else 'NULL',
                'status': status_label,
                'rawStatus': status_str
            })

        print(f"✅ QR SCAN SUCCESS: {len(cycles)} cycles found for {ref_no}")

        return jsonify({
            'success': True,
            'product': product_dict,
            'history': cycles,
            'summary': f"Summary: {len(cycles)} {'cycle' if len(cycles) == 1 else 'cycles'}"
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_public_product_history: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f"Error loading history for {ref_no}"
        }), 500


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
def create_inventory_item():
    """Create a new inventory item"""
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
def update_inventory_item(item_id):
    """Update an inventory item"""
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
def toggle_inventory_status(item_id):
    """Toggle inventory item status"""
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


@inventory_bp.route('/<item_id>', methods=['DELETE'])
@token_required
def delete_inventory_item(item_id):
    """Permanently delete an inventory item."""
    item = Inventory.find_by_id(item_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Inventory item not found'
            }
        }), 404

    current_user = request.current_user
    item.delete()
    AuditLog.create(
        action='DELETE',
        entity_type='INVENTORY',
        entity_id=item_id,
        details=f"Deleted inventory item: {item.product_name} ({item.ref_no})",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )

    return jsonify({
        'success': True,
        'message': 'Inventory item deleted successfully'
    }), 200