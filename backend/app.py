from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.auth import auth_bp
from routes.students import students_bp
from routes.users import users_bp
from routes.inventory import inventory_bp
from routes.issued import issued_bp
from routes.failed import failed_bp
from routes.returns import returns_bp
from routes.audit import audit_bp

import os

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = Config.JWT_SECRET

# Configure CORS
CORS(app, origins=[Config.FRONTEND_URL], supports_credentials=True)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(students_bp)
app.register_blueprint(users_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(issued_bp)
app.register_blueprint(failed_bp)
app.register_blueprint(returns_bp)
app.register_blueprint(audit_bp)
# Health check route
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'Server is running'
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': {
            'code': 'NOT_FOUND',
            'message': 'Route not found'
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': {
            'code': 'INTERNAL_ERROR',
            'message': 'Internal server error'
        }
    }), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=Config.PORT,
        debug=Config.FLASK_ENV == 'development'
    )