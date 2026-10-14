# CareConnect (Chennai) — Elder Care Platform

CareConnect is a managed elder-care platform connecting **Family / Primary Sponsors**, **Caregivers / Attendants**, and **Operations / Care Managers** in Chennai, Tamil Nadu.

This repository implements **Phase A: Onboarding & Clinical/Lifestyle Intake**:
- **Phase A.1**: Sign-Up & Geographic Verification (WhatsApp OTP, Google Sign-In, Chennai corridor serviceability validation).
- **Phase A.2**: Patient Persona Configuration (10-step intake wizard covering mobility, clinical requirements, dietary needs, languages, lifestyle routines, shift preferences, and review-with-direct-edit).
- **Phase A.3**: Home Assessment Booking (Clinical Care Manager home visit scheduling using verified elder address snapshot).

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │    React + Vite + Tailwind Frontend   │
                      │    (Sponsor Portal & 10-Step Wizard)  │
                      └──────────────────┬────────────────────┘
                                         │ REST API
                      ┌──────────────────▼────────────────────┐
                      │            FastAPI Backend            │
                      │  - JWT Bearer Auth & Roles            │
                      │  - Chennai GeoService (PostGIS/Grid)  │
                      │  - Persona State Machine Engine       │
                      │  - Home Assessment Booking Engine     │
                      └──────────────────┬────────────────────┘
                                         │ Async SQLAlchemy 2.0
                      ┌──────────────────▼────────────────────┐
                      │    PostgreSQL + PostGIS / SQLite      │
                      │  - Users (Family Sponsors)            │
                      │  - Elders (Intake Persona)            │
                      │  - ElderLocations (Chennai Corridors) │
                      │  - HomeAssessmentRequests             │
                      └───────────────────────────────────────┘
```

---

## Quick Start & Development

For comprehensive architecture details, test credentials, and troubleshooting, see the [Developer & Debugging Guide](file:///c:/Users/manor/Desktop/project/CareConnect/docs/DEBUGGING.md).

### 1. One-Command Full Platform Start
To run all 4 services (FastAPI Backend, Family PWA, Caregiver PWA, Admin Portal) and the Unified Reverse Proxy together:

```bash
# Install all frontend dependencies
npm run install:all

# Run backend + 3 frontends + reverse proxy concurrently
npm run dev:all

# Check health and connectivity of all services
npm run health

# Start Cloudflare quick tunnel for remote testing
npm run tunnel
```

Once running:
- **Unified Portal**: `http://localhost:3000`
- **Family PWA**: `http://localhost:3000/` (direct: `:5173`)
- **Caregiver PWA**: `http://localhost:3000/caregiver` (direct: `:5174`)
- **Admin Portal**: `http://localhost:3000/admin` (direct: `:5175`)
- **Backend API & Swagger Docs**: `http://localhost:3000/docs` (direct: `:8000`)
- **Live Proxy Diagnostics**: `http://localhost:3000/proxy-status`

On Windows, you can also launch all services with dedicated consoles using `.\scripts\run_project.bat` or `.\scripts\run_project.ps1`, and stop them cleanly with `.\scripts\stop_project.bat`.

### 2. Standalone Service Setup

#### Backend Setup (FastAPI)
```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest               # Run 129 automated tests
python run.py                  # Launches on port 8000
```

#### Frontend Setup (Family Portal)
```bash
cd frontend
npm install
npm run dev                    # Launches on port 5173
npm run build                  # Production build & typecheck
```

---

## Key Features & Compliance

1. **WhatsApp OTP & Google Sign-In**:
   - Built with self-issued JWTs (`HS256`), rate-limiting (max 5 OTP sends/hour, 5 failed verify lockouts).
   - In dev/test environments, deterministic OTP `123456` is enabled for rapid testing.
2. **Server-Side Geographic Verification**:
   - Backend evaluates Chennai coverage corridors (Adyar, Besant Nagar, T. Nagar, Anna Nagar, Mylapore, Velachery, OMR, etc.) and valid PIN codes (`600001`–`600135`).
   - Returns canonical states: `VERIFIED`, `NOT_SERVICEABLE`, `INVALID_ADDRESS`, `UNABLE_TO_VERIFY`, `PERMISSION_DENIED`.
   - Never trusts client-supplied `serviceable=True`.
3. **Structured Patient Persona**:
   - Captures non-diagnostic, family-supplied observations: Mobility levels, medical conditions, devices, dietary preferences, primary and secondary languages, daily routine, and shift choices (8-hr Day, 12-hr Day/Night, 24-hr Live-in).
   - Edit-from-review functionality allows instant navigation to modify any section before final submission.
4. **Clinical Home Assessment Booking**:
   - Optional recommended step capturing a frozen snapshot of the verified address with appointment date and time slot.