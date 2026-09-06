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
    """Issue an item to a student (supports both regular items and implants/abutments)"""
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
    ref_no = data.get('ref_no')
    
    if not student_id:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'student_id is required'
            }
        }), 400
    
    if not inventory_id and not ref_no:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'inventory_id or ref_no is required'
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
    
    # Check if inventory unit or product exists
    from models.inventory_unit import InventoryUnit
    from models.product import Product
    from models.product_group import ProductGroup

    unit = None
    product = None
    is_implant_abutment = False
    
    target_ref = ref_no or inventory_id
    
    # Step 1: Try to find by unit_id (regular items)
    if inventory_id:
        unit = InventoryUnit.find_by_id(inventory_id)
        if unit:
            product = Product.find_by_ref_no(unit.ref_no)
    
    # Step 2: If no unit found, try by ref_no or target_ref (implants/abutments or ref_no passed as inventory_id)
    if not unit and target_ref:
        product = Product.find_by_ref_no(target_ref)
        if product:
            # Check if it's an implant/abutment
            group = ProductGroup.find_by_id(product.group_id) if product.group_id else None
            if group and not group.is_returnable:
                is_implant_abutment = True
                print(f"🔍 Issuing implant/abutment: {target_ref} - {product.company_name}")
            else:
                # For returnable items, try to find an available unit
                units = InventoryUnit.find_by_ref_no(target_ref)
                if units:
                    unit = units[0]
                    product = Product.find_by_ref_no(unit.ref_no)
    
    # Step 3: Final check - if no unit and no product, return error
    if not unit and not product:
        return jsonify({
            'success': False,
            'error': {
                'code': 'PRODUCT_NOT_FOUND',
                'message': f'Product with ref_no {ref_no} or inventory_id {inventory_id} not found'
            }
        }), 404
    
    # Step 4: For regular items (non-implants), validate unit
    if not is_implant_abutment and unit:
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
    
    # Step 5: Get product details
    if not product:
        product = Product.find_by_ref_no(unit.ref_no) if unit else None
    
    current_user = request.current_user
    stock_type = data.get('stock_type', 'fresh')
    quantity = data.get('quantity', 1)
    
    # For implants/abutments, quantity is always 1
    if is_implant_abutment:
        quantity = 1
    
    # Determine target_unit_id and target_ref_no
    if is_implant_abutment:
        # Implants/abutments - use ref_no, no unit_id
        target_unit_id = None
        target_ref_no = ref_no or product.ref_no if product else ref_no
        product_name = product.get_product_name() if product else data.get('product_name') or ref_no
        lot_no = product.lot_no if product else data.get('lot_no') or ''
    else:
        # Regular items - use unit_id
        target_unit_id = unit.unit_id if unit else None
        target_ref_no = unit.ref_no if unit else ref_no
        product_name = product.get_product_name() if product else data.get('product_name') or target_ref_no
        lot_no = product.lot_no if product else data.get('lot_no') or ''
    
    issued_data = {
        'student_id': student_id,
        'student_name': student.name,
        'inventory_id': target_unit_id,
        'unit_id': target_unit_id,
        'ref_no': target_ref_no,
        'product_name': product_name,
        'lot_no': lot_no,
        'quantity': quantity,
        'issue_date': data.get('issue_date', datetime.date.today().isoformat()),
        'issued_by': current_user.name if current_user else 'Admin',
        'is_implant_abutment': is_implant_abutment,
    }
    
    # Step 6: Create issued item
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
        print(f"❌ Error creating issued item: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'Failed to issue item: {str(e)}'
            }
        }), 500
    
    # Step 7: Update student pending returns
    try:
        Student.update_pending_returns(student_id)
    except Exception as e:
        print(f"⚠️ Could not update pending returns for student {student_id}: {e}")
    
    # Log the action
    AuditLog.create(
        action='ISSUE',
        entity_type='ISSUED',
        entity_id=issued_item.issue_id,
        details=f"Issued {quantity} x {product_name} (Ref: {target_ref_no}, Type: {'Implant/Abutment' if is_implant_abutment else 'Regular'}) to {student.name}",
        user_id=current_user.id if current_user else None,
        user_name=current_user.name if current_user else 'Admin'
    )
    
    return jsonify({
        'success': True,
        'data': issued_item.to_dict(),
        'message': f'Item issued successfully to {student.name}'
    }), 201


@issued_bp.route('/<issue_id>/return', methods=['PUT'])
@token_required
def return_item(issue_id):
    """Return an issued item (regular items only)"""
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
    
    if issued_item.status == 'vendor_exchange':
        return jsonify({
            'success': False,
            'error': {
                'code': 'ALREADY_EXCHANGED',
                'message': 'Item has already been exchanged with vendor'
            }
        }), 400
    
    # Check if this is an implant/abutment (non-returnable)
    if issued_item.is_implant_abutment:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NON_RETURNABLE',
                'message': 'Implants and abutments cannot be returned to stock. Use vendor exchange instead.'
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
    
    # Update student pending returns
    try:
        Student.update_pending_returns(issued_item.student_id)
    except Exception as e:
        print(f"⚠️ Could not update pending returns: {e}")
    
    # ⭐ Get the unit to fetch QR code
    unit = None
    qr_data = None
    if issued_item.unit_id:
        from models.inventory_unit import InventoryUnit
        unit = InventoryUnit.find_by_id(issued_item.unit_id)
        if unit and unit.qr_code:
            import json
            try:
                qr_data = json.loads(unit.qr_code)
            except:
                qr_data = {'raw': unit.qr_code}

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
        'qr_data': qr_data,
        'message': f'Unit returned successfully with condition: {condition}'
    }), 200


# ⭐⭐⭐ NEW: EXCHANGE WITH VENDOR ENDPOINT (For Implants/Abutments)
@issued_bp.route('/<issue_id>/exchange', methods=['PUT'])
@token_required
def exchange_item(issue_id):
    """Exchange an implant/abutment with vendor"""
    issued_item = IssuedItem.find_by_id(issue_id)
    if not issued_item:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Issued item not found'
            }
        }), 404
    
    if issued_item.status == 'vendor_exchange':
        return jsonify({
            'success': False,
            'error': {
                'code': 'ALREADY_EXCHANGED',
                'message': 'Item already exchanged with vendor'
            }
        }), 400
    
    if issued_item.status == 'returned':
        return jsonify({
            'success': False,
            'error': {
                'code': 'ALREADY_RETURNED',
                'message': 'Item already returned to stock'
            }
        }), 400
    
    if not issued_item.is_implant_abutment:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_IMPLANT',
                'message': 'Only implants and abutments can be exchanged with vendor'
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
    new_batch_no = data.get('new_batch_no') or data.get('newBatchNo')
    
    if not new_batch_no:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'new_batch_no is required for vendor exchange'
            }
        }), 400
    
    current_user = request.current_user
    
    try:
        # ⭐ Get the unit to access its unit_id
        from models.inventory_unit import InventoryUnit
        unit = None
        if issued_item.unit_id:
            unit = InventoryUnit.find_by_id(issued_item.unit_id)
        
        # ⭐ Create vendor return record
        from models.vendor_return import VendorReturn
        
        # Determine actual new_lot_no vs reason
        reason_val = new_batch_no if (new_batch_no and new_batch_no in ['Defective', 'Damaged', 'Expired', 'Failed in Patient', 'Other']) else 'Defective implant/abutment'
        actual_new_lot = new_batch_no if (new_batch_no and new_batch_no not in ['Defective', 'Damaged', 'Expired', 'Failed in Patient', 'Other']) else issued_item.lot_no

        vendor_return = VendorReturn.create({
            'type': 'exchange',
            'issue_id': issue_id,
            'unit_id': unit.unit_id if unit else issued_item.unit_id,
            'ref_no': issued_item.ref_no,
            'old_lot_no': issued_item.lot_no,
            'new_lot_no': actual_new_lot,
            'quantity': issued_item.quantity,
            'reason': f"Vendor exchange - {reason_val}",
            'return_date': return_date,
            'created_by': current_user.name if current_user else 'Admin'
        })
        
        # Update issued item
        db = issued_item.get_db()
        db.execute_query("""
            UPDATE issued_items 
            SET status = 'vendor_exchange', 
                exchange_reference_id = %s,
                return_date = %s,
                returned_by = %s
            WHERE issue_id = %s
        """, (vendor_return.return_id, return_date, current_user.name if current_user else 'Admin', issue_id))
        
        # Update student pending returns
        try:
            Student.update_pending_returns(issued_item.student_id)
        except Exception as e:
            print(f"⚠️ Could not update pending returns: {e}")
        
        # Log the action
        AuditLog.create(
            action='EXCHANGE',
            entity_type='ISSUED',
            entity_id=issue_id,
            details=f"Exchanged implant/abutment {issued_item.product_name} (Ref: {issued_item.ref_no}) with vendor. New batch: {new_batch_no}",
            user_id=current_user.id if current_user else None,
            user_name=current_user.name if current_user else 'Admin'
        )
        
        return jsonify({
            'success': True,
            'data': issued_item.to_dict(),
            'message': f'Item exchanged with vendor successfully. New batch: {new_batch_no}'
        }), 200
        
    except Exception as e:
        print(f"❌ Exchange error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {
                'code': 'EXCHANGE_FAILED',
                'message': str(e)
            }
        }), 500


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
    
    if issued_item.status == 'vendor_exchange':
        return jsonify({
            'success': False,
            'error': {
                'code': 'ALREADY_EXCHANGED',
                'message': 'Item has been exchanged with vendor and cannot be condemned'
            }
        }), 400
    
    # Check if this is an implant/abutment
    if issued_item.is_implant_abutment:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NON_CONDEMNABLE',
                'message': 'Implants and abutments cannot be condemned. Use vendor exchange instead.'
            }
        }), 400
    
    current_user = request.current_user
    
    try:
        condemned_item = issued_item.condemn(current_user.name if current_user else 'Admin')
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'CONDEMN_FAILED',
                'message': str(e)
            }
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'CONDEMN_FAILED',
                'message': f'Failed to condemn item: {str(e)}'
            }
        }), 500
    
    # Update student pending returns
    try:
        Student.update_pending_returns(issued_item.student_id)
    except Exception as e:
        print(f"⚠️ Could not update pending returns: {e}")
    
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
# ⭐ BATCH ISSUE ENDPOINT - Regular items only
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
            
            # Use get_product_name()
            product_name = product.get_product_name() if product else unit.ref_no
            
            # Create issued data
            issued_data = {
                'student_id': student_id,
                'student_name': student.name,
                'inventory_id': unit_id,
                'unit_id': unit_id,
                'product_name': product_name,
                'lot_no': product.lot_no if product else '',
                'ref_no': unit.ref_no,
                'quantity': 1,
                'issue_date': item_data.get('issue_date', datetime.date.today().isoformat()),
                'issued_by': user_name
            }
            
            # Create the issued item
            issued_item = IssuedItem.create(issued_data)
            
            # Update student pending returns
            try:
                Student.update_pending_returns(student_id)
            except Exception as e:
                print(f"⚠️ Could not update pending returns for student {student_id}: {e}")
            
            # Log the action
            AuditLog.create(
                action='ISSUE',
                entity_type='ISSUED',
                entity_id=issued_item.issue_id,
                details=f"Issued 1 x {product_name} (Unit: {unit_id}) to {student.name}",
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


# =====================================================
# ⭐ HELPER: Update student pending returns
# =====================================================

def update_student_pending_returns(student_id):
    """Update a student's pending return count after issue/return"""
    try:
        Student.update_pending_returns(student_id)
    except Exception as e:
        print(f"⚠️ Could not update pending returns for student {student_id}: {e}")


        