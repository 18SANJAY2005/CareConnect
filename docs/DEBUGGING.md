# CareConnect — Developer & Debugging Guide

This guide provides developers and QA engineers with everything needed to run, inspect, debug, and test the CareConnect platform.

---

## 1. System Architecture & Port Mapping

CareConnect consists of four core microservices united under a local reverse proxy:

| Service | Port | Directory | Description | Direct URL | Via Proxy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FastAPI Backend** | `8000` | `backend/` | REST API, Auth, SQLite/PostGIS, Matching | `http://localhost:8000` | `http://localhost:3000/api` |
| **Family PWA** | `5173` | `frontend/` | Sponsor Portal, 10-step wizard, Caregiver tab | `http://localhost:5173` | `http://localhost:3000/` |
| **Caregiver PWA** | `5174` | `caregiver-app/` | Attendant shifts, clock-in/out, OTP verification | `http://localhost:5174` | `http://localhost:3000/caregiver` |
| **Admin Portal** | `5175` | `admin-web/` | Operations, KYC verification, SLA dispatch | `http://localhost:5175` | `http://localhost:3000/admin` |
| **Reverse Proxy** | `3000` | `scripts/` | Unified router + WebSocket HMR + debug diagnostics | `http://localhost:3000` | — |

---

## 2. Quick Commands

All tasks can be executed from the root directory:

```bash
# 1. Install all dependencies (Backend + 3 Frontends)
npm run install:all
pip install -r backend/requirements.txt

# 2. Launch entire platform with unified reverse proxy
npm run dev:all
# Or on Windows using PowerShell:
.\scripts\run_project.ps1

# 3. Check health and connectivity of all 5 services
npm run health

# 4. Run automated tests (129 tests across Phase A, B, C, D)
npm run test:backend

# 5. Build and typecheck all frontends
npm run build:all

# 6. Share platform over the internet (Cloudflare Quick Tunnel)
npm run tunnel

# 7. Stop all running background processes and free ports
.\scripts\stop_project.bat
```

---

## 3. Real-Time Diagnostics & Endpoints

### Live Proxy Status Check
Navigate to:
```
http://localhost:3000/proxy-status
```
Returns a JSON summary verifying whether each service is actively listening on its designated port.

### API Interactive Documentation (Swagger & ReDoc)
- **Swagger UI**: `http://localhost:3000/docs` (or `http://localhost:8000/docs`)
- **ReDoc UI**: `http://localhost:3000/redoc`
- **OpenAPI Schema**: `http://localhost:3000/openapi.json`

### Direct Service Health Checks
- Backend: `GET http://localhost:3000/health` -> `{"status": "healthy"}`

---

## 4. Test Credentials & Authentication

- **Development Deterministic OTP**: Use `123456` for instant phone verification in development mode without sending physical SMS.
- **Family Phone**: Any valid 10-digit Indian number (e.g., `9876543210`).
- **Caregiver Phone**: Any valid 10-digit Indian number (e.g., `9876543211`).
- **Visit Verification OTPs**: Single-use 6-digit codes generated directly in the **Caregiver** tab on the Family PWA. Attendants enter the code on the Caregiver PWA to confirm arrival and task completion.

---

## 5. Troubleshooting Common Issues

### A. Port Conflict (Port 8000, 5173, 5174, 5175, or 3000 occupied)
- **Symptom**: `EADDRINUSE` or `Failed to listen`.
- **Fix**: Run `.\scripts\stop_project.bat` to forcefully terminate lingering Node, Python, and tunnel processes, or run `.\scripts\run_project.ps1` which automatically frees ports before booting.

### B. 502 Bad Gateway
- **Symptom**: Proxy responds with `Bad Gateway (502): Could not connect to {Service} on port {Port}`.
- **Fix**: The requested service is not running. Run `npm run health` to identify which service crashed, then start it with `npm run dev:{service}` (e.g., `npm run dev:backend`).

### C. Database Reset or Inspection
- **Location**: `backend/careconnect.db` (SQLite 3).
- **Reset**: Delete `backend/careconnect.db` and restart backend (`npm run dev:backend`). The database schema and baseline demo data will be recreated automatically on startup via `seed_initial_data_if_empty()`.

### D. Cloudflare Tunnel Access
- Running `npm run tunnel` creates a secure temporary public HTTPS URL forwarding to `http://localhost:3000`.
- All sub-paths (`/`, `/caregiver`, `/admin`, `/api`, `/docs`) work without CORS mismatches because all traffic passes through the reverse proxy.
