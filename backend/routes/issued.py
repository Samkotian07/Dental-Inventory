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
    
    required = ['student_id', 'inventory_id']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': f'Missing required fields: {", ".join(missing)}'
            }
        }), 400
    
    # Check if student exists
    student = Student.find_by_id(data['student_id'])
    if not student:
        return jsonify({
            'success': False,
            'error': {
                'code': 'STUDENT_NOT_FOUND',
                'message': 'Student not found'
            }
        }), 404
    
    # Check if inventory item exists and has sufficient quantity
    inventory_item = Inventory.find_by_id(data['inventory_id'])
    if not inventory_item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVENTORY_NOT_FOUND',
                'message': 'Inventory item not found'
            }
        }), 404
    
    quantity = data.get('quantity', 1)
    if inventory_item.quantity < quantity:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INSUFFICIENT_STOCK',
                'message': f'Insufficient stock. Available: {inventory_item.quantity}'
            }
        }), 400
    
    # Check if item is returnable (skip for consumables)
    if not inventory_item.is_returnable:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_RETURNABLE',
                'message': 'This item is not returnable (consumable)'
            }
        }), 400
    
    # Create issued item
    current_user = request.current_user
    issued_data = {
        'student_id': data['student_id'],
        'student_name': student.name,
        'inventory_id': data['inventory_id'],
        'product_name': inventory_item.product_name,
        'lot_no': inventory_item.lot_no,
        'ref_no': inventory_item.ref_no,
        'quantity': quantity,
        'issue_date': data.get('issue_date', datetime.date.today().isoformat()),
        'issued_by': current_user.name if current_user else 'Admin'
    }
    
    issued_item = IssuedItem.create(issued_data)
    
    # Log the action
    AuditLog.create(
        action='ISSUE',
        entity_type='ISSUED',
        entity_id=issued_item.issue_id,
        details=f"Issued {quantity} x {inventory_item.product_name} to {student.name}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': issued_item.to_dict(),
        'message': 'Item issued successfully'
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
    
    # Check if item is returnable
    inventory_item = Inventory.find_by_id(issued_item.inventory_id)
    if inventory_item and not inventory_item.is_returnable:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_RETURNABLE',
                'message': 'This item is not returnable'
            }
        }), 400
    
    # Return the item
    returned_item = issued_item.return_item(
        return_date,
        condition,
        current_user.name if current_user else 'Admin'
    )
    
    # Log the action
    AuditLog.create(
        action='RETURN',
        entity_type='ISSUED',
        entity_id=issue_id,
        details=f"Returned item: {issued_item.product_name} from {issued_item.student_name}, Condition: {condition}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': returned_item.to_dict(),
        'message': f'Item returned successfully with condition: {condition}'
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
    condemned_item = issued_item.condemn(current_user.name if current_user else 'Admin')
    
    # Log the action
    AuditLog.create(
        action='CONDEMN',
        entity_type='ISSUED',
        entity_id=issue_id,
        details=f"Condemned item: {issued_item.product_name} from {issued_item.student_name}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': condemned_item.to_dict(),
        'message': 'Item condemned successfully'
    }), 200