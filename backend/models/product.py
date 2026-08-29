from database.db import Database

class Product:
    def __init__(self, data):
        self.ref_no = data.get('ref_no')
        self.product_name = data.get('product_name')
        self.category = data.get('category')
        self.company_name = data.get('company_name')
        self.size = data.get('size')
        self.lot_no = data.get('lot_no')
        self.expiry_date = data.get('expiry_date')
        self.low_stock_threshold = data.get('low_stock_threshold', 10)
        self.is_returnable = data.get('is_returnable', True)
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM products ORDER BY created_at DESC")
        return [cls(row) for row in results]

    @classmethod
    def find_by_ref_no(cls, ref_no):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM products WHERE ref_no = %s", (ref_no,))
        return cls(result[0]) if result else None

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        db.execute_query("""
            INSERT INTO products (ref_no, product_name, category, company_name, size, lot_no, expiry_date, low_stock_threshold, is_returnable)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['ref_no'],
            data['product_name'],
            data.get('category'),
            data.get('company_name'),
            data.get('size'),
            data.get('lot_no'),
            data.get('expiry_date'),
            data.get('low_stock_threshold', 10),
            data.get('is_returnable', True)
        ))
        return cls.find_by_ref_no(data['ref_no'])

    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['product_name', 'category', 'company_name', 'size', 'lot_no', 'expiry_date', 'low_stock_threshold', 'is_returnable']
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return self
        
        query = f"UPDATE products SET {', '.join(updates)} WHERE ref_no = %s"
        params.append(self.ref_no)
        db.execute_query(query, tuple(params))
        return Product.find_by_ref_no(self.ref_no)

    def to_dict(self):
        def fmt_date(val):
            if not val:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'refNo': self.ref_no,
            'productName': self.product_name,
            'category': self.category,
            'companyName': self.company_name,
            'size': self.size,
            'lotNo': self.lot_no,
            'expiryDate': fmt_date(self.expiry_date),
            'lowStockThreshold': self.low_stock_threshold,
            'isReturnable': self.is_returnable,
            'createdAt': fmt_date(self.created_at),
            'updatedAt': fmt_date(self.updated_at)
        }