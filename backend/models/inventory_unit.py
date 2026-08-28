from database.db import Database
from models.product import Product

class InventoryUnit:
    def __init__(self, data):
        self.id = data.get('id')
        self.ref_no = data.get('ref_no')
        self.quantity = data.get('quantity', 1)
        self.status = data.get('status', 'active')
        self.created_by = data.get('created_by')
        self.created_at = data.get('created_at')

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
        result = db.execute_query("SELECT * FROM inventory_units WHERE id = %s", (unit_id,))
        return cls(result[0]) if result else None

    @classmethod
    def find_by_ref_no(cls, ref_no):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM inventory_units WHERE ref_no = %s", (ref_no,))
        return [cls(row) for row in results]

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        
        # Generate unique ID if not provided
        unit_id = data.get('id') or f"{data['ref_no']}-{data.get('suffix', 'A')}"
        
        db.execute_query("""
            INSERT INTO inventory_units (id, ref_no, quantity, status, created_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            unit_id,
            data['ref_no'],
            data.get('quantity', 1),
            data.get('status', 'active'),
            data.get('created_by')
        ))
        return cls.find_by_id(unit_id)

    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['quantity', 'status']
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return self
        
        query = f"UPDATE inventory_units SET {', '.join(updates)} WHERE id = %s"
        params.append(self.id)
        db.execute_query(query, tuple(params))
        return InventoryUnit.find_by_id(self.id)

    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM inventory_units WHERE id = %s", (self.id,))
        return True

    def to_dict(self):
        # Get product details
        product = Product.find_by_ref_no(self.ref_no)
        product_dict = product.to_dict() if product else {}
        
        return {
            'id': self.id,
            'refNo': self.ref_no,
            'quantity': self.quantity,
            'status': self.status,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            **product_dict
        }