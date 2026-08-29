from database.db import Database
from models.inventory import Inventory

class VendorReturn:
    def __init__(self, data):
        self.return_id = data.get('return_id')
        self.type = data.get('type')
        self.unit_id = data.get('unit_id') or data.get('inventory_id')
        self.inventory_id = data.get('unit_id') or data.get('inventory_id')
        self.ref_no = data.get('ref_no')
        self.product_name = data.get('product_name')
        self.old_batch_no = data.get('old_batch_no')
        self.new_batch_no = data.get('new_batch_no')
        self.quantity = data.get('quantity', 1)
        self.reason = data.get('reason')
        self.return_date = data.get('return_date')
        self.credit_note = data.get('credit_note')
        self.credit_note_used = data.get('credit_note_used', False)
        self.status = data.get('status', 'pending')
        self.created_by = data.get('created_by')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM vendor_returns ORDER BY created_at DESC")
        return [cls(row) for row in results]

    @classmethod
    def find_by_id(cls, return_id):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM vendor_returns WHERE return_id = %s", (return_id,))
        return cls(result[0]) if result else None

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        return_id = data.get('return_id')
        if not return_id:
            res = db.execute_query("SELECT IFNULL(MAX(CAST(SUBSTRING(return_id, 5) AS UNSIGNED)), 0) + 1 AS next_id FROM vendor_returns")
            next_num = res[0]['next_id'] if res and res[0] and 'next_id' in res[0] else 1
            return_id = f"RET-{str(next_num).zfill(3)}"
        
        raw_unit_id = data.get('unit_id') or data.get('inventory_id')
        ref_no = data.get('ref_no')

        # Safely validate unit_id against inventory_units foreign key constraint
        from models.inventory_unit import InventoryUnit
        from models.inventory import Inventory

        valid_unit = None
        if raw_unit_id:
            valid_unit = InventoryUnit.find_by_id(raw_unit_id)
            if not valid_unit:
                units = InventoryUnit.find_by_ref_no(raw_unit_id)
                if units:
                    valid_unit = units[0]

        if not valid_unit and ref_no:
            units = InventoryUnit.find_by_ref_no(ref_no)
            if units:
                valid_unit = units[0]

        target_unit_id = valid_unit.id if valid_unit else None
        final_ref_no = ref_no or (valid_unit.ref_no if valid_unit else raw_unit_id)

        # Populate product_name & old_batch_no if missing
        from models.product import Product
        product_info = Product.find_by_ref_no(final_ref_no) if final_ref_no else None

        prod_name = data.get('product_name')
        if not prod_name or prod_name == 'Product':
            prod_name = (product_info.product_name if product_info else None) or (inventory.product_name if inventory else None) or final_ref_no

        old_batch = data.get('old_batch_no') or data.get('batch_no')
        if not old_batch:
            old_batch = (product_info.lot_no if product_info else None) or (inventory.lot_no if inventory else None)

        db.execute_query("""
            INSERT INTO vendor_returns (return_id, type, unit_id, ref_no, product_name, old_batch_no, new_batch_no, quantity, reason, return_date, credit_note, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            return_id,
            data['type'],
            target_unit_id,
            final_ref_no,
            prod_name,
            old_batch,
            data.get('new_batch_no'),
            data.get('quantity', 1),
            data.get('reason'),
            data.get('return_date'),
            data.get('credit_note'),
            data.get('created_by')
        ))
        
        return cls.find_by_id(return_id)

    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM vendor_returns WHERE return_id = %s", (self.return_id,))
        return True

    def update_status(self, status, credit_note_number=None, new_batch_no=None):
        db = self.get_db()
        updates = ["status = %s"]
        params = [status]
        
        if credit_note_number:
            updates.append("credit_note = %s")
            params.append(credit_note_number)
            self.credit_note = credit_note_number

        if new_batch_no:
            updates.append("new_batch_no = %s")
            params.append(new_batch_no)
            self.new_batch_no = new_batch_no
        
        params.append(self.return_id)
        query = f"UPDATE vendor_returns SET {', '.join(updates)} WHERE return_id = %s"
        db.execute_query(query, tuple(params))
        self.status = status

        # If completed and exchange type, add new batch to inventory
        if status == 'completed' and self.type == 'exchange' and self.new_batch_no:
            target_id = self.unit_id or self.inventory_id
            inventory = Inventory.find_by_id(target_id) if target_id else None
            if not inventory and self.ref_no:
                inventory = Inventory.find_by_ref_no(self.ref_no)

            if inventory:
                new_inv_data = {
                    'product_name': inventory.product_name,
                    'category': inventory.category,
                    'company_name': inventory.company_name,
                    'size': inventory.size,
                    'lot_no': self.new_batch_no,
                    'quantity': self.quantity,
                    'expiry_date': inventory.expiry_date,
                    'low_stock_threshold': inventory.low_stock_threshold,
                    'is_returnable': inventory.is_returnable,
                    'document_type': 'exchange',
                    'document_number': self.return_id,
                    'created_by': self.created_by
                }
                Inventory.create(new_inv_data)
        
        return VendorReturn.find_by_id(self.return_id)

    def to_dict(self):
        def fmt_date(val):
            if not val:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        product_name = self.product_name
        old_batch_no = self.old_batch_no

        if not product_name or product_name == 'Product' or not old_batch_no:
            from models.product import Product
            ref = self.ref_no or self.unit_id
            if ref:
                prod = Product.find_by_ref_no(ref)
                if prod:
                    if not product_name or product_name == 'Product':
                        product_name = prod.product_name
                    if not old_batch_no:
                        old_batch_no = prod.lot_no

        return {
            'returnId': self.return_id,
            'type': self.type,
            'unitId': self.unit_id or self.inventory_id,
            'inventoryId': self.inventory_id or self.unit_id,
            'refNo': self.ref_no,
            'productName': product_name,
            'product': product_name,
            'oldBatchNo': old_batch_no,
            'batchNo': old_batch_no,
            'newBatchNo': self.new_batch_no,
            'quantity': self.quantity,
            'reason': self.reason,
            'returnDate': fmt_date(self.return_date),
            'creditNote': self.credit_note,
            'creditNoteUsed': self.credit_note_used,
            'status': self.status,
            'createdBy': self.created_by,
            'createdAt': fmt_date(self.created_at),
            'updatedAt': fmt_date(self.updated_at)
        }