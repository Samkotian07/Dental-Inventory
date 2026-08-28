from database.db import Database
from models.inventory import Inventory
from models.inventory_unit import InventoryUnit

class IssuedItem:
    def __init__(self, data):
        self.issue_id = data.get('issue_id')
        self.student_id = data.get('student_id')
        self.student_name = data.get('student_name')
        self.unit_id = data.get('unit_id') or data.get('inventory_id')
        self.inventory_id = data.get('unit_id') or data.get('inventory_id')
        self.product_name = data.get('product_name')
        self.lot_no = data.get('lot_no')
        self.ref_no = data.get('ref_no')
        self.quantity = data.get('quantity', 1)
        self.issue_date = data.get('issue_date')
        self.return_date = data.get('return_date')
        self.return_condition = data.get('return_condition')
        self.status = data.get('status', 'active')
        self.issued_by = data.get('issued_by')
        self.returned_by = data.get('returned_by')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM issued_items ORDER BY created_at DESC")
        return [cls(row) for row in results]

    @classmethod
    def find_by_id(cls, issue_id):
        db = cls.get_db()
        result = db.execute_query("SELECT * FROM issued_items WHERE issue_id = %s", (issue_id,))
        return cls(result[0]) if result else None

    @classmethod
    def find_active_by_student(cls, student_id):
        db = cls.get_db()
        results = db.execute_query("SELECT * FROM issued_items WHERE student_id = %s AND status = 'active'", (student_id,))
        return [cls(row) for row in results]

    @classmethod
    def create(cls, data):
        db = cls.get_db()
        issue_id = data.get('issue_id') or f"ISS-{str(db.execute_query('SELECT IFNULL(MAX(CAST(SUBSTRING(issue_id, 5) AS UNSIGNED)), 0) + 1 FROM issued_items')[0]['IFNULL(MAX(CAST(SUBSTRING(issue_id, 5) AS UNSIGNED)), 0) + 1']).zfill(3)}"
        
        unit_id = data.get('unit_id') or data.get('inventory_id')

        db.execute_query("""
            INSERT INTO issued_items (issue_id, student_id, student_name, unit_id, product_name, lot_no, ref_no, quantity, issue_date, status, issued_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            issue_id,
            data['student_id'],
            data.get('student_name'),
            unit_id,
            data.get('product_name'),
            data.get('lot_no'),
            data.get('ref_no'),
            data.get('quantity', 1),
            data.get('issue_date'),
            'active',
            data.get('issued_by')
        ))
        
        # Update inventory_units quantity
        try:
            unit = InventoryUnit.find_by_id(unit_id)
            if unit:
                unit.update({'quantity': unit.quantity - data.get('quantity', 1)})
            else:
                inventory = Inventory.find_by_id(unit_id)
                if inventory:
                    inventory.update_quantity(-data.get('quantity', 1), data.get('issued_by'))
        except Exception as e:
            print(f"Unit update in IssuedItem.create fallback: {e}")
            inventory = Inventory.find_by_id(unit_id)
            if inventory:
                inventory.update_quantity(-data.get('quantity', 1), data.get('issued_by'))
        
        return cls.find_by_id(issue_id)

    def return_item(self, return_date, condition, returned_by):
        """Return an item"""
        db = self.get_db()
        
        # Update issued item record
        db.execute_query("""
            UPDATE issued_items 
            SET return_date = %s, return_condition = %s, status = 'returned', returned_by = %s 
            WHERE issue_id = %s
        """, (return_date, condition, returned_by, self.issue_id))
        
        # Restore quantity to unit or inventory regardless of condition
        target_id = self.unit_id or self.inventory_id
        if target_id:
            try:
                unit = InventoryUnit.find_by_id(target_id)
                if unit:
                    unit.update({'quantity': unit.quantity + self.quantity})
                else:
                    inventory = Inventory.find_by_id(target_id) or Inventory.find_by_ref_no(target_id)
                    if inventory:
                        inventory.update_quantity(self.quantity, returned_by)
            except Exception:
                inventory = Inventory.find_by_id(target_id) or Inventory.find_by_ref_no(target_id)
                if inventory:
                    inventory.update_quantity(self.quantity, returned_by)
        elif self.ref_no:
            inventory = Inventory.find_by_ref_no(self.ref_no)
            if inventory:
                inventory.update_quantity(self.quantity, returned_by)
        
        return IssuedItem.find_by_id(self.issue_id)

    def condemn(self, condemned_by):
        """Condemn an item (mark as condemned)"""
        db = self.get_db()
        db.execute_query("""
            UPDATE issued_items 
            SET status = 'condemned', returned_by = %s 
            WHERE issue_id = %s
        """, (condemned_by, self.issue_id))
        
        return IssuedItem.find_by_id(self.issue_id)

    def to_dict(self):
        def fmt_date(val):
            if not val:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'issueId': self.issue_id,
            'studentId': self.student_id,
            'studentName': self.student_name,
            'unitId': self.unit_id or self.inventory_id,
            'inventoryId': self.inventory_id or self.unit_id,
            'productName': self.product_name,
            'lotNo': self.lot_no,
            'refNo': self.ref_no,
            'quantity': self.quantity,
            'issueDate': fmt_date(self.issue_date),
            'returnDate': fmt_date(self.return_date),
            'returnCondition': self.return_condition,
            'status': self.status,
            'issuedBy': self.issued_by,
            'returnedBy': self.returned_by,
            'createdAt': fmt_date(self.created_at),
            'updatedAt': fmt_date(self.updated_at)
        }