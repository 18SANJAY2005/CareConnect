import json
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.caregiver import Caregiver
from app.models.elder import Elder
from app.models.matching import CaregiverMatchResult
from app.schemas.caregiver import CaregiverMatchItem, CaregiverResponse, CuratedMatchesResponse


def seed_initial_data_if_empty(db: Session):
    """Seed verified caregivers and default SLA version if database is empty."""
    from app.models.sla import SLAVersion
    from app.models.user import User

    # Ensure demo sponsor exists
    sponsor = db.query(User).filter(User.id == 1).first()
    if not sponsor:
        sponsor = User(
            id=1,
            name="Ramesh Krishnan",
            email="ramesh.krishnan@careconnect.in",
            phone="+919840123456",
            role="sponsor",
            auth_method="whatsapp_otp"
        )
        db.add(sponsor)
        db.commit()

    # Ensure demo elder exists
    elder = db.query(Elder).filter(Elder.id == 1).first()
    if not elder:
        elder = Elder(
            id=1,
            sponsor_id=1,
            full_name="Kalyani Ammal",
            age=78,
            gender="Female",
            locality="Adyar",
            address="14/2, 2nd Main Road, Gandhi Nagar, Adyar, Chennai - 600020",
            primary_language="Tamil",
            secondary_language="English",
            mobility_level="Assisted Walking",
            medical_conditions="Mild Dementia, Hypertension, Post-Fall Monitoring",
            care_tier_needed="Assisted Care",
            shift_preference="Day 10-Hour"
        )
        db.add(elder)
        db.commit()

    # Seed caregivers if none
    if db.query(Caregiver).count() == 0:
        caregivers = [
            Caregiver(
                id=1,
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
                bio="Trained at Kauvery Geriatric Institute with 6 years dedicated to elder care in Chennai. Fluent in Tamil & English. Gentle, calm approach with dementia and post-operative mobility patients."
            ),
            Caregiver(
                id=2,
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
                bio="Over 5 years aiding elderly recovery in Central & South Chennai. Experienced with physiotherapy routines, blood pressure logging, and respectful companionship."
            ),
            Caregiver(
                id=3,
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
                bio="Passionate caregiver focusing on active engagement, dignity in personal care, and healthy South Indian dietary preparation for seniors living independently."
            ),
            Caregiver(
                id=4,
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
                bio="Experienced male caregiver specializing in high physical support, wheelchair transfers, and night-shift surveillance for senior men in Chennai."
            )
        ]
        db.add_all(caregivers)
        db.commit()

    # Seed SLA v1.0
    sla = db.query(SLAVersion).filter(SLAVersion.version == "1.0").first()
    if not sla:
        sla = SLAVersion(
            version="1.0",
            title="CareConnect Elder Care Service Level Agreement (SLA v1.0)",
            summary="Standard Service Terms, Professional Code of Conduct, Emergency Protocols, and DPDP Act 2023 Compliance for In-Home Caregiver Assignments.",
            code_of_conduct="""1. Professional Standards: Caregivers must maintain utmost dignity, patience, and respectful communication at all times.
2. Clinical Boundaries: Caregivers administer prescribed oral medication only per written sponsor instructions and log vitals. Invasive medical procedures are strictly prohibited unless authorized by a licensed attending physician.
3. Attendance & Geofencing: Check-in and check-out occur strictly within the verified geofenced perimeter of the elder's residence.
4. Absolute Non-Abuse Policy: CareConnect operates zero-tolerance for physical, verbal, emotional, or financial neglect or mistreatment. All interactions are protected under the Senior Citizens Act (2007).""",
            notice_periods="""1. 48-Hour Notice Policy: Either party may request schedule changes or reassignment with 48 hours advance notice via the sponsor dashboard.
2. Rapid Replacement Guarantee: In case of caregiver medical emergency or unplanned absence, CareConnect dispatches a vetted replacement caregiver within 2 hours.
3. Trial Cancellation: Full refund of unused advance deposit balance if canceled within the 7-day trial window.""",
            emergency_liability="""1. Immediate Escalation: In acute medical distress, the caregiver activates the platform SOS, contacts 108 Emergency Ambulance, and directly alerts the Primary Sponsor.
2. Operational Limitation: CareConnect provides non-emergency home care attendants and is not an acute emergency room provider.
3. Liability Cap: Platform responsibility is limited to professional caregiver vetting, credential verification, and continuous care manager supervision.""",
            dpdp_compliance_terms="""1. India DPDP Act 2023 Compliance: All elder demographic, location, and health monitoring data is processed strictly with explicit sponsor consent and stored within Indian territory (GCP asia-south1).
2. Privacy of Vitals: Daily care logs and vitals are encrypted at rest and accessible solely to the authorized primary sponsor and assigned care clinical manager.
3. Data Right to Erasure: Sponsors retain the right to download or request erasure of non-statutory health records upon care completion."""
        )
        db.add(sla)
        db.commit()


def calculate_match_score(elder: Elder, caregiver: Caregiver) -> Tuple[float, str, List[str], List[str], bool]:
    """
    Computes a weighted match score (0 - 100%) between Elder persona and Caregiver:
    - Locality / Distance: 30%
    - Language Match: 25%
    - Mobility & Medical Condition Specialty: 30%
    - Rating & Experience: 15%
    """
    score = 0.0
    reasons = []
    matching_skills = []
    matching_languages = []

    # 1. Locality Match (30 pts)
    locality_match = False
    if elder.locality.lower() in caregiver.locality.lower() or caregiver.locality.lower() in elder.locality.lower():
        score += 30.0
        locality_match = True
        reasons.append(f"Based in {caregiver.locality}, matching elder's locality ({elder.locality})")
    else:
        # Neighboring / South Chennai common corridor
        south_chennai = ["adyar", "mylapore", "besant nagar", "thiruvanmiyur", "alwarpet"]
        if elder.locality.lower() in south_chennai and caregiver.locality.lower() in south_chennai:
            score += 24.0
            locality_match = True
            reasons.append(f"Within South Chennai care cluster ({caregiver.locality} ↔ {elder.locality})")
        else:
            score += 15.0
            reasons.append(f"Servicing {elder.locality} within {int(caregiver.service_radius_km)}km transit radius")

    # 2. Language Match (25 pts)
    elder_langs = [l.strip().lower() for l in f"{elder.primary_language},{elder.secondary_language or ''}".split(",") if l.strip()]
    cg_langs = [l.strip().lower() for l in caregiver.languages.split(",") if l.strip()]
    
    matched_l = [l.capitalize() for l in elder_langs if l in cg_langs]
    matching_languages = matched_l
    if elder.primary_language.lower() in cg_langs:
        score += 25.0
        reasons.append(f"Fluent in primary language ({elder.primary_language})")
    elif any(l in cg_langs for l in elder_langs):
        score += 18.0
        reasons.append("Speaks elder's secondary language")
    else:
        score += 10.0

    # 3. Medical Needs & Mobility Match (30 pts)
    elder_conditions = (elder.medical_conditions or "").lower()
    elder_mobility = (elder.mobility_level or "").lower()
    cg_skills = caregiver.skills.lower()
    cg_specs = caregiver.specializations.lower()

    condition_points = 0.0
    if "dementia" in elder_conditions:
        if "dementia" in cg_skills or "dementia" in cg_specs or "memory" in cg_specs:
            condition_points += 15.0
            matching_skills.append("Dementia Specialist Care")
    if "stroke" in elder_conditions or "post-fall" in elder_conditions:
        if "rehab" in cg_skills or "stroke" in cg_specs or "fall prevention" in cg_skills:
            condition_points += 15.0
            matching_skills.append("Fall Prevention & Mobility Rehab")
    if "assisted" in elder_mobility or "wheelchair" in elder_mobility:
        if "mobility" in cg_skills or "walking" in cg_skills or "transfer" in cg_skills:
            condition_points = max(condition_points, 15.0)
            matching_skills.append("Assisted Mobility Support")

    if condition_points == 0.0:
        condition_points = 20.0
        matching_skills.append("General Elder Care & Vitals")
    else:
        condition_points = min(30.0, condition_points + 10.0)

    score += condition_points
    reasons.append(f"Clinical specialty aligned with elder's persona ({elder.care_tier_needed})")

    # 4. Rating & Experience (15 pts)
    exp_points = min(10.0, (caregiver.experience_years / 5.0) * 10.0)
    rating_points = (caregiver.rating / 5.0) * 5.0
    score += (exp_points + rating_points)

    final_score = min(99.0, max(65.0, round(score, 1)))
    rationale = " • ".join(reasons)

    return final_score, rationale, matching_skills, matching_languages, locality_match


def get_curated_caregivers_for_elder(db: Session, elder_id: int) -> CuratedMatchesResponse:
    """Returns curated 2-3 vetted caregiver matches ranked by suitability."""
    seed_initial_data_if_empty(db)

    elder = db.query(Elder).filter(Elder.id == elder_id).first()
    if not elder:
        # Fallback to demo elder 1
        elder = db.query(Elder).filter(Elder.id == 1).first()

    caregivers = db.query(Caregiver).filter(Caregiver.is_active == True).all()

    match_items: List[CaregiverMatchItem] = []
    for cg in caregivers:
        score, rationale, skills, langs, loc_match = calculate_match_score(elder, cg)
        match_items.append(
            CaregiverMatchItem(
                caregiver=CaregiverResponse.model_validate(cg),
                match_score=score,
                match_percentage=int(score),
                rationale=rationale,
                matching_skills=skills,
                matching_languages=langs,
                locality_match=loc_match
            )
        )

    # Sort descending by match score and pick top 3
    match_items.sort(key=lambda x: x.match_score, reverse=True)
    curated = match_items[:3]

    # Save to caregiver_match_results for audit
    for item in curated:
        existing = db.query(CaregiverMatchResult).filter(
            CaregiverMatchResult.elder_id == elder.id,
            CaregiverMatchResult.caregiver_id == item.caregiver.id
        ).first()
        if not existing:
            match_res = CaregiverMatchResult(
                elder_id=elder.id,
                caregiver_id=item.caregiver.id,
                match_score=item.match_score,
                criteria_snapshot=json.dumps({
                    "skills": item.matching_skills,
                    "languages": item.matching_languages,
                    "locality_match": item.locality_match
                }),
                rationale=item.rationale,
                status="ACTIVE"
            )
            db.add(match_res)
    db.commit()

    return CuratedMatchesResponse(
        elder_id=elder.id,
        elder_name=elder.full_name,
        elder_locality=elder.locality,
        required_care_tier=elder.care_tier_needed,
        total_candidates=len(curated),
        matches=curated
    )

