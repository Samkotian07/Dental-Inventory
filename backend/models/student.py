from database.db import Database
import datetime

class Student:
    def __init__(self, data):
        self.campus_id = data.get('campus_id') or data.get('campusId') or data.get('id')
        self.id = self.campus_id
        self.name = data.get('name')
        self.email = data.get('email')
        self.course = data.get('course')
        self.semester = data.get('semester')
        self.status = data.get('status', 'active')
        self.added = data.get('added')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    @staticmethod
    def get_db():
        return Database()
    
    @classmethod
    def find_all(cls):
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM students ORDER BY created_at DESC"
        )
        return [cls(row) for row in result]
    
    @classmethod
    def find_by_campus_id(cls, campus_id):
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM students WHERE campus_id = %s",
            (campus_id,)
        )
        if result:
            return cls(result[0])
        return None

    @classmethod
    def find_by_id(cls, campus_id):
        return cls.find_by_campus_id(campus_id)
    
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
        campus_id = data.get('campusId') or data.get('campus_id') or data.get('id')
        
        if not campus_id:
            # Fallback auto-generated Campus ID if none provided
            res = db.execute_query("SELECT COUNT(*) as cnt FROM students")
            next_num = (res[0]['cnt'] if res else 0) + 1000
            campus_id = f"STU-{next_num}"
        
        added_date = data.get('added') or datetime.date.today().isoformat()
        
        db.execute_query("""
            INSERT INTO students (campus_id, name, email, course, semester, status, added)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                email = VALUES(email),
                course = VALUES(course),
                semester = VALUES(semester),
                status = VALUES(status)
        """, (
            campus_id,
            data['name'],
            data.get('email'),
            data.get('course'),
            data.get('semester'),
            data.get('status', 'active'),
            added_date
        ))
        return cls.find_by_campus_id(campus_id)
    
    def update(self, data):
        db = self.get_db()
        updates = []
        params = []
        
        allowed_fields = ['name', 'email', 'course', 'semester', 'status']
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
        return Student.find_by_campus_id(self.campus_id)
    
    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM students WHERE campus_id = %s", (self.campus_id,))
        return True
    
    def to_dict(self):
        added_val = self.added.isoformat() if hasattr(self.added, 'isoformat') else (str(self.added) if self.added else None)
        created_val = self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else (str(self.created_at) if self.created_at else None)
        updated_val = self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else (str(self.updated_at) if self.updated_at else None)
        
        return {
            'campusId': self.campus_id,
            'id': self.campus_id,
            'name': self.name,
            'email': self.email,
            'course': self.course,
            'semester': self.semester,
            'status': self.status,
            'added': added_val,
            'createdAt': created_val,
            'updatedAt': updated_val
        }