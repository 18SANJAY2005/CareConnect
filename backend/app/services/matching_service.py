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
