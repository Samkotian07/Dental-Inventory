from database.db import Database


class ProductGroup:
    def __init__(self, data):
        self.id = data.get('group_id') or data.get('id')
        self.group_code = data.get('group_code')
        self.product_name = data.get('product_name')
        self.category = data.get('category')
        self.size = data.get('size')
        self.is_returnable = data.get('is_returnable', 1)
        self.description = data.get('description')
        self.is_active = data.get('is_active', 1)
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM product_groups ORDER BY product_name"
        )
        return [cls(r) for r in rows]

    @classmethod
    def find_by_id(cls, group_id):
        if not group_id:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM product_groups WHERE group_id = %s",
            (group_id,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_by_code(cls, group_code):
        if not group_code:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM product_groups WHERE group_code = %s",
            (group_code,)
        )
        return cls(rows[0]) if rows else None

    def to_dict(self):
        def fmt(v):
            if v is None:
                return None
            if hasattr(v, 'isoformat'):
                return v.isoformat()
            return str(v)

        return {
            'id': self.id,
            'groupId': self.id,
            'groupCode': self.group_code,
            'productName': self.product_name,
            'category': self.category,
            'size': self.size,
            'isReturnable': bool(self.is_returnable),
            'description': self.description,
            'isActive': bool(self.is_active),
            'createdAt': fmt(self.created_at),
            'updatedAt': fmt(self.updated_at),
        }