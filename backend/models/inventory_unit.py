from database.db import Database
from models.product import Product

class InventoryUnit:
    def __init__(self, data):
        self.unit_id = data.get('unit_id')
        self.ref_no = data.get('ref_no')
        self.quantity = data.get('quantity', 1)
        self.invoice_no = data.get('invoice_no')
        self.credit_note_no = data.get('credit_note_no')
        self.status = data.get('status', 'active')
        self.is_returned_from_student = data.get('is_returned_from_student', False)
        self.qr_code = data.get('qr_code')
        self.created_by = data.get('created_by')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @property
    def id(self):
        return self.unit_id

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM inventory_units ORDER BY created_at DESC")
        return [cls(row) for row in results]

    @classmethod
    def find_by_id(cls, unit_id):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM inventory_units WHERE unit_id = %s", (unit_id,))
        return cls(result[0]) if result else None

    @classmethod
    def find_by_ref_no(cls, ref_no):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM inventory_units WHERE ref_no = %s", (ref_no,))
        return [cls(row) for row in results]

    @classmethod
    def find_by_status(cls, status):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM inventory_units WHERE status = %s", (status,))
        return [cls(row) for row in results]

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        
        unit_id = data.get('unit_id') or data.get('id') or f"{data['ref_no']}-{data.get('suffix', 'A')}"
        
        db.execute_query("""
            INSERT INTO inventory_units (unit_id, ref_no, quantity, invoice_no, credit_note_no, 
                                          status, is_returned_from_student, qr_code, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            unit_id,
            data['ref_no'],
            data.get('quantity', 1),
            data.get('invoice_no'),
            data.get('credit_note_no'),
            data.get('status', 'active'),
            data.get('is_returned_from_student', False),
            data.get('qr_code'),
            data.get('created_by')
        ))
        return cls.find_by_id(unit_id)

    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['quantity', 'status', 'is_returned_from_student', 'invoice_no', 'credit_note_no', 'qr_code']
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return self
        
        query = f"UPDATE inventory_units SET {', '.join(updates)} WHERE unit_id = %s"
        params.append(self.unit_id)
        db.execute_query(query, tuple(params))
        return InventoryUnit.find_by_id(self.unit_id)

    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM inventory_units WHERE unit_id = %s", (self.unit_id,))
        return True

    def mark_returned(self):
        return self.update({'is_returned_from_student': True, 'status': 'returned'})

    def mark_issued(self):
        return self.update({'status': 'issued'})

    def generate_qr_code(self):
        """Generate QR code data for this unit"""
        import json
        qr_data = {
            'unit_id': self.unit_id,
            'ref_no': self.ref_no,
            'url': f'/unit-history/{self.unit_id}'
        }
        return json.dumps(qr_data)

    def to_dict(self, product_map=None):
        def fmt_date(val):
            if not val:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        if product_map is not None:
            product_dict = product_map.get(self.ref_no, {})
        else:
            product = Product.find_by_ref_no(self.ref_no)
            product_dict = product.to_dict() if product else {}
        
        # Parse QR code if exists
        qr_data = None
        if self.qr_code:
            try:
                import json
                qr_data = json.loads(self.qr_code)
            except:
                qr_data = {'raw': self.qr_code}
        
        return {
            'unitId': self.unit_id,
            'id': self.unit_id,
            'refNo': self.ref_no,
            'quantity': self.quantity,
            'invoiceNo': self.invoice_no,
            'creditNoteNo': self.credit_note_no,
            'status': self.status,
            'isReturnedFromStudent': bool(self.is_returned_from_student),
            'isReturned': bool(self.is_returned_from_student),
            'qrCode': qr_data,
            'createdBy': self.created_by,
            'createdAt': fmt_date(self.created_at),
            'updatedAt': fmt_date(self.updated_at),
            **product_dict
        }