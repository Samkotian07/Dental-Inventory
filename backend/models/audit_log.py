from database.db import Database

class AuditLog:
    def __init__(self, data):
        self.id = data.get('id')
        self.action = data.get('action')
        self.entity_type = data.get('entity_type')
        self.entity_id = data.get('entity_id')
        self.details = data.get('details')
        self.user_id = data.get('user_id')
        self.user_name = data.get('user_name')
        self.timestamp = data.get('timestamp')

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def create(cls, action, entity_type, entity_id, details, user_id=None, user_name=None):
        db = cls.get_db()
        db.execute_query("""
            INSERT INTO audit_logs (action, entity_type, entity_id, details, user_id, user_name)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (action, entity_type, entity_id, details, user_id, user_name))
        return True

    @classmethod
    def find_all(cls, limit=100):
        db = cls.get_db()
        results = db.execute_query("""
            SELECT * FROM audit_logs 
            ORDER BY timestamp DESC 
            LIMIT %s
        """, (limit,))
        return [cls(row) for row in results]

    def to_dict(self):
        return {
            'id': self.id,
            'action': self.action,
            'entityType': self.entity_type,
            'entityId': self.entity_id,
            'details': self.details,
            'userId': self.user_id,
            'userName': self.user_name,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }