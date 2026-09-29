from database.db import Database
import datetime

class Student:
    # ------------------------------------------------------------------
    # Normalise a raw data dict so both camelCase and snake_case keys
    # work interchangeably.  Any new field added here will be tolerant
    # for ALL callers (single-create, bulk-import, future endpoints).
    # ------------------------------------------------------------------
    @staticmethod
    def _normalize(data):
        """Return a snake_case copy of *data*, merging any camelCase aliases."""
        d = dict(data)  # shallow copy – don't mutate caller's dict

        # campus_id
        if 'campusId' in d and 'campus_id' not in d:
            d['campus_id'] = d['campusId']
        # added_date
        if 'addedDate' in d and 'added_date' not in d:
            d['added_date'] = d['addedDate']
        if 'added' in d and 'added_date' not in d:
            d['added_date'] = d['added']
        # has_pending_returns
        if 'hasPendingReturns' in d and 'has_pending_returns' not in d:
            d['has_pending_returns'] = d['hasPendingReturns']
        # pending_return_count
        if 'pendingReturnCount' in d and 'pending_return_count' not in d:
            d['pending_return_count'] = d['pendingReturnCount']

        return d
    def __init__(self, data):
        self.campus_id = data.get('campus_id')
        self.name = data.get('name')
        self.email = data.get('email')
        self.course = data.get('course')
        self.batch = data.get('batch')
        self.status = data.get('status', 'active')
        self.added_date = data.get('added_date')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    @staticmethod
    def get_db():
        return Database()
    
    @classmethod
    def find_all(cls, active_only=False):
        db = cls.get_db()
        query = "SELECT * FROM students"
        if active_only:
            query += " WHERE status = 'active'"
        query += " ORDER BY created_at DESC"
        result = db.execute_query(query)
        return [cls(row) for row in result]
    
    @classmethod
    def find_by_id(cls, campus_id):
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM students WHERE campus_id = %s",
            (campus_id,)
        )
        if result:
            return cls(result[0])
        return None

    @classmethod
    def find_by_batch(cls, batch):
        db = cls.get_db()
        results = db.execute_query(
            "SELECT * FROM students WHERE batch = %s",
            (batch,)
        )
        return [cls(row) for row in results]

    @classmethod
    def search(cls, query_str):
        db = cls.get_db()
        pattern = f"%{query_str}%"
        result = db.execute_query("""
            SELECT * FROM students 
            WHERE name LIKE %s OR campus_id LIKE %s OR course LIKE %s OR email LIKE %s
            ORDER BY name
        """, (pattern, pattern, pattern, pattern))
        return [cls(row) for row in result]
    
    @classmethod
    def create(cls, data):
        db = cls.get_db()

        # Accept both camelCase and snake_case from any caller
        data = cls._normalize(data)

        campus_id = data.get('campus_id') or data.get('id')
        if not campus_id:
            res = db.execute_query("SELECT COUNT(*) as cnt FROM students")
            next_num = (res[0]['cnt'] if res else 0) + 1
            campus_id = f"STU-{str(next_num + 1000).zfill(3)}"

        added_date = data.get('added_date') or datetime.date.today().isoformat()
        
        db.execute_query("""
            INSERT INTO students (campus_id, name, email, course, batch, status, added_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                email = VALUES(email),
                course = VALUES(course),
                batch = VALUES(batch),
                status = VALUES(status)
        """, (
            campus_id,
            data['name'],
            data.get('email'),
            data.get('course'),
            data.get('batch'),
            data.get('status', 'active'),
            added_date
        ))
        return cls.find_by_id(campus_id)
    
    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['name', 'email', 'course', 'batch', 'status']
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return self
        
        updates.append("updated_at = NOW()")
        query = f"UPDATE students SET {', '.join(updates)} WHERE campus_id = %s"
        params.append(self.campus_id)
        
        db.execute_query(query, tuple(params))
        return Student.find_by_id(self.campus_id)
    
    def archive(self, archived_by=None):
        """Archive a student (set status to archived)"""
        pending = Student.get_pending_return_count(self.campus_id)
        if pending > 0:
            raise ValueError(f"Student {self.campus_id} has {pending} pending returns and cannot be archived")
        return self.update({'status': 'archived'})
    
    def delete(self):
        db = self.get_db()
        # Block delete if student has active tool issues
        pending = Student.get_pending_return_count(self.campus_id)
        if pending > 0:
            raise ValueError(f"Student {self.campus_id} has {pending} pending returnable items")
        db.execute_query("DELETE FROM students WHERE campus_id = %s", (self.campus_id,))
        return True
    
    @classmethod
    def get_pending_return_count(cls, student_id):
        """Compute live count of open tool/returnable issues."""
        if not student_id:
            return 0
        db = cls.get_db()
        rows = db.execute_query("""
            SELECT COUNT(*) AS cnt
            FROM issued_units u
            JOIN issue_events e ON e.issue_id = u.issue_id
            WHERE e.student_id = %s
              AND u.is_implant_abutment = 0
              AND u.status IN ('issued', 'awaiting_vendor')
        """, (student_id,))
        return rows[0]['cnt'] if rows else 0

    @classmethod
    def update_pending_returns(cls, student_id):
        """Backward-compat shim: return live count (no DB write)."""
        return {
            'pending_return_count': cls.get_pending_return_count(student_id)
        }

    @classmethod
    def sync_all_pending_returns(cls):
        """No-op: counts are now computed live."""
        return True
    
    @classmethod
    def archive_batch(cls, batch, archived_by=None):
        db = cls.get_db()
        conn = db.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.callproc('archive_batch', (batch, archived_by or 'System'))
            conn.commit()
            result = {}
            for r in cursor.stored_results():
                row = r.fetchone()
                if row:
                    result = row
            return {
                'archived_count': result.get('archived_count', 0),
                'students_with_pending_returns': result.get('students_with_pending_returns', 0)
            }
        finally:
            cursor.close()
    
    def to_dict(self):
        created_val = self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else (str(self.created_at) if self.created_at else None)
        updated_val = self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else (str(self.updated_at) if self.updated_at else None)
        
        return {
            'campusId': self.campus_id,
            'id': self.campus_id,
            'name': self.name,
            'email': self.email,
            'course': self.course,
            'batch': self.batch,
            'status': self.status,
            'addedDate': str(self.added_date) if self.added_date else None,
            'createdAt': created_val,
            'updatedAt': updated_val
        }