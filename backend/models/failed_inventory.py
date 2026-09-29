from database.db import Database


class FailedInventory:
    def __init__(self, data):
        self.id = data.get('id')
        self.lot_id = data.get('lot_id')
        self.ref_no = data.get('ref_no')
        self.lot_no = data.get('lot_no')
        self.product_name = data.get('product_name')
        self.category = data.get('category')
        self.vendor_name = data.get('vendor_name')
        self.quantity = data.get('quantity', 0)
        self.failure_type = data.get('failure_type')
        self.failure_reason = data.get('failure_reason')
        self.status = data.get('status', 'pending')
        self.moved_by = data.get('moved_by')
        self.restored_lot_id = data.get('restored_lot_id')
        self.vendor_return_id = data.get('vendor_return_id')
        self.remarks = data.get('remarks')
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
            "SELECT * FROM failed_inventory ORDER BY created_at DESC"
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_by_id(cls, fail_id):
        if not fail_id:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM failed_inventory WHERE id = %s",
            (fail_id,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_by_status(cls, status):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM failed_inventory WHERE status = %s ORDER BY created_at DESC",
            (status,)
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_pending(cls):
        return cls.find_by_status('pending')

    def to_dict(self):
        def fmt(v):
            if v is None:
                return None
            if hasattr(v, 'isoformat'):
                return v.isoformat()
            return str(v)

        return {
            'id': self.id,
            'lotId': self.lot_id,
            'refNo': self.ref_no,
            'lotNo': self.lot_no,
            'productName': self.product_name,
            'category': self.category,
            'vendorName': self.vendor_name,
            'quantity': self.quantity,
            'failureType': self.failure_type,
            'failureReason': self.failure_reason,
            'status': self.status,
            'movedBy': self.moved_by,
            'restoredLotId': self.restored_lot_id,
            'vendorReturnId': self.vendor_return_id,
            'remarks': self.remarks,
            'createdAt': fmt(self.created_at),
            'updatedAt': fmt(self.updated_at),
        }