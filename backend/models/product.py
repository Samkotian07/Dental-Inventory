from database.db import Database
from models.product_group import ProductGroup


class Product:
    def __init__(self, data):
        self.ref_no = data.get('ref_no')
        self.group_id = data.get('group_id')
        self.vendor_id = data.get('vendor_id')
        self.fresh_location = data.get('fresh_location')
        self.returned_location = data.get('returned_location')
        self.low_stock_threshold = data.get('low_stock_threshold', 10)
        self.is_active = data.get('is_active', True)
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls, active_only=False):
        db = cls.get_db()
        query = "SELECT * FROM products"
        if active_only:
            query += " WHERE is_active = 1"
        query += " ORDER BY ref_no"
        rows = db.execute_query(query)
        return [cls(r) for r in rows]

    @classmethod
    def find_by_ref_no(cls, ref_no):
        if not ref_no:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM products WHERE ref_no = %s", (ref_no,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_by_group_id(cls, group_id):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM products WHERE group_id = %s", (group_id,)
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_by_vendor(cls, vendor_id):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM products WHERE vendor_id = %s", (vendor_id,)
        )
        return [cls(r) for r in rows]

    def get_group(self):
        if self.group_id:
            return ProductGroup.find_by_id(self.group_id)
        return None

    def get_product_name(self):
        g = self.get_group()
        return g.product_name if g else self.ref_no

    def get_category(self):
        g = self.get_group()
        return g.category if g else None

    def get_size(self):
        g = self.get_group()
        return g.size if g else None

    def get_is_returnable(self):
        g = self.get_group()
        return bool(g.is_returnable) if g else True

    def get_group_code(self):
        g = self.get_group()
        return g.group_code if g else None

    def get_vendor_name(self):
        if not self.vendor_id:
            return None
        db = self.get_db()
        rows = db.execute_query(
            "SELECT vendor_name FROM vendors WHERE vendor_id = %s",
            (self.vendor_id,)
        )
        return rows[0]['vendor_name'] if rows else None

    def to_dict(self):
        def fmt(v):
            if v is None:
                return None
            if hasattr(v, 'isoformat'):
                return v.isoformat()
            return str(v)

        g = self.get_group()
        vendor_name = self.get_vendor_name()
        product_name = g.product_name if g else self.ref_no
        category = (g.category if g else None) or self.get_category() or 'general'

        return {
            'refNo': self.ref_no,
            'groupId': self.group_id,
            'vendorId': self.vendor_id,
            'product': product_name,
            'productName': product_name,
            'category': category,
            'company': vendor_name,
            'companyName': vendor_name,
            'size': g.size if g else None,
            'description': (g.description if g else None) or '',
            'isReturnable': bool(g.is_returnable) if g else True,
            'groupCode': g.group_code if g else None,
            'freshLocation': self.fresh_location,
            'returnedLocation': self.returned_location,
            'lowStockThreshold': self.low_stock_threshold,
            'isActive': bool(self.is_active),
            'createdAt': fmt(self.created_at),
            'updatedAt': fmt(self.updated_at),
        }