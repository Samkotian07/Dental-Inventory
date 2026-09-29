from database.db import Database


class StockLot:
    def __init__(self, data):
        self.lot_id = data.get('lot_id')
        self.ref_no = data.get('ref_no')
        self.lot_no = data.get('lot_no')
        self.invoice_no = data.get('invoice_no')
        self.expiry_date = data.get('expiry_date')
        self.qty_received = data.get('qty_received', 0)
        self.qty_available = data.get('qty_available', 0)
        self.qty_fresh = data.get('qty_fresh', 0)
        self.qty_returned = data.get('qty_returned', 0)
        self.qty_issued_total = data.get('qty_issued_total', 0)
        self.qty_failed_total = data.get('qty_failed_total', 0)
        self.fresh_location = data.get('fresh_location')
        self.returned_location = data.get('returned_location')
        self.status = data.get('status', 'open')
        self.version = data.get('version', 0)
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM stock_lots ORDER BY created_at DESC"
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_by_lot_id(cls, lot_id):
        if not lot_id:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM stock_lots WHERE lot_id = %s",
            (lot_id,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_by_ref_no(cls, ref_no):
        if not ref_no:
            return []
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM stock_lots WHERE ref_no = %s ORDER BY created_at ASC",
            (ref_no,)
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_available_by_ref_no(cls, ref_no):
        if not ref_no:
            return []
        db = cls.get_db()
        rows = db.execute_query(
            """SELECT * FROM stock_lots
               WHERE ref_no = %s
                 AND qty_available > 0
                 AND status = 'open'
               ORDER BY created_at ASC""",
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
            'lotId': self.lot_id,
            'refNo': self.ref_no,
            'lotNo': self.lot_no,
            'invoiceNo': self.invoice_no,
            'expiryDate': fmt(self.expiry_date),
            'qtyReceived': self.qty_received,
            'qtyAvailable': self.qty_available,
            'qtyFresh': self.qty_fresh,
            'qtyReturned': self.qty_returned,
            'qtyIssuedTotal': self.qty_issued_total,
            'qtyFailedTotal': self.qty_failed_total,
            'freshLocation': self.fresh_location,
            'returnedLocation': self.returned_location,
            'status': self.status,
            'version': self.version,
            'createdAt': fmt(self.created_at),
            'updatedAt': fmt(self.updated_at),
        }