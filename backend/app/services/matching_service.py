import json
from typing import List, Tuple, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.elder import Elder
from app.models.matching import CaregiverMatchResult
from app.models.user import User
from app.schemas.caregiver import (
    CaregiverMatchItem,
    CaregiverResponse,
    CuratedMatchesResponse,
)


async def seed_initial_data_if_empty(db: AsyncSession):
    """Seed demo caregiver/SLA data when the database is empty or missing admin demo caregivers."""

    from app.models.sla import SLAVersion

    # ---------------------------------------------------------
    # Demo sponsor
    # ---------------------------------------------------------
    result = await db.execute(select(User).where(User.role == "FAMILY_SPONSOR").limit(1))
    sponsor = result.scalars().first()

    if not sponsor:
        sponsor = User(
            fullName="Ramesh Krishnan",
            name="Ramesh Krishnan",
            email="ramesh.krishnan@careconnect.in",
            phone="+919840123456",
            role="FAMILY_SPONSOR",
            authProvider="PHONE_OTP",
            auth_method="whatsapp_otp",
        )
        db.add(sponsor)
        await db.flush()

    # ---------------------------------------------------------
    # Demo elder
    # ---------------------------------------------------------
    result = await db.execute(
        select(Elder).where(Elder.sponsor_id == sponsor.id).limit(1)
    )
    elder = result.scalars().first()

    if not elder:
        elder = Elder(
            familyId=sponsor.id,
            sponsor_id=sponsor.id,
            name="Kalyani Ammal",
            full_name="Kalyani Ammal",
            age=78,
            gender="FEMALE",
            locality="Adyar",
            address="14/2, 2nd Main Road, Gandhi Nagar, Adyar, Chennai - 600020",
            primary_language="Tamil",
            secondary_language="English",
            primaryLanguage="Tamil",
            mobilityLevel="CANE_WALKER",
            mobility_level="Assisted Walking",
            medicalConditions=[
                "Mild Dementia",
                "Hypertension",
                "Post-Fall Monitoring",
            ],
            medical_conditions="Mild Dementia, Hypertension, Post-Fall Monitoring",
            careRequirements=["Assisted Care"],
            care_tier_needed="Assisted Care",
            shiftPreference="EIGHT_HOUR_DAY",
            shift_preference="Day 10-Hour",
            personaStatus="SAVED",
        )
        db.add(elder)

    # ---------------------------------------------------------
    # Demo Caregivers & Verified KYC / User Records
    # ---------------------------------------------------------
    demo_caregivers_data = [
        {
            "full_name": "Priya Sundaram",
            "phone": "+919840211223",
            "gender": "FEMALE",
            "headline": "Senior Geriatric Attendant & BSc Nurse (AHA BLS Certified)",
            "photo_url": "https://images.unsplash.com/photo-1594824813629-65313364f9f7?w=300&auto=format&fit=crop&q=80",
            "experience_years": 6,
            "locality": "Adyar",
            "service_radius_km": 15.0,
            "primary_language": "Tamil",
            "languages": "Tamil, English, Telugu",
            "skills": "Dementia Care, Medication Management, Mobility Assistance, Vital Signs Monitoring, Palliative Support",
            "specializations": "Geriatric Nursing Support, Alzheimer Support, BSc Nursing",
            "qualifications": "BSc Nursing, AHA BLS/CPR Certified, GCA-NSDC-TN-4102",
            "shift_types": "Day 10-Hour, Night 12-Hour",
            "hourly_rate": 150.0,
            "daily_rate": 1400.0,
            "rating": 4.9,
            "review_count": 54,
            "is_police_verified": True,
            "is_clinical_certified": True,
            "is_identity_verified": True,
            "is_active": True,
            "status": "AVAILABLE",
            "bio": "Senior geriatric attendant with BSc Nursing, certified by AHA with 6+ years of dedicated elder companion experience specializing in Alzheimer routines.",
        },
        {
            "full_name": "Anitha Ramesh",
            "phone": "+919840322334",
            "gender": "FEMALE",
            "headline": "Post-Stroke Rehabilitation Aide & Diabetic Specialist",
            "photo_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
            "experience_years": 5,
            "locality": "Besant Nagar",
            "service_radius_km": 15.0,
            "primary_language": "Tamil",
            "languages": "Tamil, Telugu, English",
            "skills": "Bedridden Patient Care, Catheter Hygiene, Vitals Triage, Diabetic Protocol, Passive Range-of-Motion",
            "specializations": "Post-Stroke Care, Diabetic Management",
            "qualifications": "Post-Stroke Rehabilitation Aide, Diabetic Foot & Insulin Care, ANM Nursing",
            "shift_types": "Day 10-Hour, 24/7 Live-in",
            "hourly_rate": 160.0,
            "daily_rate": 1500.0,
            "rating": 4.8,
            "review_count": 42,
            "is_police_verified": True,
            "is_clinical_certified": True,
            "is_identity_verified": True,
            "is_active": True,
            "status": "AVAILABLE",
            "bio": "Experienced attendant with clinical background in post-stroke recovery, specialized bed-mobility protocols, and diabetic management under doctor supervision.",
        },
        {
            "full_name": "Karthik Rajan",
            "phone": "+919840433445",
            "gender": "MALE",
            "headline": "Advanced Physiotherapy Assistant & Mobility Specialist",
            "photo_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
            "experience_years": 8,
            "locality": "T. Nagar",
            "service_radius_km": 20.0,
            "primary_language": "Tamil",
            "languages": "Tamil, Hindi, English",
            "skills": "Physiotherapy Assistant, Safe Patient Transfers, Night Monitoring, Ortho Rehab, Bedridden Transfer",
            "specializations": "Ortho Rehab, Physical Therapy Aid",
            "qualifications": "Advanced Physiotherapy Assistant (PTA), Emergency First Aid & BLS",
            "shift_types": "Night 12-Hour, 24/7 Live-in",
            "hourly_rate": 175.0,
            "daily_rate": 1600.0,
            "rating": 4.95,
            "review_count": 68,
            "is_police_verified": True,
            "is_clinical_certified": True,
            "is_identity_verified": True,
            "is_active": True,
            "status": "AVAILABLE",
            "bio": "8 years of high-dependency geriatric care experience with specialized training in orthopedic rehabilitation, wheelchair transfers, and 24/7 safety.",
        },
        {
            "full_name": "Deepa Natarajan",
            "phone": "+919840544556",
            "gender": "FEMALE",
            "headline": "Cardiac Care Aide & Elder Companion Specialist",
            "photo_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
            "experience_years": 4,
            "locality": "Anna Nagar",
            "service_radius_km": 15.0,
            "primary_language": "Tamil",
            "languages": "Tamil, English",
            "skills": "Nutritional Meal Prep, BP & Sugar Logging, Cardiac Telemetry, Cognitive Stimulation, Companion Walking",
            "specializations": "Cardiac Care, Cognitive Stimulation",
            "qualifications": "Cardiac Care Aide Certification, Geriatric Nutrition & Meal Hygiene",
            "shift_types": "Day 10-Hour",
            "hourly_rate": 140.0,
            "daily_rate": 1350.0,
            "rating": 4.85,
            "review_count": 38,
            "is_police_verified": True,
            "is_clinical_certified": True,
            "is_identity_verified": True,
            "is_active": True,
            "status": "AVAILABLE",
            "bio": "Trained cardiac and cognitive care companion skilled in meticulous medication logging, heart-healthy dietary preparation, and elder companionship.",
        },
        {
            "full_name": "Suresh Babu",
            "phone": "+919840655667",
            "gender": "MALE",
            "headline": "Certified Home Health Aide & Clinical Escort",
            "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
            "experience_years": 3,
            "locality": "Mylapore",
            "service_radius_km": 15.0,
            "primary_language": "Tamil",
            "languages": "Tamil",
            "skills": "General Attendant Care, Clinical Escort for Appointments, Medication Logistics, Wheelchair Assistance",
            "specializations": "Basic Elderly Care, Emergency Backup",
            "qualifications": "Certified Home Health Aide, Basic Clinical Escort & Transport",
            "shift_types": "Day 10-Hour, On-Demand Standby",
            "hourly_rate": 130.0,
            "daily_rate": 1200.0,
            "rating": 4.7,
            "review_count": 26,
            "is_police_verified": True,
            "is_clinical_certified": True,
            "is_identity_verified": True,
            "is_active": True,
            "status": "AVAILABLE",
            "bio": "Dedicated attendant stationed at Mylapore, ready for rapid replacement shifts and hospital visits escort assistance.",
        },
        {
            "full_name": "Divya Krishnan",
            "phone": "+919840766778",
            "gender": "FEMALE",
            "headline": "BSc Nurse & Critical Palliative Care Specialist",
            "photo_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
            "experience_years": 7,
            "locality": "Adyar",
            "service_radius_km": 20.0,
            "primary_language": "Tamil",
            "languages": "Tamil, Malayalam, English",
            "skills": "Palliative Care, Tracheostomy Care, IV Infusion Watch, Critical Geriatric Care, Vital Signs Monitoring",
            "specializations": "Critical Geriatric Care, Palliative Support, BSc Nursing",
            "qualifications": "BSc Nursing, Palliative Care Specialist (IAPC), BLS / ACLS (AHA)",
            "shift_types": "Day 10-Hour, Night 12-Hour",
            "hourly_rate": 190.0,
            "daily_rate": 1800.0,
            "rating": 4.9,
            "review_count": 60,
            "is_police_verified": True,
            "is_clinical_certified": True,
            "is_identity_verified": True,
            "is_active": True,
            "status": "AVAILABLE",
            "bio": "BSc Nursing graduate and certified palliative care specialist with 7 years of intensive home-care nursing experience.",
        },
    ]

    for item in demo_caregivers_data:
        # 1. Ensure User record exists
        u_res = await db.execute(select(User).where(User.phone == item["phone"]))
        u = u_res.scalars().first()
        if not u:
            u = User(
                fullName=item["full_name"],
                name=item["full_name"],
                phone=item["phone"],
                email=f"{item['full_name'].lower().replace(' ', '.')}@careconnect.in",
                dob="1994-08-14",
                gender=item["gender"],
                locality=item["locality"],
                role="CAREGIVER",
                authProvider="PHONE_OTP",
            )
            db.add(u)
            await db.flush()

        # 2. Ensure CaregiverKYC record exists
        kyc_res = await db.execute(select(CaregiverKYC).where(CaregiverKYC.caregiver_id == u.id))
        kyc = kyc_res.scalars().first()
        if not kyc:
            kyc = CaregiverKYC(
                caregiver_id=u.id,
                document_type="AADHAAR",
                document_number="984012348899",
                verification_status="VERIFIED",
            )
            db.add(kyc)
            await db.flush()

        # 3. Ensure Caregiver directory record exists
        cg_res = await db.execute(
            select(Caregiver).where(
                (Caregiver.phone == item["phone"]) | (Caregiver.full_name == item["full_name"])
            )
        )
        cg = cg_res.scalars().first()
        if not cg:
            cg = Caregiver(
                full_name=item["full_name"],
                phone=item["phone"],
                gender=item["gender"],
                headline=item["headline"],
                photo_url=item["photo_url"],
                experience_years=item["experience_years"],
                locality=item["locality"],
                service_radius_km=item["service_radius_km"],
                primary_language=item["primary_language"],
                languages=item["languages"],
                skills=item["skills"],
                specializations=item["specializations"],
                qualifications=item.get("qualifications"),
                shift_types=item["shift_types"],
                hourly_rate=item["hourly_rate"],
                daily_rate=item["daily_rate"],
                rating=item["rating"],
                review_count=item["review_count"],
                is_police_verified=item["is_police_verified"],
                is_clinical_certified=item["is_clinical_certified"],
                is_identity_verified=item["is_identity_verified"],
                is_active=item["is_active"],
                status=item["status"],
                bio=item["bio"],
            )
            db.add(cg)
        else:
            # Update phone, qualifications, gender, and status to ensure consistency
            if not cg.phone:
                cg.phone = item["phone"]
            if not cg.qualifications:
                cg.qualifications = item.get("qualifications")
            cg.gender = item["gender"]
            cg.status = item["status"]
            cg.is_identity_verified = True
            cg.is_active = True

    # ---------------------------------------------------------
    # SLA v1.0
    # ---------------------------------------------------------
    result = await db.execute(
        select(SLAVersion).where(SLAVersion.version == "1.0").limit(1)
    )
    sla = result.scalars().first()

    if not sla:
        sla = SLAVersion(
            version="1.0",
            title="CareConnect Elder Care Service Level Agreement (SLA v1.0)",
            summary="Standard Service Terms, Professional Code of Conduct, Emergency Protocols, and DPDP Act 2023 Compliance for In-Home Caregiver Assignments.",
            code_of_conduct="""1. Professional Standards: Caregivers must maintain utmost dignity, patience, and respectful communication at all times.
2. Clinical Boundaries: Caregivers administer prescribed oral medication only per written sponsor instructions and log vitals. Invasive medical procedures are strictly prohibited unless authorized by a licensed attending physician.
3. Attendance & Geofencing: Check-in and check-out occur strictly within the verified geofenced perimeter of the elder's residence.
4. Absolute Non-Abuse Policy: CareConnect operates zero-tolerance for physical, verbal, emotional, or financial neglect or mistreatment.""",
            notice_periods="""1. 48-Hour Notice Policy: Either party may request schedule changes or reassignment with 48 hours advance notice via the sponsor dashboard.
2. Rapid Replacement Guarantee: In case of caregiver medical emergency or unplanned absence, CareConnect dispatches a vetted replacement caregiver within 2 hours.
3. Trial Cancellation: Full refund of unused advance deposit balance if canceled within the 7-day trial window.""",
            emergency_liability="""1. Immediate Escalation: In acute medical distress, the caregiver activates the platform SOS, contacts 108 Emergency Ambulance, and directly alerts the Primary Sponsor.
2. Operational Limitation: CareConnect provides non-emergency home care attendants and is not an acute emergency room provider.
3. Liability Cap: Platform responsibility is limited to professional caregiver vetting, credential verification, and continuous care manager supervision.""",
            dpdp_compliance_terms="""1. India DPDP Act 2023 Compliance: All elder demographic, location, and health monitoring data is processed strictly with explicit sponsor consent and stored within Indian territory.
2. Privacy of Vitals: Daily care logs and vitals are encrypted at rest and accessible solely to the authorized primary sponsor and assigned care clinical manager.
3. Data Right to Erasure: Sponsors retain the right to download or request erasure of non-statutory health records upon care completion.""",
        )
        db.add(sla)

    await db.commit()


def calculate_match_score(
    elder: Elder,
    caregiver: Caregiver,
) -> Tuple[float, str, List[str], List[str], bool]:

    score = 0.0
    reasons = []
    matching_skills = []
    matching_languages = []

    elder_locality = (elder.locality or "").lower()
    caregiver_locality = (caregiver.locality or "").lower()

    # 1. Locality   30%
    locality_match = False

    if (
        elder_locality
        and caregiver_locality
        and (
            elder_locality in caregiver_locality
            or caregiver_locality in elder_locality
        )
    ):
        score += 30.0
        locality_match = True
        reasons.append(
            f"Based in {caregiver.locality}, matching elder's locality ({elder.locality})"
        )
    else:
        south_chennai = [
            "adyar",
            "mylapore",
            "besant nagar",
            "thiruvanmiyur",
            "alwarpet",
        ]

        if elder_locality in south_chennai and caregiver_locality in south_chennai:
            score += 24.0
            locality_match = True
            reasons.append(
                f"Within South Chennai care cluster ({caregiver.locality} ? {elder.locality})"
            )
        else:
            score += 15.0
            reasons.append(
                f"Servicing {elder.locality} within {int(caregiver.service_radius_km)}km transit radius"
            )

    # 2. Language   25%
    elder_langs = [
        value.strip().lower()
        for value in f"{elder.primary_language or ''},{elder.secondary_language or ''}".split(",")
        if value.strip()
    ]

    cg_langs = [
        value.strip().lower()
        for value in (caregiver.languages or "").split(",")
        if value.strip()
    ]

    matching_languages = [
        value.capitalize()
        for value in elder_langs
        if value in cg_langs
    ]

    if elder.primary_language and elder.primary_language.lower() in cg_langs:
        score += 25.0
        reasons.append(
            f"Fluent in primary language ({elder.primary_language})"
        )
    elif any(value in cg_langs for value in elder_langs):
        score += 18.0
        reasons.append("Speaks elder's secondary language")
    else:
        score += 10.0

    # 3. Medical / mobility   30%
    elder_conditions = (
        getattr(elder, "medical_conditions", None)
        or ""
    ).lower()

    elder_mobility = (
        getattr(elder, "mobility_level", None)
        or ""
    ).lower()

    cg_skills = (caregiver.skills or "").lower()
    cg_specs = (caregiver.specializations or "").lower()
    cg_care_types = (getattr(caregiver, "preferred_care_types", None) or "").lower()
    cg_work_prefs = (getattr(caregiver, "work_preferences", None) or "").lower()

    condition_points = 0.0

    if "dementia" in elder_conditions or "memory" in elder_conditions:
        if (
            "dementia" in cg_skills
            or "dementia" in cg_specs
            or "memory" in cg_specs
            or "dementia" in cg_care_types
            or "memory" in cg_care_types
        ):
            condition_points += 15.0
            matching_skills.append("Dementia Specialist Care")

    if "stroke" in elder_conditions or "post-fall" in elder_conditions or "fall" in elder_conditions:
        if (
            "rehab" in cg_skills
            or "stroke" in cg_specs
            or "fall prevention" in cg_skills
            or "post-op" in cg_care_types
            or "recovery" in cg_care_types
        ):
            condition_points += 15.0
            matching_skills.append("Fall Prevention & Mobility Rehab")

    if "bedridden" in elder_conditions or "bed" in elder_mobility:
        if (
            "bedridden" in cg_care_types
            or "bed_bound" in cg_care_types
            or "bedridden" in cg_skills
        ):
            condition_points += 15.0
            matching_skills.append("Bedridden Patient Care")

    if "assisted" in elder_mobility or "wheelchair" in elder_mobility or "cane" in elder_mobility:
        if (
            "mobility" in cg_skills
            or "walking" in cg_skills
            or "transfer" in cg_skills
            or "wheelchair" in cg_care_types
            or "partial_mobility" in cg_care_types
            or "mobility" in cg_care_types
        ):
            condition_points = max(condition_points, 15.0)
            matching_skills.append("Assisted Mobility Support")

    if condition_points == 0.0:
        condition_points = 20.0
        matching_skills.append("General Elder Care & Vitals")
    else:
        condition_points = min(30.0, condition_points + 10.0)

    score += condition_points
    reasons.append(
        f"Clinical specialty aligned with elder's persona ({elder.care_tier_needed})"
    )

    # 4. Rating / experience   15%
    exp_points = min(
        10.0,
        (caregiver.experience_years / 5.0) * 10.0,
    )

    rating_points = (caregiver.rating / 5.0) * 5.0
    score += exp_points + rating_points

    # 5. Schedule & Shift Compatibility
    elder_shift = (getattr(elder, "shiftPreference", "") or getattr(elder, "shift_preference", "") or "").upper()
    cg_all_shifts = f"{caregiver.shift_types or ''} {cg_work_prefs}".upper()

    if "FLEXIBLE" in elder_shift:
        routine = getattr(elder, "dailyRoutine", None) or {}
        if isinstance(routine, str):
            try:
                routine = json.loads(routine)
            except Exception:
                routine = {}
        start_t = routine.get("preferredStartTime") or "09:00"
        end_t = routine.get("preferredEndTime") or "17:00"
        reasons.append(f"Available for flexible schedule ({start_t} - {end_t})")
    elif "TWENTY_FOUR" in elder_shift or "24" in elder_shift or "LIVE_IN" in elder_shift:
        if "24" in cg_all_shifts or "LIVE" in cg_all_shifts:
            score += 5.0
            reasons.append("Prefers and available for 24-Hour live-in companion care")
        else:
            reasons.append("Aligned with 24-Hour live-in companion care")
    elif "TWELVE" in elder_shift or "12" in elder_shift or "NIGHT" in elder_shift:
        if "12" in cg_all_shifts or "NIGHT" in cg_all_shifts:
            score += 5.0
            reasons.append("Available for preferred 12-Hour night shift coverage")
        else:
            reasons.append("Aligned with 12-Hour day/night shift coverage")
    elif "EIGHT" in elder_shift or "8" in elder_shift or "DAY" in elder_shift:
        if "DAY" in cg_all_shifts or "8" in cg_all_shifts or "10" in cg_all_shifts:
            score += 5.0
            reasons.append("Available for preferred 8-10 hour day shift care")
        else:
            reasons.append("Aligned with 8-Hour day shift care")

    final_score = min(99.0, max(65.0, round(score, 1)))
    rationale = " - ".join(reasons)

    return (
        final_score,
        rationale,
        matching_skills,
        matching_languages,
        locality_match,
    )


async def get_curated_caregivers_for_elder(
    db: AsyncSession,
    elder_id: str,
    gender: Optional[str] = None,
    qualification: Optional[str] = None,
    availability: Optional[str] = None,
    max_daily_rate: Optional[float] = None,
    search: Optional[str] = None,
) -> CuratedMatchesResponse:

    await seed_initial_data_if_empty(db)

    result = await db.execute(
        select(Elder).where(Elder.id == elder_id).limit(1)
    )
    elder = result.scalars().first()

    if not elder:
        result = await db.execute(select(Elder).limit(1))
        elder = result.scalars().first()

    if not elder:
        raise ValueError("Elder not found")

    query = select(Caregiver).where(Caregiver.is_active.is_(True))

    if gender and gender.strip() and gender.strip().upper() != "ALL":
        query = query.where(func.upper(Caregiver.gender) == gender.strip().upper())

    if max_daily_rate is not None and max_daily_rate > 0:
        query = query.where(Caregiver.daily_rate <= max_daily_rate)

    result = await db.execute(query)
    all_caregivers = result.scalars().all()

    filtered_caregivers = []
    for cg in all_caregivers:
        # Invariant: PROFILE COMPLETE + REQUIRED KYC VERIFIED + CAREGIVER ACTIVE = ELIGIBLE FOR WORK
        if not cg.is_active:
            continue

        is_verified = bool(cg.is_identity_verified)
        if cg.phone:
            user_res = await db.execute(select(User).where(User.phone == cg.phone))
            cg_user = user_res.scalars().first()
            if cg_user:
                if not cg_user.is_active:
                    continue
                # Explicit incomplete flag or placeholder name check
                if getattr(cg_user, "_explicit_profile_complete", None) is False:
                    continue
                if any(bad in (cg_user.fullName or "").lower() for bad in ["incomplete", "pending onboarding", "new caregiver"]):
                    continue
                if not cg_user.isProfileComplete and not (cg.full_name and cg.gender):
                    continue

                kyc_res = await db.execute(select(CaregiverKYC).where(CaregiverKYC.caregiver_id == cg_user.id))
                kyc = kyc_res.scalars().first()
                if kyc:
                    if kyc.verification_status != "VERIFIED":
                        continue
                    is_verified = True
                elif not cg.is_identity_verified:
                    continue

        if not is_verified:
            continue

        # Enforce verified qualifications for clinical work
        if qualification and any(k in qualification.lower() for k in ["bsc", "nurs", "clinical", "gnm"]):
            if cg.is_clinical_certified is False or cg.education_verification_status == "REJECTED":
                continue

        # 1. Qualification filter
        if qualification and qualification.strip() and qualification.strip().upper() != "ALL":
            q_needle = qualification.strip().lower()
            cg_quals = (cg.qualifications or "").lower()
            cg_specs = (cg.specializations or "").lower()
            cg_skills = (cg.skills or "").lower()
            cg_headline = (cg.headline or "").lower()

            # Handle BSc Nursing specifically as requested
            if "bsc" in q_needle:
                matched = (
                    "bsc" in cg_quals
                    or "bsc" in cg_specs
                    or "bsc" in cg_headline
                )
            elif "nurs" in q_needle:
                matched = (
                    "nurs" in cg_quals
                    or "nurs" in cg_specs
                    or "nurs" in cg_headline
                )
            else:
                matched = (
                    q_needle in cg_quals
                    or q_needle in cg_specs
                    or q_needle in cg_skills
                    or q_needle in cg_headline
                )
            if not matched:
                continue

        # 2. Availability filter
        if availability and availability.strip() and availability.strip().upper() != "ALL":
            av_needle = availability.strip().lower()
            cg_status = (cg.status or "").lower()
            cg_shifts = (cg.shift_types or "").lower()
            if (
                av_needle not in cg_status
                and av_needle not in cg_shifts
                and "available" not in cg_status
            ):
                continue

        # 3. Search query filter
        if search and search.strip():
            s_needle = search.strip().lower()
            blob = f"{cg.full_name} {cg.locality} {cg.skills} {cg.specializations} {cg.qualifications or ''} {cg.headline or ''} {getattr(cg, 'preferred_care_types', '') or ''} {getattr(cg, 'work_preferences', '') or ''}".lower()
            if s_needle not in blob:
                continue

        filtered_caregivers.append(cg)

    match_items: List[CaregiverMatchItem] = []

    for cg in filtered_caregivers:
        score, rationale, skills, langs, loc_match = calculate_match_score(
            elder,
            cg,
        )

        match_items.append(
            CaregiverMatchItem(
                caregiver=CaregiverResponse.model_validate(cg),
                match_score=score,
                match_percentage=int(score),
                rationale=rationale,
                matching_skills=skills,
                matching_languages=langs,
                locality_match=loc_match,
            )
        )

    match_items.sort(
        key=lambda item: item.match_score,
        reverse=True,
    )

    # Return all verified and filtered candidates (not hardcoded to 3)
    curated = match_items

    for item in curated[:10]:
        result = await db.execute(
            select(CaregiverMatchResult).where(
                CaregiverMatchResult.elder_id == elder.id,
                CaregiverMatchResult.caregiver_id == item.caregiver.id,
            ).limit(1)
        )

        existing = result.scalars().first()

        if not existing:
            db.add(
                CaregiverMatchResult(
                    elder_id=elder.id,
                    caregiver_id=item.caregiver.id,
                    match_score=item.match_score,
                    criteria_snapshot=json.dumps(
                        {
                            "skills": item.matching_skills,
                            "languages": item.matching_languages,
                            "locality_match": item.locality_match,
                        }
                    ),
                    rationale=item.rationale,
                    status="ACTIVE",
                )
            )

    await db.commit()

    return CuratedMatchesResponse(
        elder_id=elder.id,
        elder_name=elder.full_name or elder.name,
        elder_locality=elder.locality or "",
        required_care_tier=elder.care_tier_needed or "",
        total_candidates=len(curated),
        matches=curated,
    )
