from database.db import Database
from models.inventory import Inventory

class FailedInventory:
    def __init__(self, data):
        self.id = data.get('id')
        self.ref_no = data.get('ref_no')
        self.product_name = data.get('product_name')
        self.category = data.get('category')
        self.company_name = data.get('company_name')
        self.size = data.get('size')
        self.lot_no = data.get('lot_no')
        self.quantity = data.get('quantity')
        self.expiry_date = data.get('expiry_date')
        self.failure_reason = data.get('failure_reason')
        self.status = data.get('status', 'pending')
        self.unit_id = data.get('unit_id') or data.get('original_inventory_id')
        self.original_inventory_id = data.get('original_inventory_id') or data.get('unit_id')
        self.replacement_inventory_id = data.get('replacement_inventory_id')
        self.moved_by = data.get('moved_by')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM failed_inventory ORDER BY created_at DESC")
        return [cls(row) for row in results]

    @classmethod
    def find_by_id(cls, failed_id):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM failed_inventory WHERE id = %s", (failed_id,))
        return cls(result[0]) if result else None

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        failed_id = data.get('id') or f"FAIL-{str(db.execute_query('SELECT IFNULL(MAX(CAST(SUBSTRING(id, 6) AS UNSIGNED)), 0) + 1 FROM failed_inventory')[0]['IFNULL(MAX(CAST(SUBSTRING(id, 6) AS UNSIGNED)), 0) + 1']).zfill(3)}"
        
        target_unit_id = data.get('unit_id') or data.get('original_inventory_id')

        db.execute_query("""
            INSERT INTO failed_inventory (id, ref_no, product_name, category, company_name, size, lot_no, quantity, expiry_date, failure_reason, original_inventory_id, unit_id, moved_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            failed_id,
            data.get('ref_no'),
            data.get('product_name'),
            data.get('category'),
            data.get('company_name'),
            data.get('size'),
            data.get('lot_no'),
            data.get('quantity'),
            data.get('expiry_date'),
            data.get('failure_reason'),
            target_unit_id,
            target_unit_id,
            data.get('moved_by')
        ))
        
        # Update original inventory/unit status to inactive
        if target_unit_id:
            try:
                from models.inventory_unit import InventoryUnit
                unit = InventoryUnit.find_by_id(target_unit_id)
                if unit:
                    unit.update({'status': 'inactive'})
                else:
                    inventory = Inventory.find_by_id(target_unit_id)
                    if inventory:
                        inventory.update({'status': 'inactive'})
            except Exception:
                inventory = Inventory.find_by_id(target_unit_id)
                if inventory:
                    inventory.update({'status': 'inactive'})
        
        return cls.find_by_id(failed_id)

    def mark_sent_to_vendor(self):
        db = self.get_db()
        db.execute_query("UPDATE failed_inventory SET status = 'sent_to_vendor' WHERE id = %s", (self.id,))
        self.status = 'sent_to_vendor'
        return self

    def mark_restored(self, new_inventory_id=None):
        db = self.get_db()
        db.execute_query("""
            UPDATE failed_inventory 
            SET status = 'restored', replacement_inventory_id = %s 
            WHERE id = %s
        """, (new_inventory_id, self.id))
        self.status = 'restored'
        self.replacement_inventory_id = new_inventory_id
        return self

    def mark_disposed(self):
        db = self.get_db()
        db.execute_query("UPDATE failed_inventory SET status = 'disposed' WHERE id = %s", (self.id,))
        self.status = 'disposed'
        return self

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
            'failureReason': self.failure_reason,
            'status': self.status,
            'unitId': self.unit_id or self.original_inventory_id,
            'originalInventoryId': self.original_inventory_id or self.unit_id,
            'replacementInventoryId': self.replacement_inventory_id,
            'movedBy': self.moved_by,
            'createdAt': fmt_date(self.created_at),
            'updatedAt': fmt_date(self.updated_at)
        }