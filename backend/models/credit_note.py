from database.db import Database


class CreditNote:
    def __init__(self, data):
        self.credit_note_id = data.get('credit_note_id')
        self.vendor_id = data.get('vendor_id')
        self.credit_note_no = data.get('credit_note_no')
        self.amount = data.get('amount')
        self.remaining_amount = data.get('remaining_amount')
        self.currency = data.get('currency', 'INR')
        self.issued_date = data.get('issued_date')
        self.expiry_date = data.get('expiry_date')
        self.source_return_id = data.get('source_return_id')
        self.status = data.get('status', 'open')
        self.deleted_at = data.get('deleted_at')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls, include_deleted=False):
        db = cls.get_db()
        if include_deleted:
            rows = db.execute_query(
                "SELECT * FROM credit_notes ORDER BY created_at DESC"
            )
        else:
            rows = db.execute_query(
                "SELECT * FROM credit_notes WHERE deleted_at IS NULL ORDER BY created_at DESC"
            )
        return [cls(r) for r in rows]

    @classmethod
    def find_by_id(cls, credit_note_id):
        if not credit_note_id:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM credit_notes WHERE credit_note_id = %s",
            (credit_note_id,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_open_by_vendor(cls, vendor_id):
        db = cls.get_db()
        rows = db.execute_query(
            """SELECT * FROM credit_notes
               WHERE vendor_id = %s
                 AND deleted_at IS NULL
                 AND status IN ('open', 'partially_used')
               ORDER BY issued_date ASC""",
            (vendor_id,)
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
            'creditNoteId': self.credit_note_id,
            'vendorId': self.vendor_id,
            'creditNoteNo': self.credit_note_no,
            'amount': float(self.amount) if self.amount is not None else None,
            'remainingAmount': float(self.remaining_amount) if self.remaining_amount is not None else None,
            'currency': self.currency,
            'issuedDate': fmt(self.issued_date),
            'expiryDate': fmt(self.expiry_date),
            'sourceReturnId': self.source_return_id,
            'status': self.status,
            'createdAt': fmt(self.created_at),
            'updatedAt': fmt(self.updated_at),
        }