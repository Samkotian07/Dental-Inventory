from flask import Blueprint, request, jsonify
from middleware.auth import token_required
from models.student import Student

students_bp = Blueprint('students', __name__, url_prefix='/api/students')

@students_bp.route('/', methods=['GET'])
@token_required
def get_students():
    """Get all students"""
    students = Student.find_all()
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

@students_bp.route('/<campus_id>', methods=['GET'])
@token_required
def get_student(campus_id):
    """Get student by Campus ID"""
    student = Student.find_by_campus_id(campus_id)
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
    student = Student.find_by_campus_id(campus_id)
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
    student = Student.find_by_campus_id(campus_id)
    if not student:
        return jsonify({
            'success': False,
            'error': {
                'code': 'STUDENT_NOT_FOUND',
                'message': 'Student not found'
            }
        }), 404
    
    student.delete()
    return jsonify({
        'success': True,
        'message': 'Student deleted successfully'
    }), 200

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