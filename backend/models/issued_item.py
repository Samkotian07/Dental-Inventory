from database.db import Database
from models.inventory import Inventory

class IssuedItem:
    def __init__(self, data):
        self.issue_id = data.get('issue_id')
        self.student_id = data.get('student_id')
        self.student_name = data.get('student_name')
        self.inventory_id = data.get('inventory_id')
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
        
        db.execute_query("""
            INSERT INTO issued_items (issue_id, student_id, student_name, inventory_id, product_name, lot_no, ref_no, quantity, issue_date, status, issued_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            issue_id,
            data['student_id'],
            data.get('student_name'),
            data['inventory_id'],
            data.get('product_name'),
            data.get('lot_no'),
            data.get('ref_no'),
            data.get('quantity', 1),
            data.get('issue_date'),
            'active',
            data.get('issued_by')
        ))
        
        # Update inventory quantity
        inventory = Inventory.find_by_id(data['inventory_id'])
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
        
        # Restore quantity to inventory regardless of condition (or for Good/Damaged return)
        inventory = None
        if self.inventory_id:
            inventory = Inventory.find_by_id(self.inventory_id) or Inventory.find_by_ref_no(self.inventory_id)
        if not inventory and self.ref_no:
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
        return {
            'issueId': self.issue_id,
            'studentId': self.student_id,
            'studentName': self.student_name,
            'inventoryId': self.inventory_id,
            'productName': self.product_name,
            'lotNo': self.lot_no,
            'refNo': self.ref_no,
            'quantity': self.quantity,
            'issueDate': self.issue_date.isoformat() if self.issue_date else None,
            'returnDate': self.return_date.isoformat() if self.return_date else None,
            'returnCondition': self.return_condition,
            'status': self.status,
            'issuedBy': self.issued_by,
            'returnedBy': self.returned_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }