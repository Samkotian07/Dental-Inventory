from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.failed_inventory import FailedInventory
from models.stock_lot import StockLot
from models.audit_log import AuditLog
from datetime import date

failed_bp = Blueprint('failed', __name__, url_prefix='/api/failed')


# ---------- Helpers ----------

def _call_procedure(proc_name, in_params, out_param_count):
    db = FailedInventory.get_db()
    conn = db.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.callproc(proc_name, in_params)
        conn.commit()
        results = []
        for r in cursor.stored_results():
            results.extend(r.fetchall() or [])
        out_values = []
        if out_param_count:
            placeholders = ", ".join(
                [f"@_{proc_name}_{i}" for i in range(len(in_params), len(in_params) + out_param_count)]
            )
            out_cursor = conn.cursor(dictionary=True)
            out_cursor.execute(f"SELECT {placeholders}")
            row = out_cursor.fetchone()
            out_cursor.close()
            if row:
                out_values = list(row.values())
        return results, out_values
    finally:
        cursor.close()


# ---------- Read endpoints ----------

@failed_bp.route('/', methods=['GET'])
@token_required
def get_failed_items():
    status = request.args.get('status')  # optional filter
    if status:
        items = FailedInventory.find_by_status(status)
    else:
        items = FailedInventory.find_all()
    return jsonify({'success': True, 'data': [i.to_dict() for i in items]}), 200


@failed_bp.route('/pending', methods=['GET'])
@token_required
def get_pending():
    items = FailedInventory.find_pending()
    return jsonify({'success': True, 'data': [i.to_dict() for i in items]}), 200


@failed_bp.route('/<fail_id>', methods=['GET'])
@token_required
def get_failed_item(fail_id):
    obj = FailedInventory.find_by_id(fail_id)
    if not obj:
        return jsonify({'success': False, 'message': 'Failed record not found'}), 404
    return jsonify({'success': True, 'data': obj.to_dict()}), 200


# ---------- Move qty from lot to failed ----------

@failed_bp.route('/', methods=['POST'])
@token_required
def move_to_failed():
    data = request.get_json() or {}
    lot_id = data.get('lot_id')
    qty = data.get('quantity')
    failure_type = data.get('failure_type') or 'damaged'
    failure_reason = data.get('failure_reason') or data.get('reason') or 'Damaged'

    if not lot_id or not qty:
        return jsonify({'success': False, 'message': 'lot_id and quantity required'}), 400

    # Validate failure_type
    valid_types = {'condemned', 'expired', 'quality_fail', 'damaged'}
    if failure_type not in valid_types:
        return jsonify({
            'success': False,
            'message': f'failure_type must be one of {valid_types}'
        }), 400

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _, outs = _call_procedure(
            'sp_move_to_failed',
            (lot_id, int(qty), failure_type, failure_reason, user_name),
            1
        )
        fail_id = outs[0]
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='MOVE_TO_FAILED',
        entity_type='FAILED_INVENTORY',
        entity_id=fail_id,
        details=f'Moved {qty} unit(s) of lot {lot_id} to failed. Reason: {failure_reason}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    obj = FailedInventory.find_by_id(fail_id)
    return jsonify({'success': True, 'data': obj.to_dict()}), 201


# ---------- Restore failed → back to source lot ----------

@failed_bp.route('/<fail_id>/restore', methods=['POST'])
@token_required
def restore_failed(fail_id):
    obj = FailedInventory.find_by_id(fail_id)
    if not obj:
        return jsonify({'success': False, 'message': 'Failed record not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _call_procedure('sp_restore_failed', (fail_id, user_name), 0)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='RESTORE_FAILED',
        entity_type='FAILED_INVENTORY',
        entity_id=fail_id,
        details=f'Restored failed item {fail_id} back to lot {obj.lot_id}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    updated = FailedInventory.find_by_id(fail_id)
    return jsonify({'success': True, 'data': updated.to_dict()}), 200


# ---------- Dispose failed (terminal) ----------

@failed_bp.route('/<fail_id>/dispose', methods=['POST'])
@token_required
@admin_required
def dispose_failed(fail_id):
    data = request.get_json() or {}
    remarks = data.get('remarks') or 'Disposed'

    obj = FailedInventory.find_by_id(fail_id)
    if not obj:
        return jsonify({'success': False, 'message': 'Failed record not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _call_procedure('sp_dispose_failed', (fail_id, user_name, remarks), 0)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='DISPOSE_FAILED',
        entity_type='FAILED_INVENTORY',
        entity_id=fail_id,
        details=f'Disposed failed item {fail_id}. Remarks: {remarks}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    updated = FailedInventory.find_by_id(fail_id)
    return jsonify({'success': True, 'data': updated.to_dict()}), 200