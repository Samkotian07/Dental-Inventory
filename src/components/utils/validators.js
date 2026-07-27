export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 6;
}

export function validateRequired(value) {
  return value !== undefined && value !== null && value !== '';
}

export function validateNumber(value) {
  const n = Number(value);
  return !isNaN(n) && n >= 0;
}

export function validateLoginForm({ email, password }) {
  const errors = {};
  if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  if (!validatePassword(password)) {
    errors.password = 'Password must be at least 6 characters';
  }
  return errors;
}
