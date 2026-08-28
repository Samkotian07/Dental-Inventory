import bcrypt

# Generate real hashes
admin_salt = bcrypt.gensalt()
staff_salt = bcrypt.gensalt()

admin_hash = bcrypt.hashpw(b'admin123', admin_salt).decode('utf-8')
staff_hash = bcrypt.hashpw(b'staff123', staff_salt).decode('utf-8')

print("=" * 70)
print("COPY THESE EXACT VALUES INTO YOUR DATABASE")
print("=" * 70)
print()
print("-- For admin@yendental.com (password: admin123)")
print(f"UPDATE users SET password_hash = '{admin_hash}' WHERE email = 'admin@yendental.com';")
print()
print("-- For staff@yendental.com (password: staff123)")
print(f"UPDATE users SET password_hash = '{staff_hash}' WHERE email = 'staff@yendental.com';")
print()
print("=" * 70)