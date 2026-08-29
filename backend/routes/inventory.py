from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.inventory import Inventory
from models.product import Product
from models.inventory_unit import InventoryUnit
from models.issued_item import IssuedItem
from models.audit_log import AuditLog
import datetime

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')


# ⭐⭐⭐ PUBLIC ENDPOINT - NO AUTH REQUIRED ⭐⭐⭐
@inventory_bp.route('/public-history/<ref_no>', methods=['GET'])
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
        
        # Get issued history - include all units with this ref_no
        sql = """
            SELECT * FROM issued_items 
            WHERE LOWER(ref_no) = LOWER(%s) OR LOWER(unit_id) = LOWER(%s)
            ORDER BY created_at ASC
        """
        results = db.execute_query(sql, (ref_no, str(inv_id)))
        issued_list = [IssuedItem(row).to_dict() for row in results]
        
        print(f"   ✅ Found {len(issued_list)} issued records for {ref_no}")

        # Build product dict
        product_dict = item.to_dict()

        # ⭐ Build cycle history with unit tracking
        cycles = []
        for idx, iss in enumerate(issued_list, 1):
            status_str = str(iss.get('status') or '').lower()
            if status_str == 'returned':
                status_label = '✅ Complete'
            elif status_str == 'condemned':
                status_label = '❌ Condemned'
            else:
                status_label = '🔄 Current'

            # ⭐ CRITICAL: Get the unit_id
            inventory_id = iss.get('unitId') or iss.get('unit_id') or iss.get('inventoryId') or iss.get('inventory_id') or '—'

            cycles.append({
                'cycle': idx,
                'student': iss.get('studentName') or iss.get('student') or 'Student',
                'studentId': iss.get('studentId') or '',
                'unitId': inventory_id,  # ⭐ ADDED: Individual unit ID
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


# ⭐⭐⭐ NEW: Endpoint for individual unit history ⭐⭐⭐
@inventory_bp.route('/unit-history/<unit_id>', methods=['GET'])
def get_unit_history(unit_id):
    """Public endpoint to get history for a SPECIFIC UNIT (by unit_id)"""
    try:
        print(f"🔍 UNIT HISTORY: Looking for unit_id: {unit_id}")
        
        # Find the specific unit
        item = Inventory.find_by_id(unit_id)
        if not item:
            print(f"❌ Unit NOT FOUND for: {unit_id}")
            return jsonify({
                'success': False,
                'message': f'Unit with ID {unit_id} not found'
            }), 404

        db = Inventory.get_db()
        
        # Get history for THIS SPECIFIC UNIT only
        sql = """
            SELECT * FROM issued_items 
            WHERE unit_id = %s
            ORDER BY created_at ASC
        """
        results = db.execute_query(sql, (unit_id,))
        issued_list = [IssuedItem(row).to_dict() for row in results]
        
        print(f"   ✅ Found {len(issued_list)} records for unit {unit_id}")

        # Build product dict
        product_dict = item.to_dict()
        product_dict['unitId'] = unit_id

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

        # Build summary
        total = len(cycles)
        returned = sum(1 for c in cycles if c['rawStatus'] == 'returned')
        condemned = sum(1 for c in cycles if c['rawStatus'] == 'condemned')
        current = sum(1 for c in cycles if c['rawStatus'] not in ['returned', 'condemned'])

        summary = f"Summary: {total} cycles → {returned} returned → {condemned} condemned → {current} current"

        return jsonify({
            'success': True,
            'product': product_dict,
            'history': cycles,
            'summary': summary
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_unit_history: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f"Error loading history for unit {unit_id}"
        }), 500


# ============ PRODUCT ENDPOINTS ============

@inventory_bp.route('/products', methods=['GET'])
@token_required
def get_products():
    """Get all products"""
    try:
        products = Product.find_all()
    except Exception as e:
        print(f"Product fetch fallback to Inventory: {e}")
        products = Inventory.find_all()
    return jsonify({
        'success': True,
        'data': [p.to_dict() for p in products]
    }), 200


@inventory_bp.route('/products', methods=['POST'])
@token_required
def create_product():
    """Create a new product"""
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': {'code': 'INVALID_REQUEST', 'message': 'Request body is required'}
        }), 400

    required = ['ref_no', 'product_name']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({
            'success': False,
            'error': {'code': 'VALIDATION_ERROR', 'message': f'Missing required fields: {", ".join(missing)}'}
        }), 400

    try:
        product = Product.create(data)
    except Exception as e:
        print(f"Product create fallback to Inventory: {e}")
        product = Inventory.create(data)

    return jsonify({'success': True, 'data': product.to_dict()}), 201


# ============ INVENTORY UNIT ENDPOINTS ============

@inventory_bp.route('/', methods=['GET'])
@token_required
def get_inventory():
    """Get all inventory units"""
    try:
        units = InventoryUnit.find_all()
        return jsonify({
            'success': True,
            'data': [u.to_dict() for u in units]
        }), 200
    except Exception as e:
        print(f"InventoryUnit fetch error: {e}")
        try:
            units = Inventory.find_all()
            return jsonify({
                'success': True,
                'data': [u.to_dict() for u in units]
            }), 200
        except Exception as inner_e:
            print(f"Inventory fetch fallback error: {inner_e}")
            return jsonify({
                'success': True,
                'data': []
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


@inventory_bp.route('/<unit_id>', methods=['GET'])
@token_required
def get_inventory_unit(unit_id):
    """Get inventory unit by ID"""
    unit = None
    try:
        unit = InventoryUnit.find_by_id(unit_id)
    except Exception:
        pass

    if not unit:
        unit = Inventory.find_by_id(unit_id)

    if not unit:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Unit not found'
            }
        }), 404
    
    return jsonify({
        'success': True,
        'data': unit.to_dict()
    }), 200


@inventory_bp.route('/', methods=['POST'])
@token_required
def create_inventory_unit():
    """Create a new inventory unit"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    current_user = request.current_user
    data['created_by'] = current_user.name if current_user else 'Admin'
    
    try:
        unit = InventoryUnit.create(data)
    except Exception as e:
        print(f"InventoryUnit create fallback: {e}")
        unit = Inventory.create(data)
    
    # Log action
    AuditLog.create(
        action='CREATE',
        entity_type='INVENTORY',
        entity_id=getattr(unit, 'id', '—'),
        details=f"Created inventory unit/item: {getattr(unit, 'ref_no', '')}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': unit.to_dict(),
        'message': 'Inventory unit created successfully'
    }), 201


@inventory_bp.route('/<unit_id>', methods=['PUT'])
@token_required
def update_inventory_unit(unit_id):
    """Update an inventory unit"""
    unit = None
    try:
        unit = InventoryUnit.find_by_id(unit_id)
    except Exception:
        pass

    if not unit:
        unit = Inventory.find_by_id(unit_id)

    if not unit:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Unit not found'
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
    
    updated_unit = unit.update(data)
    
    current_user = request.current_user
    AuditLog.create(
        action='UPDATE',
        entity_type='INVENTORY',
        entity_id=unit_id,
        details=f"Updated inventory unit: {unit_id}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': updated_unit.to_dict(),
        'message': 'Inventory unit updated successfully'
    }), 200


@inventory_bp.route('/<unit_id>/status', methods=['PUT'])
@token_required
def toggle_unit_status(unit_id):
    """Toggle inventory unit status"""
    unit = None
    try:
        unit = InventoryUnit.find_by_id(unit_id)
    except Exception:
        pass

    if not unit:
        unit = Inventory.find_by_id(unit_id)

    if not unit:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Unit not found'
            }
        }), 404
    
    new_status = 'inactive' if getattr(unit, 'status', 'active') == 'active' else 'active'
    updated_unit = unit.update({'status': new_status})
    
    current_user = request.current_user
    AuditLog.create(
        action='UPDATE',
        entity_type='INVENTORY',
        entity_id=unit_id,
        details=f"Toggled unit status to {new_status}: {unit_id}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': updated_unit.to_dict(),
        'message': f'Unit status changed to {new_status}'
    }), 200


@inventory_bp.route('/<unit_id>', methods=['DELETE'])
@token_required
def delete_inventory_unit(unit_id):
    """Delete an inventory unit"""
    unit = None
    try:
        unit = InventoryUnit.find_by_id(unit_id)
    except Exception:
        pass

    if not unit:
        unit = Inventory.find_by_id(unit_id)

    if not unit:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Unit not found'
            }
        }), 404

    current_user = request.current_user
    unit.delete()
    AuditLog.create(
        action='DELETE',
        entity_type='INVENTORY',
        entity_id=unit_id,
        details=f"Deleted unit: {unit_id}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )

    return jsonify({
        'success': True,
        'message': 'Unit deleted successfully'
    }), 200