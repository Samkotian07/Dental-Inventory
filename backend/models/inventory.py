from database.db import Database
from datetime import datetime

class Inventory:
    def __init__(self, data):
        self.id = data.get('id')
        self.ref_no = data.get('ref_no')
        self.product_name = data.get('product_name')
        self.category = data.get('category')
        self.company_name = data.get('company_name')
        self.size = data.get('size')
        self.lot_no = data.get('lot_no')
        self.quantity = data.get('quantity', 0)
        self.expiry_date = data.get('expiry_date')
        self.low_stock_threshold = data.get('low_stock_threshold', 10)
        self.status = data.get('status', 'active')
        self.is_returnable = data.get('is_returnable', True)
        self.document_type = data.get('document_type')
        self.document_number = data.get('document_number')
        self.created_by = data.get('created_by')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM inventory ORDER BY created_at DESC")
        return [cls(row) for row in results]

    @classmethod
    def find_by_id(cls, item_id):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM inventory WHERE id = %s", (item_id,))
        return cls(result[0]) if result else None

    @classmethod
    def find_by_ref_no(cls, ref_no):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM inventory WHERE ref_no = %s", (ref_no,))
        return cls(result[0]) if result else None

    @classmethod
    def find_low_stock(cls):
        db = cls.get_db()
        results = db.execute_query("""
            SELECT * FROM inventory 
            WHERE quantity <= low_stock_threshold AND status = 'active'
            ORDER BY quantity ASC
        """)
        return [cls(row) for row in results]

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        
        # Generate a unique ref_no
        ref_no = data.get('ref_no')
        
        # If ref_no is provided, check if it already exists
        if ref_no:
            existing = db.execute_query("SELECT id FROM inventory WHERE ref_no = %s", (ref_no,))
            if existing:
                # Ref_no exists, generate a new one
                ref_no = None
        
        # Generate new ref_no if not provided or if it already exists
        if not ref_no:
            result = db.execute_query("SELECT MAX(CAST(SUBSTRING(ref_no, 5) AS UNSIGNED)) as max_ref FROM inventory")
            next_num = (result[0]['max_ref'] if result and result[0]['max_ref'] else 0) + 1
            ref_no = f"INV-{str(next_num).zfill(3)}"
        
        # Generate ID based on ref_no
        item_id = data.get('id') or ref_no
        
        db.execute_query("""
            INSERT INTO inventory (id, ref_no, product_name, category, company_name, size, lot_no, quantity, expiry_date, low_stock_threshold, is_returnable, document_type, document_number, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            item_id,
            ref_no,
            data['product_name'],
            data['category'],
            data.get('company_name'),
            data.get('size'),
            data['lot_no'],
            data.get('quantity', 0),
            data.get('expiry_date'),
            data.get('low_stock_threshold', 10),
            data.get('is_returnable', True),
            data.get('document_type'),
            data.get('document_number'),
            data.get('created_by')
        ))
        return cls.find_by_id(item_id)

    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        # Map camelCase to snake_case
        key_map = {
            'lowStockThreshold': 'low_stock_threshold',
            'productName': 'product_name',
            'companyName': 'company_name',
            'expiryDate': 'expiry_date',
            'lotNo': 'lot_no',
            'isReturnable': 'is_returnable'
        }
        
        normalized_data = dict(data)
        for camel, snake in key_map.items():
            if camel in normalized_data and snake not in normalized_data:
                normalized_data[snake] = normalized_data[camel]

        allowed_fields = ['product_name', 'category', 'company_name', 'size', 'lot_no', 'quantity', 'expiry_date', 'low_stock_threshold', 'status', 'is_returnable']
        for field in allowed_fields:
            if field in normalized_data:
                updates.append(f"{field} = %s")
                params.append(normalized_data[field])
        
        if not updates:
            return self
        
        query = f"UPDATE inventory SET {', '.join(updates)} WHERE id = %s"
        params.append(self.id)
        db.execute_query(query, tuple(params))
        return Inventory.find_by_id(self.id)

    def update_quantity(self, quantity_change, user_name):
        """Update quantity by adding/subtracting"""
        db = self.get_db()
        new_qty = self.quantity + quantity_change
        db.execute_query("UPDATE inventory SET quantity = %s WHERE id = %s", (new_qty, self.id))
        self.quantity = new_qty
        return self

    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM inventory WHERE id = %s", (self.id,))
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'refNo': self.ref_no,
            'productName': self.product_name,
            'category': self.category,
            'companyName': self.company_name,
            'size': self.size,
            'lotNo': self.lot_no,
            'quantity': self.quantity,
            'expiryDate': self.expiry_date.isoformat() if self.expiry_date else None,
            'lowStockThreshold': self.low_stock_threshold,
            'status': self.status,
            'isReturnable': self.is_returnable,
            'documentType': self.document_type,
            'documentNumber': self.document_number,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
