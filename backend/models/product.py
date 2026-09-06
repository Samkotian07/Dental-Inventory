from database.db import Database
from models.product_group import ProductGroup

class Product:
    def __init__(self, data):
        self.ref_no = data.get('ref_no')
        self.group_id = data.get('group_id')
        self.company_name = data.get('company_name')
        self.lot_no = data.get('lot_no')
        self.expiry_date = data.get('expiry_date')
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
        results = db.execute_query(query)
        return [cls(row) for row in results]

    @classmethod
    def find_by_ref_no(cls, ref_no):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM products WHERE ref_no = %s", (ref_no,))
        return cls(result[0]) if result else None

    @classmethod
    def find_by_group_id(cls, group_id):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM products WHERE group_id = %s", (group_id,))
        return [cls(row) for row in results]

    @classmethod
    def find_by_company(cls, company_name):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM products WHERE company_name = %s", (company_name,))
        return [cls(row) for row in results]

    def get_product_name(self):
        """Get product name from the product group"""
        if self.group_id:
            group = ProductGroup.find_by_id(self.group_id)
            if group:
                return group.product_name
        return self.ref_no

    def get_category(self):
        """Get category from the product group"""
        if self.group_id:
            group = ProductGroup.find_by_id(self.group_id)
            if group:
                return group.category
        return None

    def get_is_returnable(self):
        """Get is_returnable from the product group"""
        if self.group_id:
            group = ProductGroup.find_by_id(self.group_id)
            if group:
                return group.is_returnable
        return True

    def get_size(self):
        """Get size from the product group"""
        if self.group_id:
            group = ProductGroup.find_by_id(self.group_id)
            if group:
                return group.size
        return None

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        
        # Check if group_id is provided, if not try to find or create group
        group_id = data.get('group_id')
        if not group_id and data.get('product_name'):
            # Try to find existing group
            group = ProductGroup.find_by_product_name(
                data['product_name'],
                data.get('category'),
                data.get('size')
            )
            if group:
                group_id = group.id
            else:
                # Create new group
                group = ProductGroup.create({
                    'product_name': data['product_name'],
                    'category': data.get('category'),
                    'size': data.get('size'),
                    'is_returnable': data.get('is_returnable', True),
                    'description': f"Product: {data['product_name']}"
                })
                group_id = group.id if group else None
        
        db.execute_query("""
            INSERT INTO products (ref_no, group_id, company_name, lot_no, expiry_date, 
                                  fresh_location, returned_location, low_stock_threshold, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['ref_no'],
            group_id,
            data['company_name'],
            data['lot_no'],
            data.get('expiry_date'),
            data.get('fresh_location'),
            data.get('returned_location'),
            data.get('low_stock_threshold', 10),
            data.get('is_active', True)
        ))
        return cls.find_by_ref_no(data['ref_no'])

    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['group_id', 'company_name', 'lot_no', 'expiry_date', 
                          'fresh_location', 'returned_location', 'low_stock_threshold', 'is_active']
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

    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM products WHERE ref_no = %s", (self.ref_no,))
        return True

    def get_group(self):
        if self.group_id:
            return ProductGroup.find_by_id(self.group_id)
        return None

    def get_inventory_units(self):
        from models.inventory_unit import InventoryUnit
        return InventoryUnit.find_by_ref_no(self.ref_no)

    def to_dict(self):
        def fmt_date(val):
            if not val:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        group = self.get_group()
        group_dict = group.to_dict() if group else {}
        
        # ⭐ Get product_name from group
        product_name = self.get_product_name()
        
        return {
            'refNo': self.ref_no,
            'productName': product_name,
            'group_id': self.group_id,
            'companyName': self.company_name,
            'lotNo': self.lot_no,
            'expiryDate': fmt_date(self.expiry_date),
            'freshLocation': self.fresh_location,
            'returnedLocation': self.returned_location,
            'lowStockThreshold': self.low_stock_threshold,
            'isActive': bool(self.is_active),
            'createdAt': fmt_date(self.created_at),
            'updatedAt': fmt_date(self.updated_at),
            **group_dict
        }