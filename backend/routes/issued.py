from flask import Blueprint, request, jsonify
import json
from middleware.auth import token_required, admin_required
from models.issue import Issue
from models.issued_unit import IssuedUnit
from models.stock_lot import StockLot
from models.product import Product
from models.student import Student
from models.audit_log import AuditLog
from datetime import date

issued_bp = Blueprint('issued', __name__, url_prefix='/api/issued')


# ---------- Helpers ----------

def _call_procedure(proc_name, in_params, out_param_count):
    """Call a stored procedure and return (result_sets, out_params)."""
    db = Issue.get_db()
    conn = db.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        call_params = list(in_params) + [''] * out_param_count
        res = cursor.callproc(proc_name, call_params)
        conn.commit()
        # fetch result sets
        results = []
        for r in cursor.stored_results():
            results.extend(r.fetchall() or [])
        # fetch OUT params directly from callproc return value
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


def _resolve_unit_serial(identifier):
    """If identifier is an issue_id or not found by serial, look up by issue_id."""
    if not identifier:
        return identifier
    unit = IssuedUnit.find_by_serial(identifier)
    if not unit:
        units = IssuedUnit.find_by_issue_id(identifier)
        if units:
            return units[0].unit_serial
    return identifier



# ---------- Read endpoints ----------

@issued_bp.route('/', methods=['GET'])
@token_required
def get_all_issues():
    issues = Issue.find_all()
    return jsonify({'success': True, 'data': [i.to_dict() for i in issues]}), 200


@issued_bp.route('/<issue_id>', methods=['GET'])
@token_required
def get_issue(issue_id):
    obj = Issue.find_by_id(issue_id)
    if not obj:
        return jsonify({'success': False, 'message': 'Issue not found'}), 404
    return jsonify({'success': True, 'data': obj.to_dict()}), 200


@issued_bp.route('/student/<student_id>', methods=['GET'])
@token_required
def get_student_issues(student_id):
    units = IssuedUnit.find_active_by_student(student_id)
    return jsonify({'success': True, 'data': [u.to_dict() for u in units]}), 200


# ---------- Issue fresh stock ----------

@issued_bp.route('/', methods=['POST'])
@token_required
def issue_unit():
    data = request.get_json() or {}
    student_id = data.get('student_id')
    ref_no = data.get('ref_no')
    lot_id = data.get('lot_id')

    if not student_id or not ref_no or not lot_id:
        return jsonify({'success': False, 'message': 'student_id, ref_no, lot_id required'}), 400

    student = Student.find_by_id(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'
    issue_date = data.get('issue_date') or date.today().isoformat()

    try:
        _, outs = _call_procedure(
            'sp_issue_unit',
            (ref_no, lot_id, student_id, user_name, issue_date),
            2
        )
        unit_serial, issue_id = outs[0], outs[1]
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    if not issue_id:
        return jsonify({'success': False, 'message': 'Issue failed. Verify lot is open and has stock.'}), 400

    AuditLog.create(
        action='ISSUE',
        entity_type='ISSUED',
        entity_id=issue_id,
        details=f'Issued {unit_serial} ({ref_no}) to {student.name}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    obj = Issue.find_by_id(issue_id)
    return jsonify({'success': True, 'data': obj.to_dict()}), 201


# ---------- Issue returned stock (reissue) ----------

@issued_bp.route('/returned-unit', methods=['POST'])
@token_required
def issue_returned_unit():
    data = request.get_json() or {}
    unit_serial = data.get('unit_serial')
    student_id = data.get('student_id')

    if not unit_serial or not student_id:
        return jsonify({'success': False, 'message': 'unit_serial and student_id required'}), 400

    unit_serial = _resolve_unit_serial(unit_serial)

    student = Student.find_by_id(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'
    issue_date = data.get('issue_date') or date.today().isoformat()

    try:
        _, outs = _call_procedure(
            'sp_issue_returned_unit',
            (unit_serial, student_id, user_name, issue_date),
            1
        )
        issue_id = outs[0]
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    if not issue_id:
        return jsonify({'success': False, 'message': 'Reissue failed.'}), 400

    AuditLog.create(
        action='REISSUE',
        entity_type='ISSUED',
        entity_id=issue_id,
        details=f'Reissued {unit_serial} to {student.name}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    obj = Issue.find_by_id(issue_id)
    return jsonify({'success': True, 'data': obj.to_dict()}), 201


# ---------- Return a tool ----------

@issued_bp.route('/<unit_serial>/return', methods=['POST'])
@token_required
def return_unit(unit_serial):
    unit_serial = _resolve_unit_serial(unit_serial)
    data = request.get_json() or {}
    condition = data.get('condition', 'Good')
    return_date = data.get('return_date') or date.today().isoformat()

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _, outs = _call_procedure(
            'sp_return_unit',
            (unit_serial, return_date, condition, user_name),
            1
        )
        qr_json = outs[0] if outs else None
        if isinstance(qr_json, str):
            try:
                qr_json = json.loads(qr_json)
            except Exception:
                pass
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='RETURN',
        entity_type='ISSUED',
        entity_id=unit_serial,
        details=f'Returned {unit_serial}, condition: {condition}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    unit = IssuedUnit.find_by_serial(unit_serial)
    return jsonify({
        'success': True,
        'data': unit.to_dict() if unit else {},
        'qr_data': qr_json,
    }), 200


# ---------- Send failed unit to vendor ----------

@issued_bp.route('/<unit_serial>/exchange', methods=['POST'])
@token_required
def exchange_unit(unit_serial):
    unit_serial = _resolve_unit_serial(unit_serial)
    data = request.get_json() or {}
    return_date = data.get('return_date') or date.today().isoformat()
    reason = data.get('reason') or 'Defective'

    unit = IssuedUnit.find_by_serial(unit_serial)
    if not unit:
        return jsonify({'success': False, 'message': 'Unit not found'}), 404

    product = Product.find_by_ref_no(unit.ref_no)
    if not product:
        return jsonify({'success': False, 'message': 'Product not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _, outs = _call_procedure(
            'sp_send_to_vendor',
            (unit_serial, product.vendor_id, 'exchange', return_date, reason, user_name),
            1
        )
        return_id = outs[0]
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='EXCHANGE',
        entity_type='ISSUED',
        entity_id=unit_serial,
        details=f'Sent {unit_serial} to vendor as exchange. Return {return_id}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    return jsonify({'success': True, 'returnId': return_id}), 200


# ---------- Condemn a tool ----------

@issued_bp.route('/<unit_serial>/condemn', methods=['POST'])
@token_required
@admin_required
def condemn_unit(unit_serial):
    unit_serial = _resolve_unit_serial(unit_serial)
    data = request.get_json() or {}
    reason = data.get('reason') or 'Damaged'

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _call_procedure(
            'sp_condemn_unit',
            (unit_serial, reason, user_name),
            0
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='CONDEMN',
        entity_type='ISSUED',
        entity_id=unit_serial,
        details=f'Condemned {unit_serial}: {reason}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    return jsonify({'success': True}), 200


# ---------- Mark implant used in patient ----------

@issued_bp.route('/<unit_serial>/used-in-patient', methods=['POST'])
@token_required
def mark_used_in_patient(unit_serial):
    unit_serial = _resolve_unit_serial(unit_serial)
    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    try:
        _call_procedure(
            'sp_mark_used_in_patient',
            (unit_serial, user_name),
            0
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    AuditLog.create(
        action='USED_IN_PATIENT',
        entity_type='ISSUED',
        entity_id=unit_serial,
        details=f'Marked {unit_serial} as used in patient',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    return jsonify({'success': True}), 200