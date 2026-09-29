# CareConnect — Platform Deployment Guide & Runbook

**Platforms Covered:**
- Backend API (Python 3.10+ / FastAPI / Uvicorn / SQLAlchemy)
- Database (PostgreSQL 18 with psycopg driver)
- Family Sponsor Portal (React 18 / Vite PWA)
- Caregiver Mobile Portal (React 18 / Vite PWA / Offline Sync)

---

## 1. Local Development Environment

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- Windows PowerShell or Bash shell

### Step-by-Step Setup
1. **Backend Service:**
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   # source venv/bin/activate

   pip install -r requirements.txt
   # Uses SQLite async by default or local PostgreSQL
   python run.py
   # Service running at http://localhost:8000
   ```

2. **Family Sponsor PWA:**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Service running at http://localhost:5173
   ```

3. **Caregiver Mobile PWA:**
   ```bash
   cd caregiver-app
   npm install
   npm run dev
   # Service running at http://localhost:5174
   ```

4. **One-Click Local Launcher (Windows):**
   ```powershell
   .\run_project.ps1
   # To stop all services:
   .\stop_project.bat
   ```

---

## 2. Staging Deployment

### Architecture
- **Backend:** Containerized FastAPI app running under Gunicorn/Uvicorn workers on AWS ECS / DigitalOcean App Platform / Render.
- **Database:** Managed PostgreSQL 18 instance with SSL enabled (`sslmode=require`).
- **PWAs:** Built static single-page applications hosted on Cloudflare Pages / AWS CloudFront + S3.

### Environment Configuration (`.env.staging`)
```ini
ENVIRONMENT=staging
PROJECT_NAME="CareConnect Staging"
SECRET_KEY=staging_secret_key_placeholder
DATABASE_URL=postgresql+psycopg://careconnect_stg:STAGING_DB_PASSWORD@staging-db.internal:5432/careconnect_staging?sslmode=require
CORS_ORIGINS=["https://staging-family.careconnect.in","https://staging-caregiver.careconnect.in"]
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Build & Deploy Pipeline
1. **Backend Container Build:**
   ```dockerfile
   FROM python:3.10-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
   ```
2. **Frontend Builds:**
   ```bash
   # Family PWA
   cd frontend && npm ci && npm run build
   # Outputs to frontend/dist

   # Caregiver PWA
   cd caregiver-app && npm ci && npm run build
   # Outputs to caregiver-app/dist
   ```

---

## 3. Production Deployment

### Production Prerequisites & Hardening Checklist
1. **HTTPS / TLS 1.3:** Enforced on all domains via Cloudflare / AWS ALB.
2. **Database:** High-Availability PostgreSQL 18 cluster with read-replicas and automated backup.
3. **Environment Security:** Secrets injected via AWS Secrets Manager or HashiCorp Vault.
4. **Zero Development Endpoints:** `ENVIRONMENT=production` disables `seed-demo` and master OTP `123456`.
5. **Strict CORS:** Only production domains (`family.careconnect.in`, `caregiver.careconnect.in`) permitted.

### Production Environment Variables (`.env`)
```ini
ENVIRONMENT=production
PROJECT_NAME="CareConnect Elder Care Platform"
VERSION=1.0.0
SECRET_KEY=SECURE_PRODUCTION_JWT_SECRET_256BIT
DATABASE_URL=postgresql+psycopg://careconnect_prod_user:PROD_SECURE_PASSWORD@prod-db-cluster.internal:5432/careconnect_prod?sslmode=require
CORS_ORIGINS=["https://family.careconnect.in","https://caregiver.careconnect.in","https://ops.careconnect.in"]
ACCESS_TOKEN_EXPIRE_MINUTES=1440
RAZORPAY_KEY_ID=rzp_live_PROD_KEY
RAZORPAY_KEY_SECRET=PROD_RAZORPAY_SECRET
```

### Production Start Commands
```bash
# Backend under Gunicorn with Uvicorn worker class (4 workers for multi-core scaling)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 --access-logfile - --error-logfile -
```

---

## 4. Health Checks & Verification

- **Liveness & Readiness Endpoint:**
  - URL: `GET /health`
  - Response: `{"status": "healthy"}` (HTTP 200)
  - Security: Unauthenticated, zero credentials exposed.

- **API Verification Command:**
  ```bash
  curl -fsS https://api.careconnect.in/health
  ```

---

## 5. Production Observability & Troubleshooting

| Problem / Failure | Potential Root Cause | Triage & Remediation Step |
| :--- | :--- | :--- |
| **502 Bad Gateway on API** | Backend service down or crash on startup | Check Gunicorn/Uvicorn logs: `journalctl -u careconnect-backend -n 100` |
| **Database Connection Refused** | PostgreSQL unreachable or connection pool exhausted | Verify connection count: `SELECT count(*) FROM pg_stat_activity;`. Ensure `pool_pre_ping=True`. |
| **Caregiver GPS Check-In Fails** | Location permissions denied on device or coordinates > 200m away | Verify device location permission in browser settings. If valid exception, use Supervisor Override in Ops Incident Desk. |
| **Offline Sync Not Replaying** | Network intermittent or IndexedDB corrupted | Caregiver can tap manual "Sync Now" button on bottom bar once connectivity is restored. |
| **403 Forbidden on Elder Access** | Sponsor attempting unassigned elder or Caregiver without active shift | Verify caregiver is assigned via `CareAssignment` or `CareShift`. Check audit logs in `/api/audit`. |
| **SOS Alert Not Visible in Ops** | Incident desk filter set or network packet dropped | Ensure Ops Incident Desk has status filter set to "All" or "Active". Check `/api/incidents/desk`. |
