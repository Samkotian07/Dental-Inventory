from database.db import Database
from models.issued_unit import IssuedUnit


class Issue:
    def __init__(self, data):
        self.issue_id = data.get('issue_id')
        self.student_id = data.get('student_id')
        self.student_name = data.get('student_name')
        self.issue_date = data.get('issue_date')
        self.issued_by = data.get('issued_by')
        self.remarks = data.get('remarks')
        self.created_at = data.get('created_at')
        self.units = []  # populated by finder methods

    @staticmethod
    def get_db():
        return Database()

    @classmethod
    def _load_units(cls, issue_id):
        return IssuedUnit.find_by_issue_id(issue_id)

    @classmethod
    def _compute_overall_status(cls, units):
        if not units:
            return 'unknown'
        statuses = [u.status for u in units]
        if all(s == 'returned_good' for s in statuses):
            return 'returned'
        if all(s in ('returned_good', 'returned_damaged') for s in statuses):
            return 'returned'
        if all(s == 'condemned' for s in statuses):
            return 'condemned'
        if all(s == 'issued' for s in statuses):
            return 'issued'
        if all(s == 'used_in_patient' for s in statuses):
            return 'used_in_patient'
        if all(s in ('awaiting_vendor', 'exchanged', 'credited') for s in statuses):
            return 'vendor_return'
        return 'mixed'

    @classmethod
    def find_all(cls):
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM issue_events ORDER BY created_at DESC"
        )
        result = []
        for r in rows:
            obj = cls(r)
            obj.units = cls._load_units(obj.issue_id)
            result.append(obj)
        return result

    @classmethod
    def find_by_id(cls, issue_id):
        if not issue_id:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM issue_events WHERE issue_id = %s",
            (issue_id,)
        )
        if not rows:
            return None
        obj = cls(rows[0])
        obj.units = cls._load_units(issue_id)
        return obj

    def to_dict(self):
        def fmt(v):
            if v is None:
                return None
            if hasattr(v, 'isoformat'):
                return v.isoformat()
            return str(v)

        return {
            'issueId': self.issue_id,
            'studentId': self.student_id,
            'studentName': self.student_name,
            'issueDate': fmt(self.issue_date),
            'issuedBy': self.issued_by,
            'remarks': self.remarks,
            'createdAt': fmt(self.created_at),
            'overallStatus': self._compute_overall_status(self.units),
            'units': [u.to_dict() for u in self.units],
        }