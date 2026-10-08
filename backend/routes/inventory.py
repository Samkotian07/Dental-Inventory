from flask import Blueprint, request, jsonify
from middleware.auth import token_required
from models.stock_lot import StockLot
from models.issued_unit import IssuedUnit
from models.issue import Issue
from models.product import Product
from datetime import datetime
from middleware.auth import admin_required


inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')


def _status_label(raw_status):
    """Map DB status to display label."""
    s = (raw_status or '').lower()
    if s in ('returned_good', 'returned_damaged'):
        return 'Returned'
    if s == 'condemned':
        return 'Condemned'
    if s == 'used_in_patient':
        return 'Used in Patient'
    if s in ('awaiting_vendor', 'exchanged', 'credited'):
        return 'Vendor Exchange'
    if s == 'issued':
        return 'Active'
    return 'Unknown'


# ---------- Unit History (per ref_no OR per unit_serial) ----------

@inventory_bp.route('/unit-history/<identifier>', methods=['GET'])
@token_required
def get_unit_history(identifier):
    """Return history for a specific unit_serial or all units of a ref_no."""
    db = StockLot.get_db()

    # Try as unit_serial first
    unit = IssuedUnit.find_by_serial(identifier)
    product = None
    rows = []
    cycles = []

    if unit:
        product = Product.find_by_ref_no(unit.ref_no)
        # 1. Fetch movements for this unit
        movements = db.execute_query("""
            SELECT m.id, m.unit_serial, m.lot_id, m.ref_no, m.movement_type,
                   m.from_status, m.to_status, m.quantity_change, m.reference_id,
                   m.moved_by, m.moved_at,
                   e.student_id, e.student_name, e.issue_date, e.issued_by
            FROM stock_movements m
            LEFT JOIN issue_events e ON e.issue_id = m.reference_id
            WHERE m.unit_serial = %s
            ORDER BY m.moved_at ASC, m.id ASC
        """, (unit.unit_serial,))

        if movements:
            audit_returns = db.execute_query("""
                SELECT entity_id, details, timestamp, user_name
                FROM audit_logs
                WHERE details LIKE %s AND action = 'RETURN'
                ORDER BY timestamp ASC
            """, (f'%{unit.unit_serial}%',))

            current_cycle = None
            ret_idx = 0

            for m in movements:
                m_type = m['movement_type']
                if m_type == 'issue':
                    if current_cycle:
                        cycles.append(current_cycle)
                    current_cycle = {
                        'issueId': m['reference_id'] or '—',
                        'student': m['student_name'] or 'Student',
                        'studentId': m['student_id'] or '',
                        'issuedBy': m['issued_by'] or m['moved_by'] or '',
                        'issued': m['moved_at'].isoformat() if hasattr(m['moved_at'], 'isoformat') else str(m['moved_at']),
                        'returned': None,
                        'returnedBy': None,
                        'returnCondition': None,
                        'status': 'Active',
                        'rawStatus': 'issued',
                        'unitId': unit.unit_serial,
                        'lotNo': unit.lot_no,
                        'refNo': unit.ref_no,
                    }
                elif m_type == 'return' and current_cycle:
                    current_cycle['returned'] = m['moved_at'].isoformat() if hasattr(m['moved_at'], 'isoformat') else str(m['moved_at'])
                    current_cycle['returnedBy'] = m['moved_by'] or ''
                    to_stat = (m['to_status'] or '').lower()
                    if 'damage' in to_stat:
                        current_cycle['status'] = 'Damaged'
                        current_cycle['rawStatus'] = 'returned_damaged'
                        current_cycle['returnCondition'] = 'Damaged'
                    else:
                        current_cycle['status'] = 'Returned'
                        current_cycle['rawStatus'] = 'returned_good'
                        current_cycle['returnCondition'] = 'Good'

                    if ret_idx < len(audit_returns):
                        adet = audit_returns[ret_idx].get('details') or ''
                        if 'condition: Damaged' in adet:
                            current_cycle['returnCondition'] = 'Damaged'
                        elif 'condition: Good' in adet:
                            current_cycle['returnCondition'] = 'Good'
                        ret_idx += 1

            if current_cycle:
                if unit.status in ('returned_good', 'returned_damaged') and not current_cycle['returned']:
                    current_cycle['returned'] = unit.returned_date.isoformat() if hasattr(unit.returned_date, 'isoformat') else (str(unit.returned_date) if unit.returned_date else None)
                    current_cycle['returnCondition'] = unit.return_condition or ('Good' if unit.status == 'returned_good' else 'Damaged')
                    current_cycle['returnedBy'] = unit.returned_by or current_cycle.get('returnedBy') or ''
                    current_cycle['status'] = 'Returned'
                    current_cycle['rawStatus'] = unit.status
                cycles.append(current_cycle)

            for idx, c in enumerate(cycles, 1):
                c['cycle'] = idx
        else:
            # Fallback to single-row query if no movements exist
            rows = db.execute_query("""
                SELECT u.unit_serial, u.status AS rawStatus,
                       e.student_id, e.student_name AS student,
                       e.issue_date AS issued, u.returned_date AS returned,
                       u.return_condition, u.lot_no, u.ref_no, u.product_name,
                       e.issued_by, u.returned_by, e.issue_id
                FROM issued_units u
                JOIN issue_events e ON e.issue_id = u.issue_id
                WHERE u.unit_serial = %s
                ORDER BY e.issue_date ASC
            """, (identifier,))
            for i, r in enumerate(rows, 1):
                raw = (r.get('rawStatus') or '').lower()
                cycles.append({
                    'cycle': i,
                    'issueId': r.get('issue_id') or '—',
                    'student': r.get('student') or 'Student',
                    'studentId': r.get('student_id') or '',
                    'issuedBy': r.get('issued_by') or '',
                    'unitId': r.get('unit_serial') or '—',
                    'lotNo': r.get('lot_no') or '',
                    'refNo': r.get('ref_no') or '',
                    'issued': r.get('issued').isoformat() if hasattr(r.get('issued'), 'isoformat') else r.get('issued'),
                    'returned': r.get('returned').isoformat() if hasattr(r.get('returned'), 'isoformat') else (r.get('returned') or 'NULL'),
                    'returnedBy': r.get('returned_by') or '',
                    'returnCondition': r.get('return_condition') or ('Good' if raw == 'returned_good' else ('Damaged' if raw == 'returned_damaged' else None)),
                    'status': _status_label(raw),
                    'rawStatus': raw,
                })
    else:
        # Try as ref_no
        product = Product.find_by_ref_no(identifier)
        if not product:
            return jsonify({'success': False, 'message': f'{identifier} not found'}), 404
        rows = db.execute_query("""
            SELECT u.unit_serial, u.status AS rawStatus,
                   e.student_id, e.student_name AS student,
                   e.issue_date AS issued, u.returned_date AS returned,
                   u.return_condition, u.lot_no, u.ref_no, u.product_name,
                   e.issued_by, u.returned_by, e.issue_id
            FROM issued_units u
            JOIN issue_events e ON e.issue_id = u.issue_id
            WHERE u.ref_no = %s
            ORDER BY e.issue_date ASC
        """, (identifier,))
        for i, r in enumerate(rows, 1):
            raw = (r.get('rawStatus') or '').lower()
            cycles.append({
                'cycle': i,
                'issueId': r.get('issue_id') or '—',
                'student': r.get('student') or 'Student',
                'studentId': r.get('student_id') or '',
                'issuedBy': r.get('issued_by') or '',
                'unitId': r.get('unit_serial') or '—',
                'lotNo': r.get('lot_no') or '',
                'refNo': r.get('ref_no') or '',
                'issued': r.get('issued').isoformat() if hasattr(r.get('issued'), 'isoformat') else r.get('issued'),
                'returned': r.get('returned').isoformat() if hasattr(r.get('returned'), 'isoformat') else (r.get('returned') or 'NULL'),
                'returnedBy': r.get('returned_by') or '',
                'returnCondition': r.get('return_condition') or ('Good' if raw == 'returned_good' else ('Damaged' if raw == 'returned_damaged' else None)),
                'status': _status_label(raw),
                'rawStatus': raw,
            })

    return jsonify({
        'success': True,
        'unit': unit.to_dict() if unit else None,
        'product': product.to_dict() if product else {},
        'history': cycles,
        'summary': f"Summary: {len(cycles)} cycles",
    }), 200


# ---------- Products list ----------

@inventory_bp.route('/products', methods=['GET'])
@token_required
def get_products():
    products = Product.find_all()
    return jsonify({'success': True, 'data': [p.to_dict() for p in products]}), 200


# ---------- Stock list (from view) ----------

@inventory_bp.route('/', methods=['GET'])
@token_required
def get_inventory():
    db = StockLot.get_db()
    rows = db.execute_query("""
        SELECT v.*,
               (SELECT l.lot_no FROM stock_lots l 
                WHERE l.ref_no = v.ref_no 
                ORDER BY (l.status = 'open') DESC, l.created_at DESC LIMIT 1) AS lot_no,
               (SELECT l.expiry_date FROM stock_lots l 
                WHERE l.ref_no = v.ref_no 
                ORDER BY (l.status = 'open') DESC, l.created_at DESC LIMIT 1) AS expiry_date
        FROM v_available_stock v 
        ORDER BY v.product_name
    """)
    data = []
    for r in rows:
        exp = r.get('expiry_date')
        data.append({
            'refNo': r.get('ref_no'),
            'groupCode': r.get('group_code'),
            'product': r.get('product_name'),
            'productName': r.get('product_name'),
            'category': r.get('category'),
            'company': r.get('company_name'),
            'companyName': r.get('company_name'),
            'lotNo': r.get('lot_no') or '',
            'expiry': exp.isoformat() if hasattr(exp, 'isoformat') else (str(exp) if exp else ''),
            'isReturnable': bool(r.get('is_returnable')),
            'freshLocation': r.get('fresh_location'),
            'returnedLocation': r.get('returned_location'),
            'lowStockThreshold': r.get('low_stock_threshold'),
            'freshStock': int(r.get('fresh_stock') or 0),
            'returnedStock': int(r.get('returned_stock') or 0),
            'totalAvailable': int(r.get('total_available') or 0),
            'quantity': int(r.get('total_available') or 0),
            'issuedCount': int(r.get('issued_count') or 0),
            'failedCount': int(r.get('failed_count') or 0),
            'stockStatus': r.get('stock_status'),
            'size': r.get('size') or '',
            'isActive': bool(r.get('is_active', 1)),
            'status': 'active' if r.get('is_active', 1) else 'inactive',
        })
    return jsonify({'success': True, 'data': data}), 200


# ---------- Low stock ----------

@inventory_bp.route('/low-stock', methods=['GET'])
@token_required
def get_low_stock():
    db = StockLot.get_db()
    rows = db.execute_query("SELECT * FROM v_low_stock ORDER BY product_name")
    return jsonify({'success': True, 'data': rows}), 200


# ---------- Single lot ----------

@inventory_bp.route('/lot/<lot_id>', methods=['GET'])
@token_required
def get_lot(lot_id):
    lot = StockLot.find_by_lot_id(lot_id)
    if not lot:
        return jsonify({'success': False, 'message': 'Lot not found'}), 404
    return jsonify({'success': True, 'data': lot.to_dict()}), 200


# ---------- Lots by ref ----------

@inventory_bp.route('/lots/<ref_no>', methods=['GET'])
@token_required
def get_lots_by_ref(ref_no):
    lots = StockLot.find_by_ref_no(ref_no)
    return jsonify({'success': True, 'data': [l.to_dict() for l in lots]}), 200


# ---------- Available lots by ref (for issue modal) ----------

@inventory_bp.route('/available-lots/<ref_no>', methods=['GET'])
@token_required
def get_available_lots(ref_no):
    lots = StockLot.find_available_by_ref_no(ref_no)
    return jsonify({'success': True, 'data': [l.to_dict() for l in lots]}), 200


# ---------- Returned units by ref (for issue modal) ----------

@inventory_bp.route('/returned-units/<ref_no>', methods=['GET'])
@token_required
def get_returned_units(ref_no):
    units = IssuedUnit.find_returned_by_ref_no(ref_no)
    return jsonify({'success': True, 'data': [u.to_dict() for u in units]}), 200


# ---------- Toggle product active status ----------

@inventory_bp.route('/<ref_no>/status', methods=['PUT'])
@token_required
def toggle_product_status(ref_no):
    data = request.get_json() or {}
    target_status = data.get('status')
    db = StockLot.get_db()
    if target_status:
        is_active = 1 if target_status.lower() == 'active' else 0
        db.execute_query("UPDATE products SET is_active = %s WHERE ref_no = %s", (is_active, ref_no))
    else:
        db.execute_query("UPDATE products SET is_active = NOT is_active WHERE ref_no = %s", (ref_no,))
    return jsonify({'success': True, 'message': f'Status updated for {ref_no}'}), 200


# ---------- Update stock item / low stock threshold ----------

@inventory_bp.route('/<ref_no>', methods=['PUT'])
@inventory_bp.route('/<ref_no>/threshold', methods=['PUT'])
@token_required
def update_stock_item(ref_no):
    product = Product.find_by_ref_no(ref_no)
    if not product:
        return jsonify({'success': False, 'message': f'Product {ref_no} not found'}), 404

    data = request.get_json() or {}

    allowed_keys = {'low_stock_threshold', 'lowStockThreshold'}
    if not data or not any(k in allowed_keys for k in data.keys()):
        return jsonify({'success': False, 'message': 'Only low_stock_threshold is editable via this endpoint.'}), 400

    extra_keys = [k for k in data.keys() if k not in allowed_keys]
    if extra_keys:
        return jsonify({'success': False, 'message': 'Only low_stock_threshold is editable via this endpoint.'}), 400

    raw_val = data.get('low_stock_threshold')
    if raw_val is None:
        raw_val = data.get('lowStockThreshold')

    if raw_val is None or str(raw_val).strip() == '':
        return jsonify({'success': False, 'message': 'Threshold value is required'}), 400

    try:
        threshold_val = int(raw_val)
        if threshold_val < 0:
            return jsonify({'success': False, 'message': 'Threshold must be non-negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Threshold must be a valid number'}), 400

    db = StockLot.get_db()
    db.execute_query(
        "UPDATE products SET low_stock_threshold = %s, updated_at = NOW() WHERE ref_no = %s",
        (threshold_val, ref_no)
    )

    updated_prod = Product.find_by_ref_no(ref_no)
    return jsonify({
        'success': True,
        'message': f'Threshold updated to {threshold_val} for {ref_no}',
        'data': updated_prod.to_dict() if updated_prod else {'refNo': ref_no, 'lowStockThreshold': threshold_val}
    }), 200


# ---------- Receive single stock ----------

@inventory_bp.route('/receive', methods=['POST'])
@token_required
def receive_stock():
    data = request.get_json() or {}
    ref_no = data.get('ref_no')
    lot_no = data.get('lot_no')
    qty = data.get('quantity')
    invoice_no = data.get('invoice_no')
    credit_note_no = data.get('credit_note_no')
    expiry = data.get('expiry_date') or None
    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    if not ref_no or not lot_no or not qty:
        return jsonify({'success': False, 'message': 'ref_no, lot_no, quantity required'}), 400

    # Check product exists; if not, create
    product = Product.find_by_ref_no(ref_no)
    if not product:
        created = _auto_create_product(data)
        if not created:
            return jsonify({'success': False, 'message': f'Product {ref_no} not found and could not be created'}), 400

    db = StockLot.get_db()
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.callproc('sp_receive_stock', (
            ref_no, lot_no, int(qty),
            invoice_no or None, credit_note_no or None,
            expiry, user_name
        ))
        conn.commit()
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    finally:
        try:
            cursor.close()
        except:
            pass
        try:
            conn.close()
        except:
            pass

    return jsonify({'success': True, 'message': f'Received {qty} of {ref_no}'}), 201


# ---------- Bulk receive ----------

@inventory_bp.route('/bulk-receive', methods=['POST'])
@token_required
def bulk_receive_stock():
    rows = request.get_json() or []
    if not isinstance(rows, list):
        return jsonify({'success': False, 'message': 'Expected a JSON array'}), 400

    user = getattr(request, 'current_user', None)
    user_name = user.name if user else 'Admin'

    db = StockLot.get_db()
    conn = db.get_connection()
    cursor = conn.cursor()

    imported = 0
    errors = []

    for i, row in enumerate(rows):
        ref_no = row.get('ref_no') or row.get('refNo')
        lot_no = row.get('lot_no') or row.get('lotNo')
        qty = row.get('quantity')
        invoice_no = row.get('invoice_no') or row.get('invoiceNumber')
        credit_note_no = row.get('credit_note_no') or row.get('creditNoteNumber')
        expiry = row.get('expiry_date') or row.get('expiryDate') or None

        if not ref_no or not lot_no or not qty:
            errors.append({'row': i + 1, 'error': 'Missing ref_no / lot_no / quantity'})
            continue

        # Ensure product exists
        product = Product.find_by_ref_no(ref_no)
        if not product:
            created = _auto_create_product({
                'ref_no': ref_no,
                'product_name': row.get('product_name') or row.get('productName'),
                'category': row.get('category'),
                'size': row.get('size'),
                'company_name': row.get('company_name') or row.get('companyName'),
            })
            if not created:
                errors.append({'row': i + 1, 'error': f'Product {ref_no} could not be created'})
                continue

        try:
            cursor.callproc('sp_receive_stock', (
                ref_no, lot_no, int(qty),
                invoice_no or None, credit_note_no or None,
                expiry, user_name
            ))
            conn.commit()
            imported += 1
        except Exception as e:
            errors.append({'row': i + 1, 'error': str(e)})

    try:
        cursor.close()
    except:
        pass
    try:
        conn.close()
    except:
        pass

    return jsonify({
        'success': True,
        'imported': imported,
        'failed': len(errors),
        'errors': errors
    }), 201


# ---------- Helper to auto-create product ----------

def _auto_create_product(data):
    """Create product_groups + products row if missing."""
    ref_no = data.get('ref_no')
    product_name = data.get('product_name')
    category = data.get('category') or 'prosthetic'
    size = data.get('size') or ''
    company_name = data.get('company_name') or 'Unknown'

    if not ref_no or not product_name:
        return False

    db = StockLot.get_db()

    # Find or create vendor
    vendors = db.execute_query(
        "SELECT vendor_id FROM vendors WHERE vendor_name = %s",
        (company_name,)
    )
    if vendors:
        vendor_id = vendors[0]['vendor_id']
    else:
        db.execute_query(
            "INSERT INTO vendors (vendor_name, vendor_code) VALUES (%s, %s)",
            (company_name, company_name[:20].upper().replace(' ', '-'))
        )
        vendors = db.execute_query(
            "SELECT vendor_id FROM vendors WHERE vendor_name = %s",
            (company_name,)
        )
        vendor_id = vendors[0]['vendor_id'] if vendors else None

    if not vendor_id:
        return False

    # Find or create product_group
    group_code = f"{category[:3].upper()}-{ref_no}"[:45]
    groups = db.execute_query(
        "SELECT group_id FROM product_groups WHERE group_code = %s",
        (group_code,)
    )
    if groups:
        group_id = groups[0]['group_id']
    else:
        db.execute_query("""
            INSERT INTO product_groups
              (group_code, product_name, category, size, is_returnable)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            group_code, product_name, category, size,
            0 if category in ('implant', 'abutment') else 1
        ))
        groups = db.execute_query(
            "SELECT group_id FROM product_groups WHERE group_code = %s",
            (group_code,)
        )
        group_id = groups[0]['group_id'] if groups else None

    if not group_id:
        return False

    # Create product
    try:
        db.execute_query("""
            INSERT INTO products
              (ref_no, group_id, vendor_id, is_active)
            VALUES (%s, %s, %s, 1)
        """, (ref_no, group_id, vendor_id))
    except Exception as e:
        # Already exists — fine
        if 'Duplicate' not in str(e) and 'duplicate' not in str(e):
            return False

    return True


# ---------- Update stock quantity (admin only) ----------

@inventory_bp.route('/<ref_no>/quantity', methods=['PUT'])
@token_required
@admin_required
def update_stock_quantity(ref_no):
    data = request.get_json() or {}
    new_qty = data.get('new_quantity')
    reason = (data.get('reason') or '').strip()

    if new_qty is None:
        return jsonify({'success': False, 'message': 'new_quantity required'}), 400
    try:
        new_qty = int(new_qty)
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'new_quantity must be a number'}), 400

    if new_qty < 1:
        return jsonify({'success': False, 'message': 'Quantity must be at least 1'}), 400

    if not reason:
        return jsonify({'success': False, 'message': 'Reason is required'}), 400

    db = StockLot.get_db()
    conn = db.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lock all lots for this ref
        cursor.execute("""
            SELECT lot_id, qty_received, qty_available,
                   qty_issued_total, qty_failed_total, status
            FROM stock_lots
            WHERE ref_no = %s
            ORDER BY created_at ASC
            FOR UPDATE
        """, (ref_no,))
        lots = cursor.fetchall()

        if not lots:
            return jsonify({'success': False, 'message': f'No lots found for {ref_no}'}), 404

        current_total = sum(int(l['qty_received'] or 0) for l in lots)
        issued_failed = sum(int(l['qty_issued_total'] or 0) + int(l['qty_failed_total'] or 0) for l in lots)

        if new_qty < issued_failed:
            return jsonify({
                'success': False,
                'message': f'New quantity ({new_qty}) cannot be less than issued+failed total ({issued_failed})'
            }), 400

        delta = new_qty - current_total

        user = getattr(request, 'current_user', None)
        user_name = user.name if user else 'Admin'

        if delta == 0:
            return jsonify({'success': True, 'message': 'No change', 'data': {'refNo': ref_no, 'newQuantity': new_qty, 'delta': 0}}), 200

        if delta > 0:
            # Increase: add entire delta to first lot
            target = lots[0]
            cursor.execute("""
                UPDATE stock_lots
                SET qty_received = qty_received + %s,
                    qty_available = qty_available + %s,
                    qty_fresh = qty_fresh + %s,
                    status = IF(status = 'depleted', 'open', status),
                    version = version + 1
                WHERE lot_id = %s
            """, (delta, delta, delta, target['lot_id']))

            cursor.execute("""
                INSERT INTO stock_movements
                  (unit_serial, lot_id, ref_no, movement_type, from_status, to_status,
                   quantity_change, moved_by, remarks)
                VALUES (NULL, %s, %s, 'status_change', 'in_stock', 'in_stock',
                        %s, %s, %s)
            """, (target['lot_id'], ref_no, delta, user_name, reason))
        else:
            # Decrease: subtract using newest lots first
            remaining = -delta
            for lot in reversed(lots):
                if remaining <= 0:
                    break
                avail = int(lot['qty_available'] or 0)
                if avail <= 0:
                    continue
                take = min(avail, remaining)
                cursor.execute("""
                    UPDATE stock_lots
                    SET qty_received = GREATEST(qty_received - %s, 0),
                        qty_available = GREATEST(qty_available - %s, 0),
                        qty_fresh = GREATEST(qty_fresh - %s, 0),
                        status = IF(qty_available - %s = 0, 'depleted', status),
                        version = version + 1
                    WHERE lot_id = %s
                """, (take, take, take, take, lot['lot_id']))

                cursor.execute("""
                    INSERT INTO stock_movements
                      (unit_serial, lot_id, ref_no, movement_type, from_status, to_status,
                       quantity_change, moved_by, remarks)
                    VALUES (NULL, %s, %s, 'status_change', 'in_stock', 'in_stock',
                            %s, %s, %s)
                """, (lot['lot_id'], ref_no, -take, user_name, reason))

                remaining -= take

            if remaining > 0:
                conn.rollback()
                return jsonify({'success': False, 'message': 'Could not reduce quantity enough'}), 400

        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass

    return jsonify({
        'success': True,
        'message': f'Quantity updated to {new_qty}',
        'data': {'refNo': ref_no, 'newQuantity': new_qty, 'delta': delta}
    }), 200


# ---------- Product catalog create/update ----------

@inventory_bp.route('/products', methods=['POST'])
@token_required
def create_product():
    data = request.get_json() or {}
    ref_no = data.get('ref_no')
    product_name = data.get('product_name')
    if not ref_no or not product_name:
        return jsonify({'success': False, 'message': 'ref_no and product_name are required'}), 400

    if Product.find_by_ref_no(ref_no):
        return jsonify({'success': False, 'message': f'Product {ref_no} already exists'}), 409

    threshold = data.get('low_stock_threshold')
    if threshold is not None:
        try:
            threshold = int(threshold)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'message': 'Threshold must be a valid number'}), 400
        if threshold < 0:
            return jsonify({'success': False, 'message': 'Threshold must be non-negative'}), 400

    if not _auto_create_product(data):
        return jsonify({'success': False, 'message': 'Failed to create product'}), 400

    updates = {}
    for key in ('fresh_location', 'returned_location'):
        if key in data:
            updates[key] = data[key]
    if threshold is not None:
        updates['low_stock_threshold'] = threshold

    if updates:
        set_clause = ', '.join(f'{column} = %s' for column in updates)
        StockLot.get_db().execute_query(
            f"UPDATE products SET {set_clause}, updated_at = NOW() WHERE ref_no = %s",
            (*updates.values(), ref_no)
        )

    product = Product.find_by_ref_no(ref_no)
    return jsonify({
        'success': True,
        'message': 'Product created successfully',
        'data': product.to_dict() if product else {'refNo': ref_no},
    }), 201


@inventory_bp.route('/products/bulk', methods=['POST'])
@token_required
def bulk_create_products():
    rows = request.get_json()
    if not isinstance(rows, list):
        return jsonify({'success': False, 'message': 'Expected a JSON array'}), 400

    imported = 0
    errors = []
    db = StockLot.get_db()

    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append({'row': index, 'error': 'Row must be an object'})
            continue

        ref_no = row.get('ref_no')
        product_name = row.get('product_name')
        if not ref_no or not product_name:
            errors.append({'row': index, 'error': 'ref_no and product_name are required'})
            continue

        if Product.find_by_ref_no(ref_no):
            errors.append({'row': index, 'error': f'Product {ref_no} already exists'})
            continue

        threshold = row.get('low_stock_threshold')
        if threshold is not None:
            try:
                threshold = int(threshold)
            except (TypeError, ValueError):
                errors.append({'row': index, 'error': 'Threshold must be a valid number'})
                continue
            if threshold < 0:
                errors.append({'row': index, 'error': 'Threshold must be non-negative'})
                continue

        if not _auto_create_product(row):
            errors.append({'row': index, 'error': f'Product {ref_no} could not be created'})
            continue

        updates = {}
        for key in ('fresh_location', 'returned_location'):
            if key in row:
                updates[key] = row[key]
        if threshold is not None:
            updates['low_stock_threshold'] = threshold

        if updates:
            set_clause = ', '.join(f'{column} = %s' for column in updates)
            db.execute_query(
                f"UPDATE products SET {set_clause}, updated_at = NOW() WHERE ref_no = %s",
                (*updates.values(), ref_no)
            )
        imported += 1

    return jsonify({
        'success': True,
        'imported': imported,
        'failed': len(errors),
        'errors': errors,
    }), 201


@inventory_bp.route('/products/<ref_no>', methods=['PUT'])
@token_required
def update_product(ref_no):
    product = Product.find_by_ref_no(ref_no)
    if not product:
        return jsonify({'success': False, 'message': f'Product {ref_no} not found'}), 404

    data = request.get_json() or {}
    allowed_keys = {'fresh_location', 'returned_location', 'low_stock_threshold'}
    if not data or any(key not in allowed_keys for key in data):
        return jsonify({'success': False, 'message': 'Only fresh_location, returned_location, and low_stock_threshold can be updated'}), 400

    threshold = data.get('low_stock_threshold')
    if 'low_stock_threshold' in data:
        try:
            threshold = int(threshold)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'message': 'Threshold must be a valid number'}), 400
        if threshold < 0:
            return jsonify({'success': False, 'message': 'Threshold must be non-negative'}), 400

    updates = {
        key: threshold if key == 'low_stock_threshold' else value
        for key, value in data.items()
    }
    set_clause = ', '.join(f'{column} = %s' for column in updates)
    StockLot.get_db().execute_query(
        f"UPDATE products SET {set_clause}, updated_at = NOW() WHERE ref_no = %s",
        (*updates.values(), ref_no)
    )

    updated_product = Product.find_by_ref_no(ref_no)
    return jsonify({
        'success': True,
        'message': f'Product {ref_no} updated successfully',
        'data': updated_product.to_dict() if updated_product else {'refNo': ref_no},
    }), 200