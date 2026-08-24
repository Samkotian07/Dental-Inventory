from database.db import Database

class Student:
    def __init__(self, data):
        self.id = data.get('id')
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
    def find_by_id(cls, student_id):
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM students WHERE id = %s",
            (student_id,)
        )
        if result:
            return cls(result[0])
        return None
    
    @classmethod
    def find_by_name(cls, name):
        db = cls.get_db()
        result = db.execute_query(
            "SELECT * FROM students WHERE name LIKE %s ORDER BY name",
            (f"%{name}%",)
        )
        return [cls(row) for row in result]
    
    @classmethod
    def create(cls, data):
        db = cls.get_db()
        student_id = data.get('id') or f"STU-{db.execute_query('SELECT IFNULL(MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)), 0) + 1 FROM students')[0]['IFNULL(MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)), 0) + 1']:04d}"
        
        db.execute_query("""
            INSERT INTO students (id, name, email, course, semester, status, added)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            student_id,
            data['name'],
            data.get('email'),
            data.get('course'),
            data.get('semester'),
            data.get('status', 'active'),
            data.get('added')
        ))
        return cls.find_by_id(student_id)
    
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
        query = f"UPDATE students SET {', '.join(updates)} WHERE id = %s"
        params.append(self.id)
        
        db.execute_query(query, tuple(params))
        return Student.find_by_id(self.id)
    
    def delete(self):
        db = self.get_db()
        db.execute_query("DELETE FROM students WHERE id = %s", (self.id,))
        return True
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'course': self.course,
            'semester': self.semester,
            'status': self.status,
            'added': self.added.isoformat() if self.added else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }