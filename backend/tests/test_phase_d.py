import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.elder import Elder
from app.models.caregiver import Caregiver, CareAssignment
from app.models.replacement import ReplacementRequest
from app.models.feedback import OperationsIssue
from app.models.billing import Invoice
from app.models.renewal import Renewal
from app.core.security import create_access_token

@pytest.fixture
async def elder_with_assignment(test_db: AsyncSession, sponsor_user: User):
    """Fixture creating an elder and an active care assignment."""
    elder = Elder(
        familyId=sponsor_user.id,
        name="Kalyani Ammal",
        age=74,
        gender="FEMALE",
        mobilityLevel="CANE_WALKER",
        primaryLanguage="Tamil",
        shiftPreference="EIGHT_HOUR_DAY",
        personaStatus="SAVED"
    )
    test_db.add(elder)
    await test_db.flush()

    cg_primary = Caregiver(
        fullName="Meenakshi Sundaram",
        phone="+919840112233",
        gender="FEMALE",
        rating=4.9,
        experienceYears=6,
        languages=["Tamil", "English"],
        specializations=["Post-Stroke Recovery", "Mobility Assistance"],
        locality="Adyar, Chennai",
        isBufferPool=False,
        status="ON_DUTY"
    )
    cg_sub = Caregiver(
        fullName="Kavitha Raman",
        phone="+919840223344",
        gender="FEMALE",
        rating=4.8,
        experienceYears=4,
        languages=["Tamil", "Telugu"],
        specializations=["Dementia Care", "Palliative Care"],
        locality="Besant Nagar, Chennai",
        isBufferPool=True,
        status="AVAILABLE"
    )
    test_db.add_all([cg_primary, cg_sub])
    await test_db.flush()

    assignment = CareAssignment(
        elderId=elder.id,
        caregiverId=cg_primary.id,
        familyUserId=sponsor_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="ACTIVE",
        monthlyRate=22000.0
    )
    test_db.add(assignment)
    await test_db.commit()
    await test_db.refresh(elder)
    await test_db.refresh(assignment)
    return {"elder": elder, "assignment": assignment, "primary_cg": cg_primary, "sub_cg": cg_sub}


@pytest.fixture
async def ops_auth_headers(test_db: AsyncSession) -> dict:
    """Auth headers for an Operations / Care Manager user."""
    ops_user = User(
        fullName="Chennai Ops Manager",
        phone="+919999900001",
        email="ops.chennai@careconnect.in",
        role="OPS_MANAGER",
        authProvider="PHONE_OTP"
    )
    test_db.add(ops_user)
    await test_db.commit()
    await test_db.refresh(ops_user)
    token = create_access_token({"sub": ops_user.id, "role": ops_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_active_assignment_and_seeding(client: AsyncClient, auth_headers: dict, test_db: AsyncSession, sponsor_user: User):
    """Test retrieving active care assignment and auto-seeding."""
    elder = Elder(
        familyId=sponsor_user.id,
        name="Lakshmi Narayanan",
        age=80,
        gender="MALE",
        personaStatus="SAVED"
    )
    test_db.add(elder)
    await test_db.commit()

    resp = await client.get("/api/assignments/active", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data is not None
    assert data["status"] == "ACTIVE"
    assert data["monthlyRate"] == 22000.0
    assert data["caregiver"] is not None
    assert "Tamil" in data["caregiver"]["languages"]


@pytest.mark.asyncio
async def test_d01_create_replacement_and_duplicate_prevention(client: AsyncClient, auth_headers: dict, elder_with_assignment: dict):
    """Test D01: Replacement request creation and duplicate open request prevention."""
    assignment_id = elder_with_assignment["assignment"].id

    # 1. Create request
    payload = {
        "assignmentId": assignment_id,
        "reasonCode": "LANGUAGE_OR_CULTURE",
        "notes": "Elder is more comfortable with a native Tamil speaker from South Chennai.",
        "priority": "HIGH"
    }
    resp = await client.post("/api/replacement-requests", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    created = resp.json()
    assert created["reasonCode"] == "LANGUAGE_OR_CULTURE"
    assert created["status"] == "SUBMITTED"
    assert created["priority"] == "HIGH"
    assert len(created["history"]) == 1
    assert created["history"][0]["newStatus"] == "SUBMITTED"

    # 2. Duplicate open request must return 409 Conflict
    dup_resp = await client.post("/api/replacement-requests", json=payload, headers=auth_headers)
    assert dup_resp.status_code == 409
    assert "Duplicate requests are prevented" in dup_resp.json()["detail"]


@pytest.mark.asyncio
async def test_d01_operations_triage_and_substitute_assignment(
    client: AsyncClient,
    auth_headers: dict,
    ops_auth_headers: dict,
    elder_with_assignment: dict
):
    """Test D01: Operations reviews request, assigns substitute caregiver, and family confirms."""
    assignment_id = elder_with_assignment["assignment"].id
    sub_cg = elder_with_assignment["sub_cg"]

    # 1. Family creates request
    req_resp = await client.post("/api/replacement-requests", json={
        "assignmentId": assignment_id,
        "reasonCode": "PERFORMANCE",
        "notes": "Punctuality concern during morning routine."
    }, headers=auth_headers)
    assert req_resp.status_code == 201
    req_id = req_resp.json()["id"]

    # 2. Operations views queue
    q_resp = await client.get("/api/operations/replacement-queue?status=SUBMITTED", headers=ops_auth_headers)
    assert q_resp.status_code == 200
    assert any(r["id"] == req_id for r in q_resp.json())

    # 3. Operations moves to UNDER_REVIEW
    patch_resp = await client.patch(f"/api/operations/replacement-requests/{req_id}", json={
        "status": "UNDER_REVIEW",
        "note": "Care Manager contacting family to review schedule mismatch."
    }, headers=ops_auth_headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "UNDER_REVIEW"

    # 4. Operations assigns substitute from buffer pool
    assign_resp = await client.post(f"/api/operations/replacement-requests/{req_id}/assign", json={
        "substituteCaregiverId": sub_cg.id,
        "note": f"Substitute caregiver {sub_cg.fullName} assigned from Besant Nagar hub."
    }, headers=ops_auth_headers)
    assert assign_resp.status_code == 200
    assert assign_resp.json()["status"] == "ASSIGNED"
    assert assign_resp.json()["substituteCaregiverId"] == sub_cg.id

    # 5. Family confirms substitute
    confirm_resp = await client.post(f"/api/replacement-requests/{req_id}/confirm-replacement", headers=auth_headers)
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "RESOLVED"

    # Verify assignment now reflects new caregiver
    asg_resp = await client.get("/api/assignments/active", headers=auth_headers)
    assert asg_resp.status_code == 200
    assert asg_resp.json()["caregiverId"] == sub_cg.id


@pytest.mark.asyncio
async def test_d02_feedback_and_auto_issue_escalation(client: AsyncClient, auth_headers: dict, ops_auth_headers: dict, elder_with_assignment: dict):
    """Test D02: Positive feedback and low-rating auto-escalation to OperationsIssue."""
    assignment_id = elder_with_assignment["assignment"].id

    # 1. Submit positive 5-star feedback
    pos_resp = await client.post("/api/feedback", json={
        "assignmentId": assignment_id,
        "caregiverRating": 5,
        "serviceRating": 5,
        "tags": ["Punctuality", "Care Quality", "Communication"],
        "comment": "Exceptional care and compassion shown towards mother."
    }, headers=auth_headers)
    assert pos_resp.status_code == 201
    assert pos_resp.json()["caregiverRating"] == 5

    # 2. Submit low 1-star feedback -> must auto-escalate
    neg_resp = await client.post("/api/feedback", json={
        "assignmentId": assignment_id,
        "caregiverRating": 1,
        "serviceRating": 2,
        "tags": ["Reliability"],
        "comment": "Arrived very late without prior notice.",
        "seniorFeedback": "Mother was anxious waiting for medication assistance."
    }, headers=auth_headers)
    assert neg_resp.status_code == 201

    # 3. Verify Operations feedback queue contains the escalated issue
    issues_resp = await client.get("/api/operations/feedback-queue?status=OPEN", headers=ops_auth_headers)
    assert issues_resp.status_code == 200
    issues = issues_resp.json()
    assert len(issues) >= 1
    assert any("Quality Alert" in i["summary"] for i in issues)

    # 4. Resolve the issue
    issue_id = issues[0]["id"]
    resolve_resp = await client.patch(f"/api/operations/issues/{issue_id}", json={
        "status": "RESOLVED",
        "resolutionNotes": "Clinical Care Manager spoke to attendant and readjusted transport transit buffer."
    }, headers=ops_auth_headers)
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "RESOLVED"


@pytest.mark.asyncio
async def test_d03_billing_and_payment_flow(client: AsyncClient, auth_headers: dict, test_db: AsyncSession, sponsor_user: User, elder_with_assignment: dict):
    """Test D03: Monthly invoicing math, line items, and payment confirmation."""
    # Ensure initial invoice seeded via active assignment endpoint
    await client.get("/api/assignments/active", headers=auth_headers)

    inv_list_resp = await client.get("/api/invoices", headers=auth_headers)
    assert inv_list_resp.status_code == 200
    invoices = inv_list_resp.json()
    assert len(invoices) >= 1
    inv = invoices[0]
    inv_id = inv["id"]

    # Verify trusted server calculations
    assert inv["subtotal"] == 22000.0
    assert inv["agencyFee"] == 3300.0
    assert inv["taxAmount"] == 4554.0
    assert inv["totalAmount"] == 29854.0
    assert inv["status"] == "ISSUED"
    assert len(inv["lineItems"]) == 3

    # Initiate payment
    pay_intent = await client.post(f"/api/invoices/{inv_id}/pay", headers=auth_headers)
    assert pay_intent.status_code == 200
    intent_data = pay_intent.json()
    assert intent_data["amount"] == 29854.0
    assert intent_data["orderId"].startswith("order_chennai_")

    # Confirm payment
    confirm_pay = await client.post(f"/api/invoices/{inv_id}/confirm-payment", json={
        "razorpayPaymentId": "pay_chennai_test_123456",
        "razorpayOrderId": intent_data["orderId"],
        "razorpaySignature": "sig_verified_mock_checksum"
    }, headers=auth_headers)
    assert confirm_pay.status_code == 200
    assert confirm_pay.json()["status"] == "PAID"
    assert len(confirm_pay.json()["transactions"]) == 1
    assert confirm_pay.json()["transactions"][0]["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_d04_renewals_and_auto_debit(client: AsyncClient, auth_headers: dict, elder_with_assignment: dict):
    """Test D04: Renewal inquiry, auto-debit mandate toggle, and renewal confirmation."""
    # Ensure renewal seeded via active assignment
    await client.get("/api/assignments/active", headers=auth_headers)

    # 1. Get upcoming renewal
    ren_resp = await client.get("/api/renewals/upcoming", headers=auth_headers)
    assert ren_resp.status_code == 200
    ren_data = ren_resp.json()
    assert ren_data is not None
    assert ren_data["amount"] == 29854.0
    assert ren_data["status"] == "PENDING"
    assert ren_data["autoDebitEnabled"] is False

    # 2. Toggle recurring mandate
    mandate_resp = await client.post("/api/renewals/mandate", json={"enable": True}, headers=auth_headers)
    assert mandate_resp.status_code == 200
    assert mandate_resp.json()["autoDebitEnabled"] is True
    assert mandate_resp.json()["mandateStatus"] == "ACTIVE"

    # 3. Confirm renewal
    confirm_resp = await client.post("/api/renewals/confirm", json={"notes": "Continuing standard 8-hr care plan."}, headers=auth_headers)
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "CONFIRMED"


@pytest.mark.asyncio
async def test_audit_and_notifications(client: AsyncClient, auth_headers: dict, ops_auth_headers: dict, elder_with_assignment: dict):
    """Test notification retrieval, mark-as-read, and operations audit trail."""
    # Trigger an action that creates notifications and audit logs
    assignment_id = elder_with_assignment["assignment"].id
    await client.post("/api/replacement-requests", json={
        "assignmentId": assignment_id,
        "reasonCode": "ILLNESS",
        "notes": "Attendant has viral fever."
    }, headers=auth_headers)

    # Check family notifications
    notif_resp = await client.get("/api/notifications", headers=auth_headers)
    assert notif_resp.status_code == 200
    notifs = notif_resp.json()
    assert len(notifs) >= 1
    first_notif = notifs[0]
    assert first_notif["readAt"] is None

    # Mark as read
    read_resp = await client.patch(f"/api/notifications/{first_notif['id']}/read", headers=auth_headers)
    assert read_resp.status_code == 200
    assert read_resp.json()["readAt"] is not None

    # Check Operations audit trail
    audit_resp = await client.get("/api/operations/audit", headers=ops_auth_headers)
    assert audit_resp.status_code == 200
    audit_logs = audit_resp.json()
    assert len(audit_logs) >= 1
    assert any(l["entityType"] == "REPLACEMENT_REQUEST" for l in audit_logs)

