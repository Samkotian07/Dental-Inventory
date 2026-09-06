from database.db import Database
import datetime

class Student:
    def __init__(self, data):
        self.campus_id = data.get('campus_id')
        self.name = data.get('name')
        self.email = data.get('email')
        self.course = data.get('course')
        self.batch = data.get('batch')
        self.has_pending_returns = data.get('has_pending_returns', False)  # ⭐ Renamed
        self.pending_return_count = data.get('pending_return_count', 0)    # ⭐ Renamed
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
        
        campus_id = data.get('campus_id') or data.get('id')
        if not campus_id:
            res = db.execute_query("SELECT COUNT(*) as cnt FROM students")
            next_num = (res[0]['cnt'] if res else 0) + 1
            campus_id = f"STU-{str(next_num + 1000).zfill(3)}"
        
        added_date = data.get('added_date') or data.get('added') or datetime.date.today().isoformat()
        
        db.execute_query("""
            INSERT INTO students (campus_id, name, email, course, batch, has_pending_returns, pending_return_count, status, added_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                email = VALUES(email),
                course = VALUES(course),
                batch = VALUES(batch),
                has_pending_returns = VALUES(has_pending_returns),
                pending_return_count = VALUES(pending_return_count),
                status = VALUES(status)
        """, (
            campus_id,
            data['name'],
            data.get('email'),
            data.get('course'),
            data.get('batch'),
            data.get('has_pending_returns', False),
            data.get('pending_return_count', 0),
            data.get('status', 'active'),
            added_date
        ))
        return cls.find_by_id(campus_id)
    
    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['name', 'email', 'course', 'batch', 'has_pending_returns', 'pending_return_count', 'status']
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
        if self.has_pending_returns:
            raise ValueError(f"Student {self.campus_id} has {self.pending_return_count} pending returns and cannot be archived")
        return self.update({'status': 'archived'})
    
    def delete(self):
        db = self.get_db()
        try:
            db.execute_query("UPDATE issued_items SET student_id = NULL WHERE student_id = %s", (self.campus_id,))
        except Exception:
            pass
        db.execute_query("DELETE FROM students WHERE campus_id = %s", (self.campus_id,))
        return True
    
    @classmethod
    def update_pending_returns(cls, student_id):
        """Update pending return count for a student based on active issues"""
        db = cls.get_db()
        
        # Count active issues (including active, issued, NULL, or empty status)
        result = db.execute_query("""
            SELECT COUNT(*) as count FROM issued_items 
            WHERE student_id = %s 
            AND (LOWER(status) = 'active' OR LOWER(status) = 'issued' OR status IS NULL OR status = '')
        """, (student_id,))
        count = result[0]['count'] if result else 0
        has_pending = count > 0
        
        # Update student record
        db.execute_query("""
            UPDATE students 
            SET has_pending_returns = %s, pending_return_count = %s
            WHERE campus_id = %s
        """, (has_pending, count, student_id))
        
        return {'has_pending_returns': has_pending, 'pending_return_count': count}

    @classmethod
    def sync_all_pending_returns(cls):
        """Sync pending return status for all students"""
        db = cls.get_db()
        students = db.execute_query("SELECT campus_id FROM students")
        for s in (students or []):
            cls.update_pending_returns(s['campus_id'])
        return True
    
    @classmethod
    def archive_batch(cls, batch, archived_by=None):
        """Archive all students in a batch (without pending returns)"""
        db = cls.get_db()
        
        # Get students with pending returns
        pending_students = db.execute_query(
            "SELECT campus_id FROM students WHERE batch = %s AND has_pending_returns = TRUE AND status = 'active'",
            (batch,)
        )
        pending_count = len(pending_students)
        
        # Archive students without pending returns
        result = db.execute_query(
            "UPDATE students SET status = 'archived' WHERE batch = %s AND has_pending_returns = FALSE AND status = 'active'",
            (batch,)
        )
        archived_count = db.get_affected_rows() or 0
        
        # Log the archive
        db.execute_query("""
            INSERT INTO batch_archive_log (batch_name, students_archived, students_with_dues, archived_by, remarks)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            batch,
            archived_count,
            pending_count,
            archived_by or 'System',
            f"Archived {archived_count} students. {pending_count} students have pending returns and were not archived."
        ))
        
        return {
            'archived_count': archived_count,
            'students_with_pending_returns': pending_count
        }
    
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
            'hasPendingReturns': bool(self.has_pending_returns),
            'pendingReturnCount': int(self.pending_return_count or 0),
            'status': self.status,
            'addedDate': str(self.added_date) if self.added_date else None,
            'createdAt': created_val,
            'updatedAt': updated_val
        }