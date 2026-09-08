from database.db import Database
from datetime import datetime

class Inventory:
    def __init__(self, data):
        self.id = data.get('id') or data.get('unitId') or data.get('unit_id')
        self.ref_no = data.get('ref_no') or data.get('refNo')
        self.product_name = data.get('product_name') or data.get('productName') or data.get('product')
        self.category = data.get('category')
        self.company_name = data.get('company_name') or data.get('companyName') or data.get('company')
        self.size = data.get('size')
        self.lot_no = data.get('lot_no') or data.get('lotNo')
        self.quantity = data.get('quantity', 0)
        self.expiry_date = data.get('expiry_date') or data.get('expiryDate')
        self.low_stock_threshold = data.get('low_stock_threshold') or data.get('lowStockThreshold', 10)
        self.status = data.get('status', 'active')
        self.is_returnable = data.get('is_returnable') if 'is_returnable' in data else data.get('isReturnable', True)
        self.document_type = data.get('document_type') or data.get('documentType')
        self.document_number = data.get('document_number') or data.get('documentNumber')
        self.created_by = data.get('created_by') or data.get('createdBy')
        self.created_at = data.get('created_at') or data.get('createdAt')
        self.updated_at = data.get('updated_at') or data.get('updatedAt')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        try:
            from models.inventory_unit import InventoryUnit
            units = InventoryUnit.find_all()
            return [cls(u.to_dict()) for u in units]
        except Exception as e:
            print(f"Inventory.find_all error: {e}")
            return []

    @classmethod
    def find_by_id(cls, item_id):
        if not item_id:
            return None
        try:
            from models.inventory_unit import InventoryUnit
            from models.product import Product

            unit = InventoryUnit.find_by_id(item_id)
            if unit:
                return cls(unit.to_dict())

            units = InventoryUnit.find_by_ref_no(item_id)
            if units:
                return cls(units[0].to_dict())

            product = Product.find_by_ref_no(item_id)
            if product:
                return cls({
                    'id': product.ref_no,
                    'ref_no': product.ref_no,
                    'product_name': product.get_product_name(),
                    'category': product.get_category(),
                    'company_name': product.company_name,
                    'size': product.get_size(),
                    'lot_no': product.lot_no,
                    'quantity': 0,
                    'expiry_date': product.expiry_date,
                    'is_returnable': product.get_is_returnable(),
                })
        except Exception as e:
            print(f"Inventory.find_by_id error: {e}")
        return None

    @classmethod
    def find_by_ref_no(cls, ref_no):
        if not ref_no:
            return None
        try:
            from models.inventory_unit import InventoryUnit
            from models.product import Product

            units = InventoryUnit.find_by_ref_no(ref_no)
            if units:
                return cls(units[0].to_dict())

            unit = InventoryUnit.find_by_id(ref_no)
            if unit:
                return cls(unit.to_dict())

            product = Product.find_by_ref_no(ref_no)
            if product:
                return cls({
                    'id': product.ref_no,
                    'ref_no': product.ref_no,
                    'product_name': product.get_product_name(),
                    'category': product.get_category(),
                    'company_name': product.company_name,
                    'size': product.get_size(),
                    'lot_no': product.lot_no,
                    'quantity': 0,
                    'expiry_date': product.expiry_date,
                    'is_returnable': product.get_is_returnable(),
                })
        except Exception as e:
            print(f"Inventory.find_by_ref_no error: {e}")
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
        try:
            from models.product import Product
            from models.inventory_unit import InventoryUnit
            
            ref_no = data.get('ref_no') or data.get('refNo') or f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            product = Product.find_by_ref_no(ref_no)
            if not product and (data.get('product_name') or data.get('productName')):
                prod_data = {
                    'ref_no': ref_no,
                    'product_name': data.get('product_name') or data.get('productName'),
                    'category': data.get('category'),
                    'company_name': data.get('company_name') or data.get('companyName'),
                    'size': data.get('size'),
                    'lot_no': data.get('lot_no') or data.get('lotNo'),
                    'expiry_date': data.get('expiry_date') or data.get('expiryDate'),
                    'low_stock_threshold': data.get('low_stock_threshold', 10),
                    'is_returnable': data.get('is_returnable', True),
                }
                product = Product.create(prod_data)

            unit = InventoryUnit.create({
                'unit_id': data.get('id') or data.get('unit_id'),
                'ref_no': ref_no,
                'quantity': data.get('quantity', 1),
                'status': data.get('status', 'active'),
                'created_by': data.get('created_by'),
            })
            return cls.find_by_id(unit.unit_id)
        except Exception as e:
            print(f"Inventory.create error: {e}")
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
        except Exception as e:
            print(f"Inventory.update error: {e}")
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
        except Exception as e:
            print(f"Inventory.update_quantity error: {e}")
        return self

    def delete(self):
        try:
            from models.inventory_unit import InventoryUnit
            unit = InventoryUnit.find_by_id(self.id)
            if unit:
                unit.delete()
                return True
        except Exception as e:
            print(f"Inventory.delete error: {e}")
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
