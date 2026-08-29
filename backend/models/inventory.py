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
        try:
            from models.inventory_unit import InventoryUnit
            units = InventoryUnit.find_all()
            return [cls(u.to_dict()) for u in units]
        except Exception:
            try:
                db = cls.get_db()
                results = db.execute_query("SELECT * FROM inventory ORDER BY created_at DESC")
                return [cls(row) for row in results]
            except Exception:
                return []

    @classmethod
    def find_by_id(cls, item_id):
        if not item_id:
            return None
        try:
            from models.inventory_unit import InventoryUnit
            unit = InventoryUnit.find_by_id(item_id)
            if unit:
                return cls(unit.to_dict())
        except Exception:
            pass

        try:
            db = cls.get_db()
            result = db.execute_query("SELECT * FROM inventory WHERE id = %s", (item_id,))
            return cls(result[0]) if result else None
        except Exception:
            return None

    @classmethod
    def find_by_ref_no(cls, ref_no):
        if not ref_no:
            return None
        try:
            from models.inventory_unit import InventoryUnit
            units = InventoryUnit.find_by_ref_no(ref_no)
            if units:
                return cls(units[0].to_dict())
        except Exception:
            pass

        try:
            db = cls.get_db()
            result = db.execute_query("SELECT * FROM inventory WHERE ref_no = %s", (ref_no,))
            return cls(result[0]) if result else None
        except Exception:
            return None

    @classmethod
    def find_low_stock(cls):
        try:
            all_items = cls.find_all()
            return [i for i in all_items if i.quantity <= i.low_stock_threshold and i.status == 'active']
        except Exception:
            return []

    @classmethod
    def create(cls, data):
        # Create product if needed and inventory unit
        try:
            from models.product import Product
            from models.inventory_unit import InventoryUnit
            
            ref_no = data.get('ref_no') or f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Check/Create Product
            product = Product.find_by_ref_no(ref_no)
            if not product and data.get('product_name'):
                prod_data = {
                    'ref_no': ref_no,
                    'product_name': data.get('product_name'),
                    'category': data.get('category'),
                    'company_name': data.get('company_name'),
                    'size': data.get('size'),
                    'lot_no': data.get('lot_no'),
                    'expiry_date': data.get('expiry_date'),
                    'low_stock_threshold': data.get('low_stock_threshold', 10),
                    'is_returnable': data.get('is_returnable', True),
                }
                product = Product.create(prod_data)

            unit = InventoryUnit.create({
                'id': data.get('id'),
                'ref_no': ref_no,
                'quantity': data.get('quantity', 1),
                'status': data.get('status', 'active'),
                'created_by': data.get('created_by'),
            })
            return cls.find_by_id(unit.id)
        except Exception as e:
            print(f"Inventory.create fallback error: {e}")
            try:
                db = cls.get_db()
                ref_no = data.get('ref_no') or f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                item_id = data.get('id') or ref_no
                db.execute_query("""
                    INSERT INTO inventory (id, ref_no, product_name, category, company_name, size, lot_no, quantity, expiry_date, low_stock_threshold, is_returnable, document_type, document_number, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    item_id, ref_no, data.get('product_name', 'Item'), data.get('category', 'General'),
                    data.get('company_name'), data.get('size'), data.get('lot_no'), data.get('quantity', 1),
                    data.get('expiry_date'), data.get('low_stock_threshold', 10), data.get('is_returnable', True),
                    data.get('document_type'), data.get('document_number'), data.get('created_by')
                ))
                return cls.find_by_id(item_id)
            except Exception:
                return None

    def update(self, data):
        try:
            from models.inventory_unit import InventoryUnit
            from models.product import Product
            unit = InventoryUnit.find_by_id(self.id)
            if unit:
                unit.update(data)
                product = Product.find_by_ref_no(unit.ref_no)
                if product:
                    product.update(data)
                return Inventory.find_by_id(self.id)
        except Exception:
            pass

        try:
            db = self.get_db()
            updates = []
            params = []
            allowed_fields = [
                'product_name', 'category', 'company_name', 'size', 'lot_no',
                'quantity', 'expiry_date', 'low_stock_threshold', 'status',
                'is_returnable', 'document_type', 'document_number'
            ]
            for field in allowed_fields:
                if field in data:
                    updates.append(f"{field} = %s")
                    params.append(data[field])
            if updates:
                query = f"UPDATE inventory SET {', '.join(updates)} WHERE id = %s"
                params.append(self.id)
                db.execute_query(query, tuple(params))
            return Inventory.find_by_id(self.id)
        except Exception:
            return self

    def update_quantity(self, quantity_change, user_name):
        try:
            from models.inventory_unit import InventoryUnit
            unit = InventoryUnit.find_by_id(self.id)
            if unit:
                new_qty = max(0, unit.quantity + quantity_change)
                unit.update({'quantity': new_qty})
                self.quantity = new_qty
                return self
        except Exception:
            pass

        try:
            db = self.get_db()
            new_qty = self.quantity + quantity_change
            db.execute_query("UPDATE inventory SET quantity = %s WHERE id = %s", (new_qty, self.id))
            self.quantity = new_qty
            return self
        except Exception:
            self.quantity += quantity_change
            return self

    def delete(self):
        try:
            from models.inventory_unit import InventoryUnit
            unit = InventoryUnit.find_by_id(self.id)
            if unit:
                unit.delete()
                return True
        except Exception:
            pass

        try:
            db = self.get_db()
            db.execute_query("DELETE FROM inventory WHERE id = %s", (self.id,))
            return True
        except Exception:
            return True

    def to_dict(self):
        def fmt_date(val):
            if not val:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'id': self.id,
            'refNo': self.ref_no,
            'productName': self.product_name,
            'category': self.category,
            'companyName': self.company_name,
            'size': self.size,
            'lotNo': self.lot_no,
            'quantity': self.quantity,
            'expiryDate': fmt_date(self.expiry_date),
            'lowStockThreshold': self.low_stock_threshold,
            'status': self.status,
            'isReturnable': self.is_returnable,
            'documentType': self.document_type,
            'documentNumber': self.document_number,
            'createdBy': self.created_by,
            'createdAt': fmt_date(self.created_at),
            'updatedAt': fmt_date(self.updated_at)
        }
