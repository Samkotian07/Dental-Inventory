# Dental Inventory Backend

Flask API for the Dental Inventory application. The backend uses MySQL for persistence and loads configuration from `backend/.env`.

## Prerequisites

- Python 3.10 or newer
- MySQL Server
- A MySQL database created for the application

## Setup on Windows

From the repository root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks script activation, run this once for the current user and then activate the environment again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Environment configuration

Create `backend/.env` with values for the local MySQL instance:

```dotenv
FLASK_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=ydc_inventry
DB_USER=root
DB_PASSWORD=your-mysql-password

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7
FRONTEND_URL=http://localhost:5173
```

Create the database named by `DB_NAME` before starting the API. The configured MySQL user must have permission to connect to it and create or update the tables required by the application.

Do not commit `.env` or real credentials. The backend `.gitignore` already excludes local environment files.

## Run the API

With the virtual environment activated and while inside `backend`:

```powershell
python app.py
```

The API listens on `http://localhost:5000` by default. The server runs in Flask debug mode during local development.

## Verify the setup

Check the API and database connection:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

A healthy setup returns a response containing:

```json
{
  "status": "ok",
  "database": "connected"
}
```

To list registered API routes during development:

```powershell
Invoke-RestMethod http://localhost:5000/api/routes
```

## Host the backend

The backend can be deployed to a Python host such as Render, Railway, or any service that supports a Gunicorn start command. The examples below use Render.

### Render settings

Create a **Web Service** connected to this repository and use:

- **Root directory:** `backend`
- **Runtime:** `Python 3`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `gunicorn app:app`

Add these environment variables in the hosting provider dashboard:

```dotenv
FLASK_ENV=production
PORT=10000
DB_HOST=your-managed-mysql-host
DB_PORT=3306
DB_NAME=ydc_inventry
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
JWT_SECRET=use-a-long-random-production-secret
JWT_EXPIRES_IN=7
FRONTEND_URL=https://your-frontend-domain.netlify.app
```

Do not add production secrets to the repository. Use the MySQL host, database, user, and password supplied by your managed database provider. Make sure the database accepts connections from the deployed backend before testing the service.

After deployment, verify the public API with:

```powershell
Invoke-RestMethod https://your-backend-domain.example.com/api/health
```

The response must report both `"status": "ok"` and `"database": "connected"`.

### Connect the hosted frontend

The frontend currently contains hardcoded local API URLs such as `http://127.0.0.1:5000/api` and `http://localhost:5000/api`. Before hosting it, replace those values with the deployed backend URL, or centralize them in a Vite environment variable such as:

```dotenv
VITE_API_URL=https://your-backend-domain.example.com/api
```

Then redeploy the frontend. Setting `VITE_API_URL` alone does not change the current frontend until its API constants are updated to read that variable. Set `FRONTEND_URL` on the backend to the exact deployed frontend origin, including `https://` and without a trailing slash.

### Production notes

- Use `gunicorn app:app`; do not use `python app.py` as the production process.
- Keep debug mode disabled in production. Gunicorn does not execute the `app.run(...)` block.
- Configure HTTPS through the hosting provider.
- Restrict database access to the deployed service where the provider supports network rules.
- Review application logs after the first deployment and test login plus one read/write API operation.

## Backend layout

- `app.py` - Flask application entry point and blueprint registration
- `config.py` - environment-based configuration
- `database/` - MySQL database access
- `middleware/` - authentication and rate limiting
- `models/` - database model operations
- `routes/` - API blueprints
- `utils/` - shared validation helpers

## Common commands

```powershell
# Activate the environment
.\.venv\Scripts\Activate.ps1

# Install dependencies after requirements.txt changes
pip install -r requirements.txt

# Generate a bcrypt password hash
python generate_hash.py

# Leave the virtual environment
deactivate
```