from database.db import Database
from models.inventory import Inventory

class VendorReturn:
    def __init__(self, data):
        self.return_id = data.get('return_id')
        self.type = data.get('type')
        self.inventory_id = data.get('inventory_id')
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
        return_id = data.get('return_id') or f"RET-{str(db.execute_query('SELECT IFNULL(MAX(CAST(SUBSTRING(return_id, 5) AS UNSIGNED)), 0) + 1 FROM vendor_returns')[0]['IFNULL(MAX(CAST(SUBSTRING(return_id, 5) AS UNSIGNED)), 0) + 1']).zfill(3)}"
        
        # Populate old_batch_no if missing
        old_batch = data.get('old_batch_no')
        inventory = None
        if data.get('inventory_id'):
            inventory = Inventory.find_by_id(data['inventory_id'])
        if not inventory and data.get('ref_no'):
            inventory = Inventory.find_by_ref_no(data['ref_no'])
            
        if not old_batch and inventory:
            old_batch = inventory.lot_no

        db.execute_query("""
            INSERT INTO vendor_returns (return_id, type, inventory_id, ref_no, product_name, old_batch_no, new_batch_no, quantity, reason, return_date, credit_note, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            return_id,
            data['type'],
            data.get('inventory_id'),
            data.get('ref_no') or (inventory.ref_no if inventory else None),
            data.get('product_name') or (inventory.product_name if inventory else None),
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

    def update_status(self, status, credit_note_number=None):
        db = self.get_db()
        updates = ["status = %s"]
        params = [status]
        
        if credit_note_number:
            updates.append("credit_note = %s")
            params.append(credit_note_number)
        
        # If completed and exchange type, add new batch to inventory
        if status == 'completed' and self.type == 'exchange' and self.new_batch_no:
            inventory = Inventory.find_by_id(self.inventory_id) if self.inventory_id else None
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
        
        params.append(self.return_id)
        query = f"UPDATE vendor_returns SET {', '.join(updates)} WHERE return_id = %s"
        db.execute_query(query, tuple(params))
        self.status = status
        return VendorReturn.find_by_id(self.return_id)

    def to_dict(self):
        return {
            'returnId': self.return_id,
            'type': self.type,
            'inventoryId': self.inventory_id,
            'refNo': self.ref_no,
            'productName': self.product_name,
            'oldBatchNo': self.old_batch_no,
            'newBatchNo': self.new_batch_no,
            'quantity': self.quantity,
            'reason': self.reason,
            'returnDate': self.return_date.isoformat() if self.return_date else None,
            'creditNote': self.credit_note,
            'creditNoteUsed': self.credit_note_used,
            'status': self.status,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }