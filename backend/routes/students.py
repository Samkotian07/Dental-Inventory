from flask import Blueprint, request, jsonify
from middleware.auth import token_required, admin_required
from models.student import Student
from models.audit_log import AuditLog

students_bp = Blueprint('students', __name__, url_prefix='/api/students')


@students_bp.route('/', methods=['GET'])
@token_required
def get_students():
    """Get all students (active_only filter optional)"""
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    try:
        Student.sync_all_pending_returns()
    except Exception as e:
        print(f"⚠️ Could not sync student pending returns: {e}")
    students = Student.find_all(active_only=active_only)
    return jsonify({
        'success': True,
        'data': [s.to_dict() for s in students]
    }), 200


@students_bp.route('/search', methods=['GET'])
@token_required
def search_students():
    """Search students by name, campusId, course, or email"""
    query_str = request.args.get('name', '') or request.args.get('q', '')
    if not query_str:
        students = Student.find_all()
        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in students]
        }), 200
    
    students = Student.search(query_str)
    return jsonify({
        'success': True,
        'data': [s.to_dict() for s in students]
    }), 200


@students_bp.route('/batch/<batch>', methods=['GET'])
@token_required
def get_students_by_batch(batch):
    """Get all students in a batch"""
    students = Student.find_by_batch(batch)
    return jsonify({
        'success': True,
        'data': [s.to_dict() for s in students]
    }), 200


@students_bp.route('/batch/<batch>/archive', methods=['POST'])
@token_required
@admin_required
def archive_batch(batch):
    """Archive all students in a batch (Admin only)"""
    try:
        current_user = request.current_user
        result = Student.archive_batch(batch, archived_by=current_user.name if current_user else 'Admin')
        
        AuditLog.create(
            action='BATCH_ARCHIVE',
            entity_type='STUDENT',
            entity_id=batch,
            details=f"Archived {result['archived_count']} students from batch {batch}. {result['students_with_pending_returns']} students had pending returns.",
            user_id=current_user.id if current_user else None,
            user_name=current_user.name if current_user else 'Admin'
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'message': f"Archived {result['archived_count']} students from batch {batch}"
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'ARCHIVE_FAILED',
                'message': str(e)
            }
        }), 500


@students_bp.route('/<campus_id>/archive', methods=['PUT'])
@token_required
@admin_required
def archive_student(campus_id):
    """Archive a single student (Admin only)"""
    student = Student.find_by_id(campus_id)
    if not student:
        return jsonify({
            'success': False,
            'error': {
                'code': 'STUDENT_NOT_FOUND',
                'message': 'Student not found'
            }
        }), 404
    
    try:
        archived_student = student.archive()
        current_user = request.current_user
        
        AuditLog.create(
            action='ARCHIVE',
            entity_type='STUDENT',
            entity_id=campus_id,
            details=f"Archived student {student.name} ({campus_id})",
            user_id=current_user.id if current_user else None,
            user_name=current_user.name if current_user else 'Admin'
        )
        
        return jsonify({
            'success': True,
            'data': archived_student.to_dict(),
            'message': f"Student {student.name} archived successfully"
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'PENDING_RETURNS',
                'message': str(e)
            }
        }), 400


@students_bp.route('/<campus_id>', methods=['GET'])
@token_required
def get_student(campus_id):
    """Get student by Campus ID"""
    student = Student.find_by_id(campus_id)
    if not student:
        return jsonify({
            'success': False,
            'error': {
                'code': 'STUDENT_NOT_FOUND',
                'message': 'Student not found'
            }
        }), 404
    
    return jsonify({
        'success': True,
        'data': student.to_dict()
    }), 200


@students_bp.route('/', methods=['POST'])
@token_required
def create_student():
    """Create a new student"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Student name is required'
            }
        }), 400
    
    student = Student.create(data)
    return jsonify({
        'success': True,
        'data': student.to_dict(),
        'message': 'Student created successfully'
    }), 201


@students_bp.route('/<campus_id>', methods=['PUT'])
@token_required
def update_student(campus_id):
    """Update a student"""
    student = Student.find_by_id(campus_id)
    if not student:
        return jsonify({
            'success': False,
            'error': {
                'code': 'STUDENT_NOT_FOUND',
                'message': 'Student not found'
            }
        }), 404
    
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'Request body is required'
            }
        }), 400
    
    updated_student = student.update(data)
    return jsonify({
        'success': True,
        'data': updated_student.to_dict(),
        'message': 'Student updated successfully'
    }), 200


@students_bp.route('/<campus_id>', methods=['DELETE'])
@token_required
def delete_student(campus_id):
    """Delete a student"""
    try:
        student = Student.find_by_id(campus_id)
        if not student:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'STUDENT_NOT_FOUND',
                    'message': 'Student not found'
                }
            }), 404
        
        student_name = student.name
        student.delete()

        AuditLog.create(
            action='DELETE_STUDENT',
            entity_type='STUDENT',
            entity_id=campus_id,
            details=f'Deleted student {student_name} ({campus_id})',
            user_id=request.current_user.id,
            user_name=request.current_user.name
        )

        return jsonify({
            'success': True,
            'message': 'Student deleted successfully'
        }), 200
    except Exception as e:
        print(f"❌ Error deleting student {campus_id}: {e}")
        return jsonify({
            'success': False,
            'error': {
                'code': 'DELETE_FAILED',
                'message': f'Failed to delete student: {str(e)}'
            }
        }), 500


@students_bp.route('/bulk', methods=['POST'])
@token_required
def bulk_import_students():
    """Bulk import students"""
    data = request.get_json()
    
    if not data or not isinstance(data, list):
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Array of students is required'
            }
        }), 400
    
    imported = []
    for student_data in data:
        if student_data.get('name'):
            student = Student.create(student_data)
            imported.append(student.to_dict())
    
    return jsonify({
        'success': True,
        'data': imported,
        'message': f'Imported {len(imported)} students successfully'
    }), 201