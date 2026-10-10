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
    db = StockLot.get_db()
    rows = db.execute_query("""
        SELECT p.ref_no, p.group_id, p.vendor_id, p.fresh_location, p.returned_location,
               p.low_stock_threshold, p.is_active, p.created_at, p.updated_at,
               pg.group_code, pg.product_name, pg.category, pg.size, pg.is_returnable, pg.description,
               v.vendor_name AS company_name,
               COALESCE(SUM(sl.qty_available), 0) AS total_available,
               COALESCE(SUM(sl.qty_fresh), 0) AS fresh_stock,
               COALESCE(SUM(sl.qty_returned), 0) AS returned_stock,
               COUNT(sl.lot_id) AS lot_count
        FROM products p
        LEFT JOIN product_groups pg ON pg.group_id = p.group_id
        LEFT JOIN vendors v ON v.vendor_id = p.vendor_id
        LEFT JOIN stock_lots sl ON sl.ref_no = p.ref_no
        GROUP BY p.ref_no, p.group_id, p.vendor_id, p.fresh_location, p.returned_location,
                 p.low_stock_threshold, p.is_active, p.created_at, p.updated_at,
                 pg.group_code, pg.product_name, pg.category, pg.size, pg.is_returnable, pg.description,
                 v.vendor_name
        ORDER BY p.ref_no
    """)

    def fmt(v):
        if v is None:
            return None
        if hasattr(v, 'isoformat'):
            return v.isoformat()
        return str(v)

    data = []
    for r in rows:
        prod_name = r.get('product_name') or r.get('ref_no')
        comp_name = r.get('company_name') or ''
        data.append({
            'refNo': r.get('ref_no'),
            'groupId': r.get('group_id'),
            'vendorId': r.get('vendor_id'),
            'product': prod_name,
            'productName': prod_name,
            'category': r.get('category') or 'general',
            'company': comp_name,
            'companyName': comp_name,
            'size': r.get('size') or '',
            'description': r.get('description') or '',
            'isReturnable': bool(r.get('is_returnable', 1)),
            'groupCode': r.get('group_code') or '',
            'freshLocation': r.get('fresh_location') or '',
            'returnedLocation': r.get('returned_location') or '',
            'stockQty': int(r.get('total_available') or 0),
            'quantity': int(r.get('total_available') or 0),
            'totalAvailable': int(r.get('total_available') or 0),
            'freshStock': int(r.get('fresh_stock') or 0),
            'returnedStock': int(r.get('returned_stock') or 0),
            'lotCount': int(r.get('lot_count') or 0),
            'lowStockThreshold': r.get('low_stock_threshold', 10),
            'isActive': bool(r.get('is_active', 1)),
            'createdAt': fmt(r.get('created_at')),
            'updatedAt': fmt(r.get('updated_at')),
        })

    return jsonify({'success': True, 'data': data}), 200


# ---------- Stock list (from view) ----------

@inventory_bp.route('/', methods=['GET'])
@token_required
def get_inventory():
    include_all = request.args.get('include_all', 'false').lower() == 'true'
    db = StockLot.get_db()
    # Stock is displayed and adjusted at lot level.  The previous query read the
    # product summary view and then selected one arbitrary/latest lot number,
    # which made multiple lots of the same product appear as one shared count.
    where_clause = "" if include_all else "WHERE sl.qty_available > 0"
    rows = db.execute_query(f"""
        SELECT sl.lot_id, sl.ref_no, sl.lot_no, sl.invoice_no, sl.expiry_date,
               sl.qty_available, sl.qty_fresh, sl.qty_returned, sl.status AS lot_status,
               sl.created_at AS lot_created_at,
               p.fresh_location, p.returned_location, p.low_stock_threshold, p.is_active,
               pg.group_code, pg.product_name, pg.category, pg.size, pg.is_returnable,
               v.vendor_name AS company_name
        FROM stock_lots sl
        JOIN products p ON p.ref_no = sl.ref_no
        LEFT JOIN product_groups pg ON pg.group_id = p.group_id
        LEFT JOIN vendors v ON v.vendor_id = p.vendor_id
        {where_clause}
        ORDER BY pg.product_name, sl.created_at DESC
    """)
    data = []
    for r in rows:
        exp = r.get('expiry_date')
        data.append({
            'refNo': r.get('ref_no'),
            'lotId': r.get('lot_id'),
            'groupCode': r.get('group_code'),
            'product': r.get('product_name'),
            'productName': r.get('product_name'),
            'category': r.get('category'),
            'company': r.get('company_name'),
            'companyName': r.get('company_name'),
            'lotNo': r.get('lot_no') or '',
            'invoiceNo': r.get('invoice_no') or '',
            'expiry': exp.isoformat() if hasattr(exp, 'isoformat') else (str(exp) if exp else ''),
            'isReturnable': bool(r.get('is_returnable')),
            'freshLocation': r.get('fresh_location'),
            'returnedLocation': r.get('returned_location'),
            'lowStockThreshold': r.get('low_stock_threshold'),
            'freshStock': int(r.get('qty_fresh') or 0),
            'returnedStock': int(r.get('qty_returned') or 0),
            'totalAvailable': int(r.get('qty_available') or 0),
            'quantity': int(r.get('qty_available') or 0),
            'stockStatus': r.get('lot_status'),
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
    rows = db.execute_query("""
        SELECT v.* FROM v_low_stock v
        WHERE EXISTS (SELECT 1 FROM stock_lots l WHERE l.ref_no = v.ref_no)
        ORDER BY v.product_name
    """)
    return jsonify({'success': True, 'data': rows}), 200


# ---------- Single lot ----------

@inventory_bp.route('/lot/<lot_id>', methods=['GET'])
@token_required
def get_lot(lot_id):
    lot = StockLot.find_by_lot_id(lot_id)
    if not lot:
        return jsonify({'success': False, 'message': 'Lot not found'}), 404
    return jsonify({'success': True, 'data': lot.to_dict()}), 200


@inventory_bp.route('/lot/<lot_id>/quantity', methods=['PUT'])
@token_required
@admin_required
def update_lot_quantity(lot_id):
    """Adjust one lot only, without changing counts in other lots of the product."""
    data = request.get_json() or {}
    reason = (data.get('reason') or '').strip()
    try:
        new_qty = int(data.get('new_quantity'))
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
        cursor.execute("""
            SELECT lot_id, ref_no, qty_available
            FROM stock_lots WHERE lot_id = %s FOR UPDATE
        """, (lot_id,))
        lot = cursor.fetchone()
        if not lot:
            return jsonify({'success': False, 'message': 'Lot not found'}), 404
        current_qty = int(lot['qty_available'] or 0)
        delta = new_qty - current_qty
        user = getattr(request, 'current_user', None)
        user_name = user.name if user else 'Admin'
        if delta:
            cursor.execute("""
                UPDATE stock_lots
                SET qty_received = GREATEST(qty_received + %s, 0),
                    qty_available = %s,
                    qty_fresh = GREATEST(qty_fresh + %s, 0),
                    status = 'open', version = version + 1
                WHERE lot_id = %s
            """, (delta, new_qty, delta, lot_id))
            cursor.execute("""
                INSERT INTO stock_movements
                  (unit_serial, lot_id, ref_no, movement_type, from_status, to_status,
                   quantity_change, moved_by, remarks)
                VALUES (NULL, %s, %s, 'status_change', 'in_stock', 'in_stock',
                        %s, %s, %s)
            """, (lot_id, lot['ref_no'], delta, user_name, reason))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

    return jsonify({'success': True, 'data': {
        'lotId': lot_id, 'newQuantity': new_qty, 'delta': delta
    }}), 200


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
    """Create product_groups + products row if missing, or update if exists."""
    ref_no = str(data.get('ref_no') or data.get('refNo') or '').strip()
    product_name = str(data.get('product_name') or data.get('productName') or '').strip()
    category = str(data.get('category') or 'prosthetic').strip().lower()
    if category not in ('implant', 'abutment', 'prosthetic', 'tool', 'consumable', 'other'):
        category = 'other'
    size = str(data.get('size') or '').strip()
    company_name = str(data.get('company_name') or data.get('companyName') or data.get('company') or 'Unknown').strip()
    description = str(data.get('description') or '').strip()

    group_code = data.get('group_code') or data.get('groupCode')
    if group_code:
        group_code = str(group_code).strip()
    else:
        group_code = f"{category[:3].upper()}-{ref_no}"[:45]

    is_returnable = data.get('is_returnable') if 'is_returnable' in data else data.get('isReturnable')
    if is_returnable is not None:
        is_returnable = 1 if is_returnable else 0
    else:
        is_returnable = 0 if category in ('implant', 'abutment') else 1

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
    groups = db.execute_query(
        "SELECT group_id FROM product_groups WHERE group_code = %s",
        (group_code,)
    )
    if groups:
        group_id = groups[0]['group_id']
        db.execute_query("""
            UPDATE product_groups
            SET product_name = %s, category = %s, size = %s, is_returnable = %s, description = %s, updated_at = NOW()
            WHERE group_id = %s
        """, (product_name, category, size, is_returnable, description, group_id))
    else:
        db.execute_query("""
            INSERT INTO product_groups
              (group_code, product_name, category, size, is_returnable, description)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            group_code, product_name, category, size,
            is_returnable, description
        ))
        groups = db.execute_query(
            "SELECT group_id FROM product_groups WHERE group_code = %s",
            (group_code,)
        )
        group_id = groups[0]['group_id'] if groups else None

    if not group_id:
        return False

    fresh_loc = data.get('fresh_location') or data.get('freshLocation') or ''
    ret_loc = data.get('returned_location') or data.get('returnedLocation') or ''
    raw_thresh = data.get('low_stock_threshold') if 'low_stock_threshold' in data else data.get('lowStockThreshold', 10)
    try:
        thresh = int(raw_thresh)
    except (ValueError, TypeError):
        thresh = 10
    raw_act = data.get('is_active') if 'is_active' in data else data.get('isActive', 1)
    act = 1 if raw_act else 0

    # Create product
    try:
        db.execute_query("""
            INSERT INTO products
              (ref_no, group_id, vendor_id, fresh_location, returned_location, low_stock_threshold, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (ref_no, group_id, vendor_id, fresh_loc, ret_loc, thresh, act))
    except Exception as e:
        if 'Duplicate' not in str(e) and 'duplicate' not in str(e):
            return False
        # If exists, update
        db.execute_query("""
            UPDATE products
            SET group_id = %s, vendor_id = %s, fresh_location = %s, returned_location = %s,
                low_stock_threshold = %s, is_active = %s, updated_at = NOW()
            WHERE ref_no = %s
        """, (group_id, vendor_id, fresh_loc, ret_loc, thresh, act, ref_no))

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
    db = StockLot.get_db()
    product = Product.find_by_ref_no(ref_no)
    if not product:
        return jsonify({'success': False, 'message': f'Product {ref_no} not found'}), 404

    data = request.get_json() or {}

    product_updates = {}
    if 'fresh_location' in data or 'freshLocation' in data:
        product_updates['fresh_location'] = data.get('fresh_location') or data.get('freshLocation') or ''
    if 'returned_location' in data or 'returnedLocation' in data:
        product_updates['returned_location'] = data.get('returned_location') or data.get('returnedLocation') or ''
    if 'low_stock_threshold' in data or 'lowStockThreshold' in data:
        raw_t = data.get('low_stock_threshold') if 'low_stock_threshold' in data else data.get('lowStockThreshold')
        try:
            val = int(raw_t)
            if val >= 0:
                product_updates['low_stock_threshold'] = val
        except (ValueError, TypeError):
            pass
    if 'is_active' in data or 'isActive' in data:
        act = data.get('is_active') if 'is_active' in data else data.get('isActive')
        product_updates['is_active'] = 1 if act else 0

    company_name = data.get('company_name') or data.get('company') or data.get('companyName')
    if company_name:
        company_name = str(company_name).strip()
        vendors = db.execute_query("SELECT vendor_id FROM vendors WHERE vendor_name = %s", (company_name,))
        if vendors:
            product_updates['vendor_id'] = vendors[0]['vendor_id']
        else:
            db.execute_query("INSERT INTO vendors (vendor_name, vendor_code) VALUES (%s, %s)",
                             (company_name, company_name[:20].upper().replace(' ', '-')))
            v_rows = db.execute_query("SELECT vendor_id FROM vendors WHERE vendor_name = %s", (company_name,))
            if v_rows:
                product_updates['vendor_id'] = v_rows[0]['vendor_id']

    if product_updates:
        set_clause = ', '.join(f'{k} = %s' for k in product_updates)
        db.execute_query(f"UPDATE products SET {set_clause}, updated_at = NOW() WHERE ref_no = %s",
                         (*product_updates.values(), ref_no))

    group_updates = {}
    if 'group_code' in data or 'groupCode' in data:
        gc = data.get('group_code') or data.get('groupCode')
        if gc:
            group_updates['group_code'] = str(gc).strip()
    if 'product_name' in data or 'productName' in data:
        pname = data.get('product_name') or data.get('productName')
        if pname:
            group_updates['product_name'] = str(pname).strip()
    if 'category' in data:
        cat = str(data['category']).strip().lower()
        if cat in ('implant', 'abutment', 'prosthetic', 'tool', 'consumable', 'other'):
            group_updates['category'] = cat
    if 'size' in data:
        group_updates['size'] = str(data['size']).strip()
    if 'description' in data:
        group_updates['description'] = str(data.get('description') or '').strip()
    if 'is_returnable' in data or 'isReturnable' in data:
        ret = data.get('is_returnable') if 'is_returnable' in data else data.get('isReturnable')
        group_updates['is_returnable'] = 1 if ret else 0

    if group_updates and product.group_id:
        set_clause = ', '.join(f'{k} = %s' for k in group_updates)
        db.execute_query(f"UPDATE product_groups SET {set_clause}, updated_at = NOW() WHERE group_id = %s",
                         (*group_updates.values(), product.group_id))

    updated_product = Product.find_by_ref_no(ref_no)
    return jsonify({
        'success': True,
        'message': f'Product {ref_no} updated successfully',
        'data': updated_product.to_dict() if updated_product else {'refNo': ref_no},
    }), 200
