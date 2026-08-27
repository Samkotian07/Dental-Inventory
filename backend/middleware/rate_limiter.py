import time
from functools import wraps
from collections import defaultdict
from flask import request, jsonify

# Dictionary storing client IP -> list of request timestamps
_request_history = defaultdict(list)

def get_client_ip():
    """Extract true client IP address behind proxies or direct connection"""
    if request.headers.get('X-Forwarded-For'):
        # Take the first IP if multiple are forwarded
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    if request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP').strip()
    return request.remote_addr or '127.0.0.1'

def rate_limit(limit=10, period=60):
    """
    Sliding window rate limit decorator.
    :param limit: Max requests allowed within period
    :param period: Time window in seconds (default 60s)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = get_client_ip()
            endpoint_key = f"{ip}:{request.endpoint or 'general'}"
            now = time.time()
            cutoff = now - period

            # Remove timestamps outside the current window
            timestamps = [ts for ts in _request_history[endpoint_key] if ts > cutoff]
            _request_history[endpoint_key] = timestamps

            if len(timestamps) >= limit:
                retry_after = int(period - (now - timestamps[0]))
                if retry_after < 1:
                    retry_after = 1
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'TOO_MANY_REQUESTS',
                        'message': f'Rate limit exceeded. Please wait {retry_after} seconds before trying again.'
                    }
                }), 429

            # Record current request timestamp
            _request_history[endpoint_key].append(now)
            return f(*args, **kwargs)

        return decorated_function
    return decorator
