import json
from typing import List, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.caregiver import Caregiver
from app.models.elder import Elder
from app.models.matching import CaregiverMatchResult
from app.schemas.caregiver import (
    CaregiverMatchItem,
    CaregiverResponse,
    CuratedMatchesResponse,
)


async def seed_initial_data_if_empty(db: AsyncSession):
    """Seed demo caregiver/SLA data when the database is empty."""

    from app.models.sla import SLAVersion
    from app.models.user import User

    # ---------------------------------------------------------
    # Demo sponsor
    # ---------------------------------------------------------
    result = await db.execute(select(User).limit(1))
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
    # Caregivers
    # ---------------------------------------------------------
    result = await db.execute(select(func.count(Caregiver.id)))
    caregiver_count = result.scalar_one()

    if caregiver_count == 0:
        caregivers = [
            Caregiver(
                full_name="Ananya Ramanathan",
                headline="Certified Geriatric Caregiver & Dementia Specialist",
                photo_url="https://images.unsplash.com/photo-1594824813629-65313364f9f7?w=300&auto=format&fit=crop&q=80",
                experience_years=6,
                locality="Adyar",
                service_radius_km=12.0,
                primary_language="Tamil",
                languages="Tamil, English",
                skills="Dementia Care, Fall Prevention, Vitals Monitoring, Assisted Walking, Medication Reminders",
                specializations="Geriatric Nursing & Memory Support",
                shift_types="Day 10-Hour, Night 12-Hour",
                hourly_rate=260.0,
                daily_rate=2100.0,
                rating=4.95,
                review_count=32,
                is_police_verified=True,
                is_clinical_certified=True,
                is_identity_verified=True,
                is_active=True,
                bio="Trained at Kauvery Geriatric Institute with 6 years dedicated to elder care in Chennai. Fluent in Tamil & English. Gentle, calm approach with dementia and post-operative mobility patients.",
            ),
            Caregiver(
                full_name="S. Meenakshi Sundaram",
                headline="Registered Auxiliary Nurse & Post-Stroke Rehab Specialist",
                photo_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
                experience_years=5,
                locality="Mylapore",
                service_radius_km=15.0,
                primary_language="Tamil",
                languages="Tamil, English, Telugu",
                skills="Post-Stroke Rehab, Assisted Mobility, BP & Sugar Tracking, Dietary Prep, Emotional Support",
                specializations="Stroke Recovery & Physical Therapy Aid",
                shift_types="Day 10-Hour, 24/7 Live-in",
                hourly_rate=250.0,
                daily_rate=2000.0,
                rating=4.88,
                review_count=24,
                is_police_verified=True,
                is_clinical_certified=True,
                is_identity_verified=True,
                is_active=True,
                bio="Over 5 years aiding elderly recovery in Central & South Chennai. Experienced with physiotherapy routines, blood pressure logging, and respectful companionship.",
            ),
            Caregiver(
                full_name="Deepa Padmanabhan",
                headline="Senior Compassionate Care Assistant & Companion",
                photo_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
                experience_years=4,
                locality="Besant Nagar",
                service_radius_km=10.0,
                primary_language="Tamil",
                languages="Tamil, English",
                skills="Assisted Walking, Nutritional Support, Vitals Logging, Cognitive Games, Personal Hygiene",
                specializations="Active Elder Companionship & Assisted Daily Living",
                shift_types="Day 10-Hour",
                hourly_rate=230.0,
                daily_rate=1850.0,
                rating=4.92,
                review_count=19,
                is_police_verified=True,
                is_clinical_certified=True,
                is_identity_verified=True,
                is_active=True,
                bio="Passionate caregiver focusing on active engagement, dignity in personal care, and healthy South Indian dietary preparation for seniors living independently.",
            ),
            Caregiver(
                full_name="R. Karthikeyan",
                headline="Certified Male Care Attendant & Mobility Assistant",
                photo_url="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
                experience_years=7,
                locality="Anna Nagar",
                service_radius_km=20.0,
                primary_language="Tamil",
                languages="Tamil, English",
                skills="Bedridden Transfer, Wheelchair Navigation, Physical Assistance, Catheter Hygiene Support",
                specializations="Intensive Physical Support & High Mobility Aid",
                shift_types="Night 12-Hour, 24/7 Live-in",
                hourly_rate=280.0,
                daily_rate=2300.0,
                rating=4.90,
                review_count=28,
                is_police_verified=True,
                is_clinical_certified=True,
                is_identity_verified=True,
                is_active=True,
                bio="Experienced male caregiver specializing in high physical support, wheelchair transfers, and night-shift surveillance for senior men in Chennai.",
            ),
        ]

        db.add_all(caregivers)

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

    condition_points = 0.0

    if "dementia" in elder_conditions:
        if (
            "dementia" in cg_skills
            or "dementia" in cg_specs
            or "memory" in cg_specs
        ):
            condition_points += 15.0
            matching_skills.append("Dementia Specialist Care")

    if "stroke" in elder_conditions or "post-fall" in elder_conditions:
        if (
            "rehab" in cg_skills
            or "stroke" in cg_specs
            or "fall prevention" in cg_skills
        ):
            condition_points += 15.0
            matching_skills.append("Fall Prevention & Mobility Rehab")

    if "assisted" in elder_mobility or "wheelchair" in elder_mobility:
        if (
            "mobility" in cg_skills
            or "walking" in cg_skills
            or "transfer" in cg_skills
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
    elif "TWENTY_FOUR" in elder_shift or "24" in elder_shift:
        reasons.append("Aligned with 24-Hour live-in companion care")
    elif "TWELVE" in elder_shift or "12" in elder_shift:
        reasons.append("Aligned with 12-Hour day/night shift coverage")
    elif "EIGHT" in elder_shift or "8" in elder_shift:
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

    result = await db.execute(
        select(Caregiver).where(Caregiver.is_active.is_(True))
    )
    caregivers = result.scalars().all()

    match_items: List[CaregiverMatchItem] = []

    for cg in caregivers:
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

    curated = match_items[:3]

    for item in curated:
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
