from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.issued_item import IssuedItem
from models.inventory import Inventory
from models.student import Student
from models.audit_log import AuditLog
import datetime

issued_bp = Blueprint('issued', __name__, url_prefix='/api/issued')

@issued_bp.route('/', methods=['GET'])
@token_required
def get_issued_items():
    """Get all issued items"""
    items = IssuedItem.find_all()
    return jsonify({
        'success': True,
        'data': [item.to_dict() for item in items]
    }), 200

@issued_bp.route('/<issue_id>', methods=['GET'])
@token_required
def get_issued_item(issue_id):
    """Get issued item by ID"""
    item = IssuedItem.find_by_id(issue_id)
    if not item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Issued item not found'
            }
        }), 404
    
    return jsonify({
        'success': True,
        'data': item.to_dict()
    }), 200

@issued_bp.route('/student/<student_id>', methods=['GET'])
@token_required
def get_student_issued_items(student_id):
    """Get active issued items for a student"""
    items = IssuedItem.find_active_by_student(student_id)
    return jsonify({
        'success': True,
        'data': [item.to_dict() for item in items]
    }), 200

@issued_bp.route('/', methods=['POST'])
@token_required
def issue_item():
    """Issue an item to a student"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    student_id = data.get('student_id')
    inventory_id = data.get('inventory_id') or data.get('unit_id')
    
    if not student_id or not inventory_id:
        missing = []
        if not student_id: missing.append('student_id')
        if not inventory_id: missing.append('inventory_id')
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': f'Missing required fields: {", ".join(missing)}'
            }
        }), 400
    
    # Check if student exists
    student = Student.find_by_id(student_id)
    if not student:
        return jsonify({
            'success': False,
            'error': {
                'code': 'STUDENT_NOT_FOUND',
                'message': 'Student not found'
            }
        }), 404
    
    # Check if inventory unit exists
    from models.inventory_unit import InventoryUnit
    from models.product import Product

    unit = InventoryUnit.find_by_id(inventory_id)
    if not unit:
        return jsonify({
            'success': False,
            'error': {
                'code': 'UNIT_NOT_FOUND',
                'message': f'Unit {inventory_id} not found'
            }
        }), 404
    
    # Check if unit has quantity > 0
    if unit.quantity <= 0:
        return jsonify({
            'success': False,
            'error': {
                'code': 'UNIT_UNAVAILABLE',
                'message': f'Unit {inventory_id} has no available stock (quantity: {unit.quantity})'
            }
        }), 400
    
    # Check if unit is already active
    active_issue = IssuedItem.find_active_by_unit(inventory_id)
    if active_issue:
        return jsonify({
            'success': False,
            'error': {
                'code': 'UNIT_ALREADY_ISSUED',
                'message': f'Unit {inventory_id} is already issued to {active_issue.student_name}'
            }
        }), 400
    
    # Get product details
    product = Product.find_by_ref_no(unit.ref_no)
    
    quantity = data.get('quantity', 1)
    if quantity > unit.quantity:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INSUFFICIENT_STOCK',
                'message': f'Insufficient stock. Available: {unit.quantity}'
            }
        }), 400
    
    # Create issued item
    current_user = request.current_user
    stock_type = data.get('stock_type', 'fresh')
    
    issued_data = {
        'student_id': student_id,
        'student_name': student.name,
        'inventory_id': inventory_id,
        'unit_id': inventory_id,
        'product_name': product.product_name if product else unit.ref_no,
        'lot_no': product.lot_no if product else '',
        'ref_no': unit.ref_no,
        'quantity': quantity,
        'issue_date': data.get('issue_date', datetime.date.today().isoformat()),
        'issued_by': current_user.name if current_user else 'Admin'
    }
    
    try:
        issued_item = IssuedItem.create(issued_data)
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'UNIT_ALREADY_ISSUED',
                'message': str(e)
            }
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'Failed to issue item: {str(e)}'
            }
        }), 500
    
    # Log the action
    AuditLog.create(
        action='ISSUE',
        entity_type='ISSUED',
        entity_id=issued_item.issue_id,
        details=f"Issued {quantity} x {product.product_name if product else unit.ref_no} (Unit: {inventory_id}, Source: {stock_type.title()}) to {student.name}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': issued_item.to_dict(),
        'message': f'Unit {inventory_id} issued successfully to {student.name}'
    }), 201

@issued_bp.route('/<issue_id>/return', methods=['PUT'])
@token_required
def return_item(issue_id):
    """Return an issued item"""
    issued_item = IssuedItem.find_by_id(issue_id)
    if not issued_item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Issued item not found'
            }
        }), 404
    
    if issued_item.status == 'returned':
        return jsonify({
            'success': False,
            'error': {
                'code': 'ALREADY_RETURNED',
                'message': 'Item already returned'
            }
        }), 400
    
    if issued_item.status == 'condemned':
        return jsonify({
            'success': False,
            'error': {
                'code': 'CONDEMNED',
                'message': 'Cannot return a condemned item'
            }
        }), 400
    
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    return_date = data.get('return_date', datetime.date.today().isoformat())
    condition = data.get('return_condition', 'Good')
    
    if condition not in ['Good', 'Damaged', 'Expired']:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid return condition. Must be Good, Damaged, or Expired'
            }
        }), 400
    
    current_user = request.current_user
    
    try:
        returned_item = issued_item.return_item(
            return_date,
            condition,
            current_user.name if current_user else 'Admin'
        )
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'RETURN_FAILED',
                'message': f'Failed to return item: {str(e)}'
            }
        }), 500
    
    # Log the action
    AuditLog.create(
        action='RETURN',
        entity_type='ISSUED',
        entity_id=issue_id,
        details=f"Returned unit {issued_item.unit_id} ({issued_item.product_name}) from {issued_item.student_name}, Condition: {condition}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': returned_item.to_dict(),
        'message': f'Unit returned successfully with condition: {condition}'
    }), 200

@issued_bp.route('/<issue_id>/condemn', methods=['PUT'])
@token_required
@admin_required
def condemn_item(issue_id):
    """Condemn an issued item (Admin only)"""
    issued_item = IssuedItem.find_by_id(issue_id)
    if not issued_item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Issued item not found'
            }
        }), 404
    
    if issued_item.status == 'condemned':
        return jsonify({
            'success': False,
            'error': {
                'code': 'ALREADY_CONDEMNED',
                'message': 'Item already condemned'
            }
        }), 400
    
    current_user = request.current_user
    
    try:
        condemned_item = issued_item.condemn(current_user.name if current_user else 'Admin')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'CONDEMN_FAILED',
                'message': f'Failed to condemn item: {str(e)}'
            }
        }), 500
    
    # Log the action
    AuditLog.create(
        action='CONDEMN',
        entity_type='ISSUED',
        entity_id=issue_id,
        details=f"Condemned unit {issued_item.unit_id} ({issued_item.product_name}) from {issued_item.student_name}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': condemned_item.to_dict(),
        'message': 'Unit condemned successfully'
    }), 200


# =====================================================
# ⭐ BATCH ISSUE ENDPOINT
# =====================================================
@issued_bp.route('/batch', methods=['POST'])
@token_required
def batch_issue_items():
    """
    Issue multiple units in a single request for better performance.
    Expects: { "items": [ { "student_id": "...", "unit_id": "...", "ref_no": "..." } ] }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    if not data.get('items') or not isinstance(data['items'], list):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'items array is required'
            }
        }), 400
    
    # Get current user
    current_user = request.current_user
    user_name = current_user.name if current_user else 'Admin'
    user_id = current_user.id if current_user else None
    
    results = []
    errors = []
    
    for idx, item_data in enumerate(data['items']):
        try:
            # Validate each item
            student_id = item_data.get('student_id')
            unit_id = item_data.get('unit_id')
            
            if not student_id or not unit_id:
                errors.append({
                    'index': idx,
                    'error': 'Missing student_id or unit_id',
                    'unit_id': unit_id
                })
                continue
            
            # Check if student exists
            student = Student.find_by_id(student_id)
            if not student:
                errors.append({
                    'index': idx,
                    'error': f'Student {student_id} not found',
                    'unit_id': unit_id
                })
                continue
            
            # Check if unit exists and is available
            from models.inventory_unit import InventoryUnit
            from models.product import Product
            
            unit = InventoryUnit.find_by_id(unit_id)
            if not unit:
                errors.append({
                    'index': idx,
                    'error': f'Unit {unit_id} not found',
                    'unit_id': unit_id
                })
                continue
            
            if unit.quantity <= 0:
                errors.append({
                    'index': idx,
                    'error': f'Unit {unit_id} has no stock (quantity: {unit.quantity})',
                    'unit_id': unit_id
                })
                continue
            
            # Check if unit is already active
            active_issue = IssuedItem.find_active_by_unit(unit_id)
            if active_issue:
                errors.append({
                    'index': idx,
                    'error': f'Unit {unit_id} is already issued to {active_issue.student_name}',
                    'unit_id': unit_id
                })
                continue
            
            # Get product details
            product = Product.find_by_ref_no(unit.ref_no)
            
            # Create issued data
            issued_data = {
                'student_id': student_id,
                'student_name': student.name,
                'inventory_id': unit_id,
                'unit_id': unit_id,
                'product_name': product.product_name if product else unit.ref_no,
                'lot_no': product.lot_no if product else '',
                'ref_no': unit.ref_no,
                'quantity': 1,
                'issue_date': item_data.get('issue_date', datetime.date.today().isoformat()),
                'issued_by': user_name
            }
            
            # Create the issued item
            issued_item = IssuedItem.create(issued_data)
            
            # Log the action
            AuditLog.create(
                action='ISSUE',
                entity_type='ISSUED',
                entity_id=issued_item.issue_id,
                details=f"Issued 1 x {product.product_name if product else unit.ref_no} (Unit: {unit_id}) to {student.name}",
                user_id=user_id,
                user_name=user_name
            )
            
            results.append(issued_item.to_dict())
            
        except ValueError as e:
            errors.append({
                'index': idx,
                'error': str(e),
                'unit_id': item_data.get('unit_id')
            })
        except Exception as e:
            errors.append({
                'index': idx,
                'error': f'Internal error: {str(e)}',
                'unit_id': item_data.get('unit_id')
            })
    
    return jsonify({
        'success': True,
        'data': {
            'results': results,
            'errors': errors,
            'total': len(results),
            'failed': len(errors)
        },
        'message': f'Successfully issued {len(results)} unit(s)' + (f', {len(errors)} failed' if errors else '')
    }), 201