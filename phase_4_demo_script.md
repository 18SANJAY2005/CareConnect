# CareConnect — Phase 4 Demo Script
## Realistic 10–15 Minute End-to-End Live Demonstration

**Target Audience:** Clinical Directors, Operations Leadership, Product Stakeholders, and Family Sponsors.  
**Demonstration Scope:** Full lifecycle from Family Intake & Care Duration selection, to Automated CareShift Bridging, Caregiver PWA Shift Execution, Remote Family Timeline Transparency, and Operations Command & SOS Triage.

---

### Prerequisites & Test Accounts
- **Backend API:** `http://localhost:8000` (FastAPI with SQLite/PostgreSQL)
- **Family Sponsor Portal (PWA):** `http://localhost:5173`
  - Demo Phone: `+91 98765 43210` (OTP: `123456`)
- **Caregiver Portal (PWA):** `http://localhost:5174`
  - Demo Phone: `+91 98765 00001` (OTP: `123456`) — *Meenakshi Sundaram*
- **Operations Incident Desk (PWA / Monitor):** `http://localhost:5173`
  - Demo Phone: `+91 98765 99999` (OTP: `123456`) — *Operations Manager*

---

## SECTION 1 — FAMILY SPONSOR JOURNEY (5 Minutes)

### Goal
Demonstrate that a family sponsor can independently register, configure comprehensive elder care requirements and custom care durations (8h, 12h, 24h, or Flexible), match with verified Chennai caregivers, and confirm service without any database manipulation.

### Step-by-Step Script:
1. **Navigate to Family PWA:** Open `http://localhost:5173` on Desktop/Mobile browser.
2. **Authenticate:**
   - Tap **"Get Started / Login"**.
   - Enter Phone: `+91 98765 43210` -> Tap **Send OTP**.
   - Enter OTP: `123456` -> Authenticate as Family Sponsor (*Suresh Kumar*).
3. **Elder Intake & Location Verification:**
   - Tap **"Add Elder Profile"** / Complete intake wizard.
   - Enter Elder Name: `Kalyani Ammal`, Age: `74`, Gender: `Female`.
   - Enter Location: `14 Gandhi Road, Adyar, Chennai - 600020`.
   - Observe automatic geographic verification (Adyar corridor validated with assigned Adyar Cluster Hub).
4. **Care Requirements & Care Duration Selection:**
   - **Mobility:** Select `Assisted Walker`.
   - **Care Requirements:** Select `Medication Observation`, `Mobility Assistance`, `Hygiene Support`.
   - **Languages:** Select `Tamil` (Primary), `English`.
   - **Care Duration:** Select `12 Hours` (Day/Night) or `Flexible` (e.g., `09:00 - 17:00`).
   - Tap **"Proceed to Matching"**.
5. **AI Curated Matching & Caregiver Selection:**
   - Review top match: **Meenakshi Sundaram** (96% compatibility, 6 yrs experience, Adyar locality).
   - Review clinical specializations (Post-Stroke, Vitals Monitoring, Mobility).
   - Select **Meenakshi Sundaram**.
6. **Service Agreement & Confirmation:**
   - Review SLA terms & monthly transparent billing summary.
   - Tap **"Confirm & Activate Service"**.
   - Assignment is officially active in `SERVICE_CONFIRMED` state.

---

## SECTION 2 — CAREGIVER PWA ON-DUTY EXECUTION (4 Minutes)

### Goal
Demonstrate how the assigned caregiver logs in, automatically receives the exact CareShift bridging the assignment without manual dispatch, completes GPS geofenced check-in, records care tasks & vitals, uploads photos, and executes check-out.

### Step-by-Step Script:
1. **Open Caregiver PWA:** Navigate to `http://localhost:5174` (or installed mobile PWA).
2. **Caregiver Login:**
   - Enter Phone: `+91 98765 00001` -> OTP: `123456`.
   - View authenticated Caregiver Dashboard (*Meenakshi Sundaram*).
3. **Shift Auto-Bridge Inspection:**
   - Notice today's active shift is automatically loaded for `Kalyani Ammal`.
   - Verify duration badge: **TWELVE HOUR DAY NIGHT** (or selected duration), showing exact shift hours.
   - Observe residence address & 200m geofence radius.
4. **Geofenced Check-In:**
   - Tap **"Check In (Start Shift)"**.
   - Browser / Mobile captures GPS coordinates.
   - Geofence algorithm verifies distance against elder's verified Adyar location.
   - Status badge turns green: **ON DUTY (ACTIVE)**.
5. **Care Task Execution:**
   - Navigate to **"Tasks"** tab.
   - Check off daily protocol tasks:
     - Morning BP & Glucose check -> Mark **Completed** with note: *"Readings normal after light tiffin"*.
     - Assisted walking session (15 mins) -> Mark **Completed**.
6. **Vitals Recording:**
   - Navigate to **"Vitals"** tab.
   - Enter: BP `122/80 mmHg`, Pulse `72 bpm`, Temperature `98.4°F`, Glucose `112 mg/dL`.
   - Tap **"Save Vitals"** -> Instant feedback confirmation.
7. **Photo & Care Observation:**
   - Navigate to **"Log / Timeline"** -> Tap **"Add Photo / Observation"**.
   - Attach a meal or ambulation photo with note: *"Walking exercise completed safely in veranda"*.
8. **Shift Check-Out:**
   - Tap **"Check Out (End Shift)"**.
   - Enter Handover Summary: *"Evening medicines given at 5:00 PM. Vitals stable throughout shift. Handed over to daughter."*
   - Tap **"Confirm Check-Out"** -> Shift state updates to **CHECKED OUT**.

---

## SECTION 3 — FAMILY LIVE CARE TIMELINE (2 Minutes)

### Goal
Demonstrate real-time family transparency where elder family members can monitor care delivery without calling the caregiver.

### Step-by-Step Script:
1. **Return to Family Portal:** Open `http://localhost:5173`.
2. **View Active Care Dashboard:**
   - Observe real-time shift status (**Checked Out** / **On Duty**).
   - Verify Caregiver Badge: *Meenakshi Sundaram (Verified Attendant)*.
3. **Inspect Care Timeline:**
   - Review completed task checklist with timestamps and caregiver notes.
   - Review physiological vitals trend graphs and latest blood pressure reading (`122/80`).
   - View uploaded photo and caregiver handover observations.

---

## SECTION 4 — OPERATIONS COMMAND & EMERGENCY SOS (3 Minutes)

### Goal
Demonstrate the Operations Manager Incident Desk handling live shifts, supervisor overrides, and P1 emergency incident escalation workflows.

### Step-by-Step Script:
1. **Trigger Caregiver SOS (Emergency Scenario):**
   - From Caregiver PWA (`:5174`), tap emergency **"SOS"** button.
   - Confirm SOS prompt: *"Trigger emergency escalation for Kalyani Ammal"*.
   - P1 Incident is instantly registered on the backend with GPS coordinates.
2. **Operations Incident Desk Triage:**
   - Switch to Operations Manager view.
   - Open **Incident Desk** -> Notice immediate flashing P1 Critical alert for *Kalyani Ammal*.
   - **Step 1:** Tap **"Acknowledge Incident"** (records manager timestamp & audit ID).
   - **Step 2:** Tap **"Escalate / Contact Family & Clinical Lead"** -> Log action: *"Field supervisor audio call placed; elder verified alert and safe"*.
   - **Step 3:** Tap **"Resolve Incident"** with resolution audit log.
3. **Live Shift Monitor:**
   - Open **Operations Live Shift Monitor** (`/api/shifts/monitor`).
   - Review real-time status across all shifts in Chennai with active geofence distances.

---

## SECTION 5 — SAFETY & ISOLATION VERIFICATION (1 Minute)

### Goal
Prove that security, role separation, offline capabilities, and data integrity remain uncompromised.

### Highlights:
1. **Multi-Session Isolation:** Family PWA (`careconnect_token`) and Caregiver PWA (`careconnect_caregiver_token`) coexist in the same browser without session clobbering.
2. **Strict Authorization Boundaries:** Family tokens attempting caregiver shift check-in return `403 Forbidden`. Unauthorized caregivers cannot modify tasks or vitals for unassigned elders.
3. **Offline Queue Synchronization:** Care tasks marked offline are stored in IndexedDB and automatically synchronized with the backend upon network reconnection.
4. **Production Gating:** Demo seeds and debug endpoints are strictly gated to development/test environments.

---

### Demo Completion Verdict
**CareConnect is fully demonstrated and ready for production stakeholder review.**
