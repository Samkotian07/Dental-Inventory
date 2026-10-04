from database.db import Database


class IssuedUnit:
    def __init__(self, data):
        self.unit_serial = data.get('unit_serial')
        self.lot_id = data.get('lot_id')
        self.issue_id = data.get('issue_id')
        self.ref_no = data.get('ref_no')
        self.lot_no = data.get('lot_no')
        self.product_name = data.get('product_name')
        self.category = data.get('category')
        self.is_implant_abutment = data.get('is_implant_abutment', 0)
        self.status = data.get('status')
        self.issued_date = data.get('issued_date')
        self.returned_date = data.get('returned_date')
        self.return_condition = data.get('return_condition')
        self.returned_by = data.get('returned_by')
        self.qr_code = data.get('qr_code')
        self.qr_generated_at = data.get('qr_generated_at')
        self.qr_print_count = data.get('qr_print_count', 0)
        self.version = data.get('version', 0)
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_by_serial(cls, unit_serial):
        if not unit_serial:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM issued_units WHERE unit_serial = %s",
            (unit_serial,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_by_ref_no(cls, ref_no):
        if not ref_no:
            return []
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM issued_units WHERE ref_no = %s ORDER BY created_at ASC",
            (ref_no,)
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_by_issue_id(cls, issue_id):
        if not issue_id:
            return []
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM issued_units WHERE issue_id = %s ORDER BY created_at ASC",
            (issue_id,)
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_active_by_student(cls, student_id):
        if not student_id:
            return []
        db = cls.get_db()
        rows = db.execute_query(
            """SELECT u.* FROM issued_units u
               JOIN issue_events e ON e.issue_id = u.issue_id
               WHERE e.student_id = %s
                 AND u.status IN ('issued', 'awaiting_vendor')
               ORDER BY u.issued_date DESC""",
            (student_id,)
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_returned_by_ref_no(cls, ref_no):
        if not ref_no:
            return []
        db = cls.get_db()
        rows = db.execute_query(
            """SELECT * FROM issued_units
               WHERE ref_no = %s AND status = 'returned_good'
               ORDER BY returned_date ASC""",
            (ref_no,)
        )
        return [cls(r) for r in rows]

    def to_dict(self):
        def fmt(v):
            if v is None:
                return None
            if hasattr(v, 'isoformat'):
                return v.isoformat()
            return str(v)

        return {
            'unitId': self.unit_serial,
            'unitSerial': self.unit_serial,
            'lotId': self.lot_id,
            'issueId': self.issue_id,
            'refNo': self.ref_no,
            'lotNo': self.lot_no,
            'productName': self.product_name,
            'category': self.category,
            'isImplantAbutment': bool(self.is_implant_abutment),
            'status': self.status,
            'issuedDate': fmt(self.issued_date),
            'returnedDate': fmt(self.returned_date),
            'returnCondition': self.return_condition,
            'returnedBy': self.returned_by,
            'qrCode': self.qr_code,
            'qrPrintCount': self.qr_print_count,
            'createdAt': fmt(self.created_at),
            'updatedAt': fmt(self.updated_at),
        }