#!/usr/bin/env python3
"""
CareConnect - Controlled Development & Testing Data Seeding Script
==================================================================
Creates internally consistent, repeatable demo data for local testing across
Family app, Caregiver PWA, and Admin Portal.

Eligibility Rules Enforced:
- Priya Sundaram (+919840211223): KYC VERIFIED by Admin, Profile complete, eligible for work.
- Meenakshi Sundaram (+919876500001): KYC PENDING, profile complete, work selection gated.
- Saravanan Kumar (+919840999888): KYC REJECTED, work blocked.
- Suresh Kumar (+919876543210): Family Sponsor with Elder Kalyani Ammal in Adyar, Chennai.

Usage:
    python scripts/seed_demo_data.py
    or:
    cd backend && python -m scripts.seed_demo_data
"""

import sys
import os
import asyncio
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text

from app.core.config import settings
from app.models.user import User
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.models.assignment import CareAssignment
from app.models.shift import CareShift, AttendanceLog
from app.models.sla import SLAVersion
from app.services.care_task_service import CareTaskService


async def seed_data():
    # 1. Environment Guard: Never run on production
    env = getattr(settings, "ENVIRONMENT", "development").lower()
    if env not in ["development", "test", "local"]:
        print(f"[FATAL] Cannot run seed script in environment: '{env}'. Only 'development' or 'test' allowed.")
        sys.exit(1)

    print(f"[*] Starting CareConnect safe demo data seeding (Environment: {env})...")
    print(f"[*] Database URL: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        now = datetime.now(timezone.utc)

        # -------------------------------------------------------------
        # 1. Admin & Operations Users
        # -------------------------------------------------------------
        admin_res = await db.execute(select(User).where(User.email == "admin@careconnect.com"))
        admin_user = admin_res.scalars().first()
        if not admin_user:
            admin_user = User(
                role="ADMIN",
                fullName="Platform Administrator",
                email="admin@careconnect.com",
                phone="+919876599900",
                authProvider="LOCAL_ADMIN",
            )
            db.add(admin_user)
            await db.flush()
            print("  [+] Created Admin User: admin@careconnect.com")
        else:
            admin_user.role = "ADMIN"
            admin_user.phone = "+919876599900"
            await db.flush()

        ops_res = await db.execute(select(User).where(User.phone == "+919876599999"))
        ops_user = ops_res.scalars().first()
        if not ops_user:
            ops_user = User(
                role="OPS_MANAGER",
                fullName="Deepa Operations",
                email="operations@careconnect.in",
                phone="+919876599999",
                authProvider="PHONE_OTP",
            )
            db.add(ops_user)
            await db.flush()
            print("  [+] Created Ops Manager: Deepa Operations (+919876599999)")
        else:
            ops_user.role = "OPS_MANAGER"
            await db.flush()

        # -------------------------------------------------------------
        # 2. Family Sponsor User & Elder Profile
        # -------------------------------------------------------------
        sponsor_res = await db.execute(select(User).where(User.phone == "+919876543210"))
        sponsor = sponsor_res.scalars().first()
        if not sponsor:
            sponsor = User(
                role="FAMILY_SPONSOR",
                fullName="Suresh Kumar",
                name="Suresh Kumar",
                phone="+919876543210",
                email="suresh.kumar@example.com",
                authProvider="PHONE_OTP",
            )
            db.add(sponsor)
            await db.flush()
            print("  [+] Created Family Sponsor: Suresh Kumar (+919876543210)")
        else:
            sponsor.role = "FAMILY_SPONSOR"
            sponsor.fullName = "Suresh Kumar"
            await db.flush()

        # Elder Kalyani Ammal
        elder_res = await db.execute(select(Elder).where(Elder.name == "Kalyani Ammal"))
        elder = elder_res.scalars().first()
        if not elder:
            elder = Elder(
                familyId=sponsor.id,
                sponsor_id=sponsor.id,
                name="Kalyani Ammal",
                full_name="Kalyani Ammal",
                age=74,
                gender="FEMALE",
                locality="Adyar",
                address="14/2, 2nd Main Road, Gandhi Nagar, Adyar, Chennai - 600020",
                primaryLanguage="Tamil",
                primary_language="Tamil",
                secondary_language="English",
                mobilityLevel="CANE_WALKER",
                mobility_level="Assisted Walking",
                medicalConditions=["Hypertension", "Type 2 Diabetes", "Post-Fall Monitoring"],
                medical_conditions="Hypertension, Type 2 Diabetes, Post-Fall Monitoring",
                careRequirements=["Assisted Care", "Mobility Assistance", "Daily Vitals Tracking"],
                care_tier_needed="Assisted Care",
                shiftPreference="EIGHT_HOUR_DAY",
                shift_preference="Day 10-Hour",
                personaStatus="SAVED",
            )
            db.add(elder)
            await db.flush()
            print("  [+] Created Elder: Kalyani Ammal (Adyar)")
        else:
            elder.familyId = sponsor.id
            elder.sponsor_id = sponsor.id
            elder.locality = "Adyar"
            await db.flush()

        # Verified Adyar Location for Geofence Testing
        loc_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == elder.id))
        loc = loc_res.scalars().first()
        if not loc:
            loc = ElderLocation(
                elderId=elder.id,
                addressLine1="14/2, 2nd Main Road, Gandhi Nagar",
                locality="Adyar",
                city="Chennai",
                state="Tamil Nadu",
                postalCode="600020",
                latitude=13.0012,
                longitude=80.2565,
                verificationStatus="VERIFIED",
                serviceable=True,
            )
            db.add(loc)
            await db.flush()
        else:
            loc.latitude = 13.0012
            loc.longitude = 80.2565
            loc.verificationStatus = "VERIFIED"
            loc.serviceable = True
            await db.flush()

        # -------------------------------------------------------------
        # 3. Demo Caregivers (Verified, Pending, and Rejected KYC)
        # -------------------------------------------------------------

        # Caregiver A: Priya Sundaram - Fully Verified & Work-Ready
        cg_priya_user_res = await db.execute(select(User).where(User.phone == "+919840211223"))
        cg_priya_user = cg_priya_user_res.scalars().first()
        if not cg_priya_user:
            cg_priya_user = User(
                role="CAREGIVER",
                fullName="Priya Sundaram",
                name="Priya Sundaram",
                phone="+919840211223",
                email="priya.sundaram@careconnect.in",
                dob="1992-06-20",
                gender="FEMALE",
                locality="Adyar",
                avatarUrl="https://images.unsplash.com/photo-1594824813629-65313364f9f7?w=400",
                authProvider="PHONE_OTP",
            )
            db.add(cg_priya_user)
            await db.flush()
            print("  [+] Created Caregiver User: Priya Sundaram (+919840211223)")
        else:
            cg_priya_user.role = "CAREGIVER"
            cg_priya_user.fullName = "Priya Sundaram"
            cg_priya_user.locality = "Adyar"
            await db.flush()

        cg_priya_dir_res = await db.execute(select(Caregiver).where(Caregiver.phone == "+919840211223"))
        cg_priya_dir = cg_priya_dir_res.scalars().first()
        if not cg_priya_dir:
            cg_priya_dir = Caregiver(
                full_name="Priya Sundaram",
                phone="+919840211223",
                gender="FEMALE",
                headline="Senior Geriatric Attendant & BSc Nurse (AHA BLS Certified)",
                photo_url="https://images.unsplash.com/photo-1594824813629-65313364f9f7?w=400",
                experience_years=6,
                locality="Adyar",
                service_radius_km=15.0,
                primary_language="Tamil",
                languages="Tamil, English, Telugu",
                skills="Dementia Care, Medication Management, Mobility Assistance, Vital Signs Monitoring",
                specializations="Geriatric Nursing Support, Alzheimer Support, BSc Nursing",
                qualifications="BSc Nursing, AHA BLS/CPR Certified",
                shift_types="Day 10-Hour, Night 12-Hour",
                hourly_rate=150.0,
                daily_rate=1400.0,
                rating=4.9,
                review_count=54,
                is_police_verified=True,
                is_clinical_certified=True,
                is_identity_verified=True,
                is_active=True,
                status="AVAILABLE",
                bio="Senior geriatric attendant with BSc Nursing and 6+ years experience in South Chennai.",
                educational_qualifications="B.Sc Nursing, Government College of Nursing Chennai",
                certifications="AHA BLS/CPR Certified, Geriatric Care Attendant (GCA-NSDC-TN-4102)",
                previous_experience="6 years at Apollo Home Care & Senior Living Chennai",
                preferred_care_types="PARTIAL_MOBILITY, WHEELCHAIR_ASSISTANCE, DEMENTIA_COMPANION, BEDRIDDEN",
                work_preferences="Day 10-Hour Shifts, within 12km of Adyar",
                preferred_hours="08:00 - 18:00",
            )
            db.add(cg_priya_dir)
            await db.flush()
        else:
            cg_priya_dir.status = "AVAILABLE"
            cg_priya_dir.is_active = True
            cg_priya_dir.is_identity_verified = True
            cg_priya_dir.preferred_care_types = "PARTIAL_MOBILITY, WHEELCHAIR_ASSISTANCE, DEMENTIA_COMPANION, BEDRIDDEN"
            cg_priya_dir.work_preferences = "Day 10-Hour Shifts, within 12km of Adyar"
            cg_priya_dir.preferred_hours = "08:00 - 18:00"
            await db.flush()

        # KYC for Priya: Legitimate VERIFIED status by Admin
        kyc_priya_res = await db.execute(select(CaregiverKYC).where(CaregiverKYC.caregiver_id == cg_priya_user.id))
        kyc_priya = kyc_priya_res.scalars().first()
        if not kyc_priya:
            kyc_priya = CaregiverKYC(
                caregiver_id=cg_priya_user.id,
                document_type="AADHAAR",
                document_number="541278963214",
                document_storage_reference="local://kyc/priya_aadhaar_verified.pdf",
                verification_status="VERIFIED",
                verified_by_id=admin_user.id,
                verified_at=now,
            )
            db.add(kyc_priya)
            await db.flush()
            print("  [+] Verified KYC for Priya Sundaram (Status: VERIFIED)")
        else:
            kyc_priya.verification_status = "VERIFIED"
            kyc_priya.verified_by_id = admin_user.id
            kyc_priya.verified_at = now
            await db.flush()

        # Caregiver B: Meenakshi Sundaram - PENDING KYC (Work Gated)
        cg_meena_user_res = await db.execute(select(User).where(User.phone == "+919876500001"))
        cg_meena_user = cg_meena_user_res.scalars().first()
        if not cg_meena_user:
            cg_meena_user = User(
                role="CAREGIVER",
                fullName="Meenakshi Sundaram",
                name="Meenakshi Sundaram",
                phone="+919876500001",
                email="meenakshi.care@careconnect.in",
                dob="1990-05-15",
                gender="FEMALE",
                locality="Adyar",
                avatarUrl="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
                authProvider="PHONE_OTP",
            )
            db.add(cg_meena_user)
            await db.flush()
            print("  [+] Created Caregiver User: Meenakshi Sundaram (+919876500001)")
        else:
            cg_meena_user.role = "CAREGIVER"
            cg_meena_user.fullName = "Meenakshi Sundaram"
            await db.flush()

        cg_meena_dir_res = await db.execute(select(Caregiver).where(Caregiver.phone == "+919876500001"))
        cg_meena_dir = cg_meena_dir_res.scalars().first()
        if not cg_meena_dir:
            cg_meena_dir = Caregiver(
                full_name="Meenakshi Sundaram",
                phone="+919876500001",
                gender="FEMALE",
                headline="Elder Care Assistant (KYC Under Admin Review)",
                photo_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
                experience_years=4,
                locality="Adyar",
                service_radius_km=10.0,
                primary_language="Tamil",
                languages="Tamil, English",
                skills="General Elderly Care, Vitals Monitoring, Companionship",
                status="PENDING_VERIFICATION",
                is_active=False,
                is_identity_verified=False,
                educational_qualifications="Higher Secondary, Diploma in Geriatric Care",
                certifications="First Aid Certificate",
                previous_experience="3 years private elder assistant",
                preferred_care_types="PARTIAL_MOBILITY, WHEELCHAIR_ASSISTANCE",
                work_preferences="Day Shifts, Adyar cluster",
                preferred_hours="08:00 - 18:00",
            )
            db.add(cg_meena_dir)
            await db.flush()
        else:
            cg_meena_dir.preferred_care_types = "PARTIAL_MOBILITY, WHEELCHAIR_ASSISTANCE"
            await db.flush()

        kyc_meena_res = await db.execute(select(CaregiverKYC).where(CaregiverKYC.caregiver_id == cg_meena_user.id))
        kyc_meena = kyc_meena_res.scalars().first()
        if not kyc_meena:
            kyc_meena = CaregiverKYC(
                caregiver_id=cg_meena_user.id,
                document_type="AADHAAR",
                document_number="987654321099",
                document_storage_reference="local://kyc/meenakshi_aadhaar_pending.pdf",
                verification_status="PENDING",
            )
            db.add(kyc_meena)
            await db.flush()
            print("  [+] Created Pending KYC for Meenakshi Sundaram (Status: PENDING - Work Gated)")
        else:
            kyc_meena.verification_status = "PENDING"
            await db.flush()

        # Caregiver C: Saravanan Kumar - REJECTED KYC (Work Blocked)
        cg_sarav_user_res = await db.execute(select(User).where(User.phone == "+919840999888"))
        cg_sarav_user = cg_sarav_user_res.scalars().first()
        if not cg_sarav_user:
            cg_sarav_user = User(
                role="CAREGIVER",
                fullName="Saravanan Kumar",
                name="Saravanan Kumar",
                phone="+919840999888",
                email="saravanan.kumar@careconnect.in",
                dob="1988-11-04",
                gender="MALE",
                locality="Mylapore",
                authProvider="PHONE_OTP",
            )
            db.add(cg_sarav_user)
            await db.flush()
            print("  [+] Created Caregiver User: Saravanan Kumar (+919840999888)")
        else:
            cg_sarav_user.role = "CAREGIVER"
            await db.flush()

        kyc_sarav_res = await db.execute(select(CaregiverKYC).where(CaregiverKYC.caregiver_id == cg_sarav_user.id))
        kyc_sarav = kyc_sarav_res.scalars().first()
        if not kyc_sarav:
            kyc_sarav = CaregiverKYC(
                caregiver_id=cg_sarav_user.id,
                document_type="PAN",
                document_number="ABCDE9999K",
                document_storage_reference="local://kyc/saravanan_pan_rejected.pdf",
                verification_status="REJECTED",
                rejection_reason="Document photo blurry and illegible. Please re-upload clear government ID.",
                verified_by_id=admin_user.id,
                verified_at=now,
            )
            db.add(kyc_sarav)
            await db.flush()
            print("  [+] Created Rejected KYC for Saravanan Kumar (Status: REJECTED - Work Blocked)")
        else:
            kyc_sarav.verification_status = "REJECTED"
            await db.flush()

        # -------------------------------------------------------------
        # 4. Assignment Offer for Priya Sundaram (Waiting Confirmation)
        # -------------------------------------------------------------
        assign_res = await db.execute(
            select(CareAssignment).where(
                (CareAssignment.elder_id == str(elder.id)) &
                (CareAssignment.caregiver_id == cg_priya_dir.id) &
                (CareAssignment.status.in_(["WAITING_CONFIRMATION", "ACTIVE", "CONFIRMED"]))
            ).order_by(CareAssignment.id.desc())
        )
        assign = assign_res.scalars().first()
        if not assign:
            assign = CareAssignment(
                elder_id=elder.id,
                caregiver_id=cg_priya_dir.id,
                sponsor_id=sponsor.id,
                shift_type="Day 10-Hour",
                start_date=now.strftime("%Y-%m-%d"),
                status="WAITING_CONFIRMATION",
                notes="Elder requires mobility support and routine medication logging. Adyar residence.",
                monthly_rate=24000.0,
                responseDeadline=now + timedelta(hours=4),
            )
            db.add(assign)
            await db.flush()
            print(f"  [+] Created Assignment Offer #{assign.id} (Status: WAITING_CONFIRMATION)")
        else:
            assign.status = "WAITING_CONFIRMATION"
            assign.responseDeadline = now + timedelta(hours=4)
            await db.flush()

        # -------------------------------------------------------------
        # 5. Active Shift for Priya & Tasks
        # -------------------------------------------------------------
        shift_res = await db.execute(select(CareShift).where(CareShift.elderId == elder.id))
        shift = shift_res.scalars().first()
        if not shift:
            shift = CareShift(
                elderId=elder.id,
                caregiverId=cg_priya_user.id,
                shiftType="EIGHT_HOUR_DAY",
                status="ACTIVE",
                scheduledStart=now.replace(hour=8, minute=0, second=0, microsecond=0),
                scheduledEnd=now.replace(hour=16, minute=0, second=0, microsecond=0),
                geofenceRadiusMeters=200.0,
                supervisorNotes="Routine assisted care in Adyar. Medication observation & vitals.",
            )
            db.add(shift)
            await db.flush()
            print(f"  [+] Created CareShift #{shift.id} for Priya & Kalyani Ammal")
        else:
            shift.caregiverId = cg_priya_user.id
            shift.status = "ACTIVE"
            shift.scheduledStart = now.replace(hour=8, minute=0, second=0, microsecond=0)
            shift.scheduledEnd = now.replace(hour=16, minute=0, second=0, microsecond=0)
            await db.flush()

        # Seed standard daily tasks for the shift
        await CareTaskService.ensure_shift_tasks(db, shift.id, elder.id, cg_priya_user.id)

        # -------------------------------------------------------------
        # 6. SLA v1.0
        # -------------------------------------------------------------
        sla_res = await db.execute(select(SLAVersion).where(SLAVersion.version == "1.0"))
        if not sla_res.scalars().first():
            sla = SLAVersion(
                version="1.0",
                title="CareConnect Elder Care Service Level Agreement (SLA v1.0)",
                summary="Standard Service Terms, Professional Code of Conduct, Emergency Protocols.",
                code_of_conduct="1. Dignity and Respect at all times.\n2. Non-abuse policy.\n3. Attendance geofencing.",
                notice_periods="48-hour notice for schedule adjustments.",
                emergency_liability="Immediate 108 ambulance & sponsor alert upon acute distress.",
                dpdp_compliance_terms="India DPDP Act 2023 compliant data processing.",
            )
            db.add(sla)
            await db.flush()

        await db.commit()

    await engine.dispose()
    print("\n[SUCCESS] Seeded fresh, internally consistent CareConnect demo records:")
    print("  * Admin: admin@careconnect.com / admin123 (Port 5175)")
    print("  * Sponsor: Suresh Kumar (+919876543210 / OTP 123456) (Port 5173)")
    print("  * Elder: Kalyani Ammal (Adyar, Chennai, Assisted Care)")
    print("  * Caregiver (Eligible/Verified): Priya Sundaram (+919840211223 / OTP 123456) (Port 5174)")
    print("  * Caregiver (Pending KYC): Meenakshi Sundaram (+919876500001 / OTP 123456)")
    print("  * Caregiver (Rejected KYC): Saravanan Kumar (+919840999888 / OTP 123456)")
    print("  * Active Assignment Offer & Shift linked with Adyar geofence")


if __name__ == "__main__":
    asyncio.run(seed_data())
