from database.db import Database
import hashlib
import uuid


class Session:
    def __init__(self, data):
        self.session_id = data.get('session_id')
        self.user_id = data.get('user_id')
        self.token_hash = data.get('token_hash')
        self.ip_address = data.get('ip_address')
        self.user_agent = data.get('user_agent')
        self.issued_at = data.get('issued_at')
        self.last_seen_at = data.get('last_seen_at')
        self.expires_at = data.get('expires_at')
        self.revoked_at = data.get('revoked_at')

    @staticmethod
    def get_db():
        return Database()

    @staticmethod
    def hash_token(token):
        return hashlib.sha256(token.encode('utf-8')).hexdigest()

    @classmethod
    def create(cls, user_id, token, ip_address=None, user_agent=None, expires_at=None):
        """Create a session row. expires_at required (TIMESTAMP NOT NULL)."""
        db = cls.get_db()
        session_id = str(uuid.uuid4())
        token_hash = cls.hash_token(token)
        db.execute_query("""
            INSERT INTO sessions
                (session_id, user_id, token_hash, ip_address, user_agent, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (session_id, user_id, token_hash, ip_address, user_agent, expires_at))
        return cls.find_by_id(session_id)

    @classmethod
    def find_by_id(cls, session_id):
        if not session_id:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM sessions WHERE session_id = %s",
            (session_id,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_by_token_hash(cls, token_hash):
        if not token_hash:
            return None
        db = cls.get_db()
        rows = db.execute_query(
            "SELECT * FROM sessions WHERE token_hash = %s",
            (token_hash,)
        )
        return cls(rows[0]) if rows else None

    @classmethod
    def find_active_by_user(cls, user_id):
        db = cls.get_db()
        rows = db.execute_query(
            """SELECT * FROM sessions
               WHERE user_id = %s
                 AND revoked_at IS NULL
                 AND expires_at > NOW()
               ORDER BY issued_at DESC""",
            (user_id,)
        )
        return [cls(r) for r in rows]

    @classmethod
    def revoke(cls, session_id):
        db = cls.get_db()
        db.execute_query(
            "UPDATE sessions SET revoked_at = NOW() WHERE session_id = %s",
            (session_id,)
        )

    @classmethod
    def revoke_all_by_user(cls, user_id, except_session_id=None):
        db = cls.get_db()
        if except_session_id:
            db.execute_query(
                """UPDATE sessions SET revoked_at = NOW()
                   WHERE user_id = %s AND session_id != %s AND revoked_at IS NULL""",
                (user_id, except_session_id)
            )
        else:
            db.execute_query(
                """UPDATE sessions SET revoked_at = NOW()
                   WHERE user_id = %s AND revoked_at IS NULL""",
                (user_id,)
            )

    @classmethod
    def enforce_max_sessions(cls, user_id, max_sessions=3):
        """Revoke oldest sessions beyond max_sessions."""
        active = cls.find_active_by_user(user_id)
        if len(active) <= max_sessions:
            return
        to_revoke = active[max_sessions:]
        for s in to_revoke:
            cls.revoke(s.session_id)

    def to_dict(self):
        def fmt(v):
            if v is None:
                return None
            if hasattr(v, 'isoformat'):
                return v.isoformat()
            return str(v)

        return {
            'sessionId': self.session_id,
            'userId': self.user_id,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'issuedAt': fmt(self.issued_at),
            'lastSeenAt': fmt(self.last_seen_at),
            'expiresAt': fmt(self.expires_at),
            'revokedAt': fmt(self.revoked_at),
        }