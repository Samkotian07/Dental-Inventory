from database.db import Database


class VendorReturn:
    def __init__(self, data):
        self.return_id = data.get('return_id')
        self.vendor_id = data.get('vendor_id')
        self.return_type = data.get('return_type')
        self.return_date = data.get('return_date')
        self.reason = data.get('reason')
        self.status = data.get('status', 'pending')
        self.created_by = data.get('created_by')
        self.completed_at = data.get('completed_at')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
        self.items = []

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def _load_items(cls, return_id):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM vendor_return_items WHERE return_id = %s ORDER BY id",
            (return_id,)
        )
        return rows

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM vendor_returns ORDER BY created_at DESC"
        )
        result = []
        for r in rows:
            obj = cls(r)
            obj.items = cls._load_items(obj.return_id)
            result.append(obj)
        return result

    @classmethod
    def find_by_id(cls, return_id):
        if not return_id:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM vendor_returns WHERE return_id = %s",
            (return_id,)
        )
        if not rows:
            return None
        obj = cls(rows[0])
        obj.items = cls._load_items(return_id)
        return obj

    def to_dict(self):
        def fmt(v):
            if v is None:
                return None
            if hasattr(v, 'isoformat'):
                return v.isoformat()
            return str(v)

        return {
            'returnId': self.return_id,
            'vendorId': self.vendor_id,
            'type': self.return_type,
            'returnDate': fmt(self.return_date),
            'reason': self.reason,
            'status': self.status,
            'createdBy': self.created_by,
            'completedAt': fmt(self.completed_at),
            'createdAt': fmt(self.created_at),
            'updatedAt': fmt(self.updated_at),
            'items': [
                {
                    'id': i.get('id'),
                    'unitSerial': i.get('unit_serial'),
                    'refNo': i.get('ref_no'),
                    'lotNo': i.get('lot_no'),
                    'productName': i.get('product_name'),
                    'quantity': i.get('quantity'),
                    'replacementUnitSerial': i.get('replacement_unit_serial'),
                    'replacementLotNo': i.get('replacement_lot_no'),
                }
                for i in self.items
            ],
        }