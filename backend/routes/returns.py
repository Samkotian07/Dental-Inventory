from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.vendor_return import VendorReturn
from models.credit_note import CreditNote
from models.stock_lot import StockLot
from models.product import Product
from models.audit_log import AuditLog
from datetime import date

returns_bp = Blueprint('returns', __name__, url_prefix='/api/returns')


# ---------- Helpers ----------

def _call_procedure(proc_name, in_params, out_param_count):
    db = VendorReturn.get_db()
    conn = db.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        call_params = list(in_params) + [''] * out_param_count
        res = cursor.callproc(proc_name, call_params)
        conn.commit()
        results = []
        for r in cursor.stored_results():
            results.extend(r.fetchall() or [])
        out_values = []
        if out_param_count and res:
            if isinstance(res, dict):
                out_values = list(res.values())[-out_param_count:]
            elif isinstance(res, (list, tuple)):
                out_values = list(res)[-out_param_count:]
        return results, out_values
    finally:
        try:
            cursor.close()
        except:
            pass
        try:
            conn.close()
        except:
            pass


# ---------- Read endpoints ----------

@returns_bp.route('/', methods=['GET'])
@token_required
def get_returns():
    items = VendorReturn.find_all()
    return jsonify({'success': True, 'data': [r.to_dict() for r in items]}), 200


@returns_bp.route('/<return_id>', methods=['GET'])
@token_required
def get_return(return_id):
    obj = VendorReturn.find_by_id(return_id)
    if not obj:
        return jsonify({'success': False, 'message': 'Return not found'}), 404
    return jsonify({'success': True, 'data': obj.to_dict()}), 200


# ---------- Create overstock return (credit note path) ----------

@returns_bp.route('/overstock', methods=['POST'])
@token_required
def create_overstock_return():
    data = request.get_json() or {}
    lot_id = data.get('lot_id')
    qty = data.get('quantity')
    vendor_id = data.get('vendor_id')
    reason = data.get('reason') or 'Overstock'
    return_date = data.get('return_date') or date.today().isoformat()

    if not lot_id or not qty:
        return jsonify({'success': False, 'message': 'lot_id and quantity required'}), 400

    if not vendor_id:
        db = VendorReturn.get_db()
        rows = db.execute_query("""
            SELECT p.vendor_id
            FROM stock_lots l
            JOIN products p ON p.ref_no = l.ref_no
            WHERE l.lot_id = %s
        """, (lot_id,))
        if rows and rows[0].get('vendor_id'):
            vendor_id = rows[0]['vendor_id']
        else:
            vendor_id = 1

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _, outs = _call_procedure(
            'sp_send_overstock_to_vendor',
            (lot_id, int(qty), int(vendor_id), return_date, reason, user_name),
            1
        )
        return_id = outs[0]
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='CREATE_OVERSTOCK_RETURN',
        entity_type='VENDOR_RETURN',
        entity_id=return_id,
        details=f'Created overstock return {return_id} for lot {lot_id}, qty {qty}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    obj = VendorReturn.find_by_id(return_id)
    return jsonify({'success': True, 'data': obj.to_dict()}), 201


# ---------- Complete a vendor return ----------

@returns_bp.route('/<return_id>/complete', methods=['POST'])
@token_required
def complete_return(return_id):
    data = request.get_json() or {}
    new_lot_no = data.get('new_lot_no')
    new_qty = data.get('new_qty')
    credit_note_no = data.get('credit_note_no')
    credit_amount = data.get('credit_amount')

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _call_procedure(
            'sp_complete_vendor_return',
            (return_id, new_lot_no, new_qty, credit_note_no, credit_amount, user_name),
            0
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    if new_lot_no:
        db = VendorReturn.get_db()
        db.execute_query(
            "UPDATE vendor_return_items SET replacement_lot_no = %s WHERE return_id = %s",
            (new_lot_no, return_id)
        )

    AuditLog.create(
        action='COMPLETE_RETURN',
        entity_type='VENDOR_RETURN',
        entity_id=return_id,
        details=f'Completed return {return_id}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    obj = VendorReturn.find_by_id(return_id)
    return jsonify({'success': True, 'data': obj.to_dict()}), 200


# ---------- Update status (in_progress only — no completion) ----------

@returns_bp.route('/<return_id>/status', methods=['PUT'])
@token_required
def update_status(return_id):
    data = request.get_json() or {}
    raw_status = (data.get('status') or '').strip().lower().replace(' ', '_')

    status_map = {
        'pending': 'pending',
        'in_progress': 'in_progress',
        'inprogress': 'in_progress',
        'completed': 'completed',
        'complete': 'completed',
        'rejected': 'rejected',
        'reject': 'rejected',
        'cancelled': 'cancelled',
        'canceled': 'cancelled',
    }
    new_status = status_map.get(raw_status)

    allowed = {'pending', 'in_progress', 'completed', 'rejected', 'cancelled'}
    if not new_status or new_status not in allowed:
        return jsonify({
            'success': False,
            'message': f"Invalid status '{raw_status}'. Allowed: pending, in_progress, completed, rejected, cancelled."
        }), 400

    obj = VendorReturn.find_by_id(return_id)
    if not obj:
        return jsonify({'success': False, 'message': 'Return not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    if new_status == 'completed':
        # Completion path using stored procedure
        new_lot_no = data.get('new_lot_no') or data.get('newBatchNo') or data.get('new_batch_no')
        new_qty = data.get('new_qty') or data.get('quantity')
        credit_note_no = data.get('credit_note_no') or data.get('creditNote') or data.get('credit_note')
        credit_amount = data.get('credit_amount')

        if not new_qty and obj.items:
            new_qty = obj.items[0].get('quantity') or 1
        elif not new_qty:
            new_qty = 1

        if credit_amount is None:
            credit_amount = 0.0

        try:
            _call_procedure(
                'sp_complete_vendor_return',
                (return_id, new_lot_no, new_qty, credit_note_no, credit_amount, user_name),
                0
            )
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 400

        if new_lot_no:
            db = VendorReturn.get_db()
            db.execute_query(
                "UPDATE vendor_return_items SET replacement_lot_no = %s WHERE return_id = %s",
                (new_lot_no, return_id)
            )

        AuditLog.create(
            action='COMPLETE_RETURN',
            entity_type='VENDOR_RETURN',
            entity_id=return_id,
            details=f'Completed return {return_id}',
            user_id=user.id if user else None,
            user_name=user_name,
        )
    else:
        db = VendorReturn.get_db()
        db.execute_query(
            "UPDATE vendor_returns SET status = %s WHERE return_id = %s",
            (new_status, return_id)
        )
        AuditLog.create(
            action='UPDATE_RETURN_STATUS',
            entity_type='VENDOR_RETURN',
            entity_id=return_id,
            details=f'Status changed to {new_status}',
            user_id=user.id if user else None,
            user_name=user_name,
        )

    updated = VendorReturn.find_by_id(return_id)
    return jsonify({'success': True, 'data': updated.to_dict() if updated else {}}), 200


# ---------- Soft delete credit note ----------

@returns_bp.route('/credit-notes/<credit_note_id>/delete', methods=['POST'])
@token_required
@admin_required
def soft_delete_credit_note(credit_note_id):
    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _call_procedure(
            'sp_soft_delete_credit_note',
            (credit_note_id, user_name),
            0
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='SOFT_DELETE_CREDIT_NOTE',
        entity_type='CREDIT_NOTE',
        entity_id=credit_note_id,
        details=f'Soft-deleted credit note {credit_note_id}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    return jsonify({'success': True}), 200


# ---------- Apply credit note ----------

@returns_bp.route('/credit-notes/<credit_note_id>/apply', methods=['POST'])
@token_required
def apply_credit_note(credit_note_id):
    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _call_procedure(
            'sp_apply_credit_note',
            (credit_note_id, user_name),
            0
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='APPLY_CREDIT_NOTE',
        entity_type='CREDIT_NOTE',
        entity_id=credit_note_id,
        details=f'Applied credit note {credit_note_id}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    return jsonify({'success': True}), 200


# ---------- Credit notes list ----------

@returns_bp.route('/credit-notes', methods=['GET'])
@token_required
def list_credit_notes():
    include_deleted = request.args.get('include_deleted') == 'true'
    items = CreditNote.find_all(include_deleted=include_deleted)
    return jsonify({'success': True, 'data': [c.to_dict() for c in items]}), 200


# ---------- Hard delete a vendor return record (admin only, rare) ----------

@returns_bp.route('/<return_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_return(return_id):
    obj = VendorReturn.find_by_id(return_id)
    if not obj:
        return jsonify({'success': False, 'message': 'Return not found'}), 404

    db = VendorReturn.get_db()
    db.execute_query("DELETE FROM vendor_returns WHERE return_id = %s", (return_id,))

    user = getattr(request, 'current_user', None)
    AuditLog.create(
        action='DELETE_RETURN',
        entity_type='VENDOR_RETURN',
        entity_id=return_id,
        details=f'Deleted vendor return {return_id}',
        user_id=user.id if user else None,
        user_name=user.name if user else 'Admin',
    )

    return jsonify({'success': True}), 200