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
    try:
        quantity = int(data.get('quantity') or data.get('qty') or 1)
    except (ValueError, TypeError):
        quantity = 1

    if not student_id or not ref_no or not lot_id:
        return jsonify({'success': False, 'message': 'student_id, ref_no, lot_id required'}), 400

    if quantity < 1:
        return jsonify({'success': False, 'message': 'Quantity must be at least 1'}), 400

    student = Student.find_by_id(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'
    issue_date = data.get('issue_date') or date.today().isoformat()

    if quantity == 1:
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

    # Multi-quantity issue transaction
    db = Issue.get_db()
    conn = db.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT qty_available, qty_fresh, lot_no, status
            FROM stock_lots
            WHERE lot_id = %s
            FOR UPDATE
        """, (lot_id,))
        lot = cursor.fetchone()
        if not lot:
            return jsonify({'success': False, 'message': 'Lot not found'}), 404
        if lot['status'] != 'open':
            return jsonify({'success': False, 'message': 'Lot is not open for issuing'}), 400
        if (lot['qty_available'] or 0) < quantity:
            return jsonify({'success': False, 'message': f"Lot has only {lot['qty_available']} available units (requested {quantity})"}), 400
        if (lot['qty_fresh'] or 0) < quantity:
            return jsonify({'success': False, 'message': f"Lot has only {lot['qty_fresh']} fresh units available (requested {quantity})"}), 400

        cursor.execute("""
            SELECT pg.product_name, pg.category, pg.is_returnable
            FROM products p
            JOIN product_groups pg ON pg.group_id = p.group_id
            WHERE p.ref_no = %s
        """, (ref_no,))
        prod = cursor.fetchone() or {}
        prod_name = prod.get('product_name') or ref_no
        cat = prod.get('category') or 'other'
        is_implant = 1 if cat in ('implant', 'abutment') else 0
        lot_no = lot.get('lot_no') or ''

        cursor.execute("SELECT status, name FROM students WHERE campus_id = %s", (student_id,))
        st_row = cursor.fetchone()
        if not st_row:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        if st_row['status'] != 'active':
            return jsonify({'success': False, 'message': 'Student is not active'}), 400
        student_name = st_row['name']

        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(issue_id, 5) AS UNSIGNED)), 0) + 1 AS next_id FROM issue_events")
        next_issue_num = cursor.fetchone()['next_id']
        issue_id = f"ISS-{next_issue_num:03d}"

        cursor.execute("""
            INSERT INTO issue_events (issue_id, student_id, student_name, issue_date, issued_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (issue_id, student_id, student_name, issue_date, user_name))

        cursor.execute("""
            SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(unit_serial, '-', -1) AS UNSIGNED)), 0) AS max_serial
            FROM issued_units
            WHERE lot_id = %s
        """, (lot_id,))
        max_serial = cursor.fetchone()['max_serial']

        for i in range(1, quantity + 1):
            serial_num = max_serial + i
            seq_str = f"{serial_num:02d}"
            unit_serial = f"{ref_no}-L{lot_no}-{seq_str}"

            cursor.execute("""
                INSERT INTO issued_units (
                    unit_serial, lot_id, issue_id, ref_no, lot_no, product_name, category,
                    is_implant_abutment, status, issued_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'issued', %s)
            """, (unit_serial, lot_id, issue_id, ref_no, lot_no, prod_name, cat, is_implant, issue_date))

            cursor.execute("""
                INSERT INTO stock_movements (
                    unit_serial, lot_id, ref_no, movement_type, from_status, to_status,
                    quantity_change, reference_id, moved_by
                ) VALUES (%s, %s, %s, 'issue', 'in_stock', 'issued', -1, %s, %s)
            """, (unit_serial, lot_id, ref_no, issue_id, user_name))

        cursor.execute("""
            UPDATE stock_lots
            SET qty_available    = qty_available - %s,
                qty_fresh        = GREATEST(qty_fresh - %s, 0),
                qty_issued_total = qty_issued_total + %s,
                status           = IF(qty_available - %s <= 0, 'depleted', status),
                version          = version + 1
            WHERE lot_id = %s
        """, (quantity, quantity, quantity, quantity, lot_id))

        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

    AuditLog.create(
        action='ISSUE',
        entity_type='ISSUED',
        entity_id=issue_id,
        details=f'Issued {quantity} units of {ref_no} to {student.name}',
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
    data = request.get_json() or {}
    condition = data.get('condition', 'Good')
    return_date = data.get('return_date') or date.today().isoformat()

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    # Check if identifier is an issue_id with active units
    issue_units = IssuedUnit.find_by_issue_id(unit_serial)
    active_issue_units = [u for u in issue_units if u.status == 'issued']
    if active_issue_units:
        qr_json = None
        for u in active_issue_units:
            try:
                _, outs = _call_procedure(
                    'sp_return_unit',
                    (u.unit_serial, return_date, condition, user_name),
                    1
                )
                if not qr_json and outs:
                    qr_json = outs[0]
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
                entity_id=u.unit_serial,
                details=f'Returned {u.unit_serial}, condition: {condition}',
                user_id=user.id if user else None,
                user_name=user_name,
            )

        return jsonify({
            'success': True,
            'data': active_issue_units[0].to_dict(),
            'qr_data': qr_json,
        }), 200

    resolved_serial = _resolve_unit_serial(unit_serial)
    try:
        _, outs = _call_procedure(
            'sp_return_unit',
            (resolved_serial, return_date, condition, user_name),
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
        entity_id=resolved_serial,
        details=f'Returned {resolved_serial}, condition: {condition}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    unit = IssuedUnit.find_by_serial(resolved_serial)
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


# ---------- Bulk Issue (Loop) ----------

@issued_bp.route('/bulk', methods=['POST'])
@token_required
def issue_bulk():
    data = request.get_json() or {}
    student_id = data.get('student_id')
    ref_no = data.get('ref_no')
    lot_id = data.get('lot_id')
    quantity = int(data.get('quantity') or 0)
    issue_date = data.get('issue_date') or date.today().isoformat()

    if not student_id or not ref_no or not lot_id or quantity < 1:
        return jsonify({'success': False, 'message': 'student_id, ref_no, lot_id, quantity required'}), 400

    student = Student.find_by_id(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    issued = []
    for _ in range(quantity):
        try:
            _, outs = _call_procedure(
                'sp_issue_unit',
                (ref_no, lot_id, student_id, user_name, issue_date),
                2
            )
            issued.append({'unitSerial': outs[0], 'issueId': outs[1]})
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed at unit {len(issued)+1}: {str(e)}',
                'issued': issued
            }), 400

    AuditLog.create(
        action='ISSUE_BULK',
        entity_type='ISSUED',
        entity_id=issued[-1]['issueId'] if issued else '',
        details=f'Issued {len(issued)} x {ref_no} to {student.name}',
        user_id=user.id if user else None,
        user_name=user_name,
    )

    return jsonify({'success': True, 'data': {'count': len(issued), 'units': issued}}), 201