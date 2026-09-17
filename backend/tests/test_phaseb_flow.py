from datetime import datetime, timedelta

from sqlalchemy import select

from app.models.elder import Elder
from app.models.user import User
from app.services.matching_service import seed_initial_data_if_empty


async def get_phase_b_ids(test_db):
    """
    Seed the Phase B demo data and return the actual UUIDs
    generated for the demo sponsor and elder.
    """

    await seed_initial_data_if_empty(test_db)

    elder_result = await test_db.execute(
        select(Elder).limit(1)
    )
    elder = elder_result.scalar_one()

    sponsor_result = await test_db.execute(
        select(User).where(User.id == elder.familyId)
    )
    sponsor = sponsor_result.scalar_one()

    return elder.id, sponsor.id


async def test_health_and_root(client):
    """Test basic CareConnect API health and root endpoints."""

    res = await client.get("/health")

    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res = await client.get("/")

    assert res.status_code == 200
    assert "India DPDP Act 2023" in res.json()["compliance"]
    assert res.json()["platform"] == "CareConnect"


async def test_b01_caregiver_matching_and_profiles(
    client,
    test_db,
):
    """
    Test B01:
    Elder persona matching, curated ranking,
    and privacy-safe caregiver profile.
    """

    # ---------------------------------------------------------
    # Get actual seeded UUID for the Phase B demo elder.
    # ---------------------------------------------------------

    elder_id, sponsor_id = await get_phase_b_ids(test_db)

    res = await client.get(
        f"/api/caregivers/matches?elder_id={elder_id}"
    )



    assert res.status_code == 200

    data = res.json()

    assert "matches" in data
    assert len(data["matches"]) >= 2

    top_match = data["matches"][0]

    # ---------------------------------------------------------
    # Match score
    # ---------------------------------------------------------

    assert "match_score" in top_match
    assert top_match["match_score"] >= 70

    assert "caregiver" in top_match

    cg = top_match["caregiver"]

    # ---------------------------------------------------------
    # Verification status badges
    # ---------------------------------------------------------

    assert cg["is_police_verified"] is True
    assert cg["is_clinical_certified"] is True
    assert cg["is_identity_verified"] is True

    # ---------------------------------------------------------
    # Privacy protection
    # Confidential government IDs must not be exposed.
    # ---------------------------------------------------------

    assert "aadhaar" not in cg
    assert "pan_number" not in cg
    assert "voter_id" not in cg

    # ---------------------------------------------------------
    # Test individual caregiver profile retrieval.
    # ---------------------------------------------------------

    cg_res = await client.get(
        f"/api/caregivers/{cg['id']}"
    )

    assert cg_res.status_code == 200

    cg_profile = cg_res.json()

    assert cg_profile["full_name"] == cg["full_name"]


async def test_end_to_end_phase_b_pipeline(
    client,
    test_db,
):
    """
    Test complete Phase B pipeline:

    B01 Selection
    ->
    B02 10-Minute Jitsi Call
    ->
    B03 Razorpay Advance Deposit
    ->
    B04 DPDP SLA Acceptance
    """

    # =========================================================
    # Get actual seeded UUIDs
    # =========================================================

    elder_id, sponsor_id = await get_phase_b_ids(test_db)

    # =========================================================
    # Step 1: B01 - Caregiver Matching
    # =========================================================

    match_res = await client.get(
        f"/api/caregivers/matches?elder_id={elder_id}"
    )

    assert match_res.status_code == 200

    match_data = match_res.json()

    assert "matches" in match_data
    assert len(match_data["matches"]) >= 2

    selected_caregiver = match_data["matches"][0]["caregiver"]

    # =========================================================
    # Step 1 continued: Create Care Assignment
    # =========================================================

    assign_payload = {
        "elder_id": elder_id,
        "caregiver_id": selected_caregiver["id"],
        "sponsor_id": sponsor_id,
        "shift_type": "Day 10-Hour",
        "start_date": "2026-09-20",
        "notes": (
            "Elder needs assistance with walking and "
            "medication reminders."
        ),
    }

    assign_res = await client.post(
        "/api/assignments",
        json=assign_payload,
    )



    assert assign_res.status_code == 200

    assignment = assign_res.json()

    assert assignment["status"] == "CAREGIVER_SELECTED"

    assignment_id = assignment["id"]

    # =========================================================
    # Step 2: B02 - Schedule 10-Minute Jitsi Intro Call
    # =========================================================

    scheduled_time = (
        datetime.utcnow() + timedelta(hours=2)
    ).isoformat()

    call_payload = {
        "assignment_id": assignment_id,
        "scheduled_at": scheduled_time,
        "timezone": "Asia/Kolkata",
        "call_notes": (
            "Discuss elder's routine and dietary habits"
        ),
    }

    call_res = await client.post(
        "/api/intro-calls",
        json=call_payload,
    )

    assert call_res.status_code == 200

    call_data = call_res.json()

    assert call_data["provider"] == "JITSI"
    assert "meet.jit.si" in call_data["join_url"]
    assert call_data["duration_minutes"] == 10
    assert call_data["status"] == "SCHEDULED"

    call_id = call_data["id"]

    # =========================================================
    # Complete Intro Call
    # =========================================================

    complete_res = await client.patch(
        f"/api/intro-calls/{call_id}/status",
        json={"status": "COMPLETED"},
    )

    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

    # =========================================================
    # Step 3: B03 - Advance Deposit via Razorpay
    # =========================================================

    order_payload = {
        "assignment_id": assignment_id,
        "sponsor_id": sponsor_id,
        "base_tier_amount": 14000.0,
        "addon_amount": 1000.0,
        "currency": "INR",
    }

    order_res = await client.post(
        "/api/payments/orders",
        json=order_payload,
    )

    assert order_res.status_code == 200

    order_data = order_res.json()

    assert order_data["amount"] == 15000.0
    assert order_data["provider_order_id"].startswith("order_")

    provider_order_id = order_data["provider_order_id"]

    # =========================================================
    # Verify Payment
    # =========================================================

    verify_payload = {
        "assignment_id": assignment_id,
        "sponsor_id": sponsor_id,
        "provider_order_id": provider_order_id,
        "provider_payment_id": "pay_test_phaseb_991122",
        "signature": "simulated_signature_valid_phaseb",
        "payment_method": "UPI",
    }

    verify_res = await client.post(
        "/api/payments/verify",
        json=verify_payload,
    )

    assert verify_res.status_code == 200

    verify_data = verify_res.json()

    assert verify_data["is_confirmed"] is True
    assert verify_data["assignment_status"] == "PAYMENT_CONFIRMED"

    # =========================================================
    # Step 4: B04 - SLA Acceptance
    # =========================================================

    sla_res = await client.get(
        "/api/sla/current"
    )

    assert sla_res.status_code == 200

    sla_data = sla_res.json()

    assert sla_data["version"] == "1.0"
    assert "DPDP Act 2023" in sla_data["dpdp_compliance_terms"]
    assert "48-Hour Notice" in sla_data["notice_periods"]

    # =========================================================
    # Accept SLA
    # =========================================================

    sla_accept_payload = {
        "sla_version_id": sla_data["id"],
        "sponsor_id": sponsor_id,
        "signer_name": "Ramesh Krishnan",
        "signer_relationship": "Son (Primary Sponsor)",
        "confirmed_conduct_terms": True,
        "confirmed_emergency_liability": True,
        "confirmed_dpdp_consent": True,
    }

    accept_res = await client.post(
        f"/api/sla/assignments/{assignment_id}/accept",
        json=sla_accept_payload,
    )

    assert accept_res.status_code == 200

    accept_data = accept_res.json()

    assert accept_data["status"] == "ACCEPTED"
    assert "officially confirmed" in accept_data["message"].lower()

    # =========================================================
    # Final Assignment State
    # =========================================================

    final_res = await client.get(
        f"/api/assignments/{assignment_id}"
    )

    assert final_res.status_code == 200

    final_assign = final_res.json()

    assert final_assign["status"] == "SERVICE_CONFIRMED"

    assert (
        final_assign["caregiver"]["id"]
        == selected_caregiver["id"]
    )
