from database.db import Database

class ProductGroup:
    def __init__(self, data):
        self.id = data.get('id')
        self.group_code = data.get('group_code')
        self.product_name = data.get('product_name')
        self.category = data.get('category')
        self.size = data.get('size')
        self.is_returnable = data.get('is_returnable', True)
        self.description = data.get('description')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM product_groups ORDER BY product_name")
        return [cls(row) for row in results]

    @classmethod
    def find_by_id(cls, group_id):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM product_groups WHERE id = %s", (group_id,))
        return cls(result[0]) if result else None

    @classmethod
    def find_by_code(cls, group_code):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM product_groups WHERE group_code = %s", (group_code,))
        return cls(result[0]) if result else None

    @classmethod
    def find_by_product_name(cls, product_name, category=None, size=None):
        """Find product group by name, category, and size"""
        db = cls.get_db()
        query = "SELECT * FROM product_groups WHERE product_name = %s"
        params = [product_name]
        
        if category:
            query += " AND category = %s"
            params.append(category)
        
        if size:
            query += " AND size = %s"
            params.append(size)
        
        result = db.execute_query(query, tuple(params))
        return cls(result[0]) if result else None

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        group_code = data.get('group_code')
        if not group_code and data.get('product_name'):
            # Generate group_code from product_name
            group_code = data['product_name'].upper().replace(' ', '_').replace('/', '-').replace('.', '')
            group_code = group_code[:45]  # Truncate to avoid too long
        
        db.execute_query("""
            INSERT INTO product_groups (group_code, product_name, category, size, is_returnable, description)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            group_code,
            data['product_name'],
            data.get('category'),
            data.get('size'),
            data.get('is_returnable', True),
            data.get('description')
        ))
        # Get the inserted ID
        result = db.execute_query("SELECT LAST_INSERT_ID() as id")
        group_id = result[0]['id'] if result else None
        return cls.find_by_id(group_id)

    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['product_name', 'category', 'size', 'is_returnable', 'description']
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return self
        
        query = f"UPDATE product_groups SET {', '.join(updates)} WHERE id = %s"
        params.append(self.id)
        db.execute_query(query, tuple(params))
        return ProductGroup.find_by_id(self.id)

    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM product_groups WHERE id = %s", (self.id,))
        return True

    def get_products(self):
        """Get all products (variants) in this group"""
        from models.product import Product
        return Product.find_by_group_id(self.id)

    def to_dict(self):
        return {
            'id': self.id,
            'groupCode': self.group_code,
            'productName': self.product_name,
            'category': self.category,
            'size': self.size,
            'isReturnable': bool(self.is_returnable),
            'description': self.description,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }