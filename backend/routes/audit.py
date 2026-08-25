from flask import Blueprint, jsonify, request
from middleware.auth import token_required, admin_required
from models.audit_log import AuditLog

audit_bp = Blueprint('audit', __name__, url_prefix='/api/audit-logs')

@audit_bp.route('/', methods=['GET'])
@token_required
@admin_required
def get_audit_logs():
    """Get all audit logs (Admin only)"""
    limit = request.args.get('limit', 100, type=int)
    logs = AuditLog.find_all(limit=limit)
    return jsonify({
        'success': True,
        'data': [log.to_dict() for log in logs]
    }), 200

@audit_bp.route('/<int:log_id>', methods=['GET'])
@token_required
@admin_required
def get_audit_log(log_id):
    """Get audit log by ID (Admin only)"""
    db = AuditLog.get_db()
    result = db.execute_query("SELECT * FROM audit_logs WHERE id = %s", (log_id,))
    if not result:
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'Audit log not found'
            }
        }), 404
    
    log = AuditLog(result[0])
    return jsonify({
        'success': True,
        'data': log.to_dict()
    }), 200

@audit_bp.route('/entity/<entity_type>/<entity_id>', methods=['GET'])
@token_required
@admin_required
def get_audit_logs_by_entity(entity_type, entity_id):
    """Get audit logs for a specific entity (Admin only)"""
    db = AuditLog.get_db()
    results = db.execute_query("""
        SELECT * FROM audit_logs 
        WHERE entity_type = %s AND entity_id = %s
        ORDER BY timestamp DESC
    """, (entity_type, entity_id))
    
    return jsonify({
        'success': True,
        'data': [AuditLog(row).to_dict() for row in results]
    }), 200

@audit_bp.route('/user/<int:user_id>', methods=['GET'])
@token_required
@admin_required
def get_audit_logs_by_user(user_id):
    """Get audit logs for a specific user (Admin only)"""
    db = AuditLog.get_db()
    results = db.execute_query("""
        SELECT * FROM audit_logs 
        WHERE user_id = %s
        ORDER BY timestamp DESC
    """, (user_id,))
    
    return jsonify({
        'success': True,
        'data': [AuditLog(row).to_dict() for row in results]
    }), 200

@audit_bp.route('/action/<action>', methods=['GET'])
@token_required
@admin_required
def get_audit_logs_by_action(action):
    """Get audit logs by action type (Admin only)"""
    db = AuditLog.get_db()
    results = db.execute_query("""
        SELECT * FROM audit_logs 
        WHERE action = %s
        ORDER BY timestamp DESC
    """, (action,))
    
    return jsonify({
        'success': True,
        'data': [AuditLog(row).to_dict() for row in results]
    }), 200