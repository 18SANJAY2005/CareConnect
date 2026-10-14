from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user

from app.models.user import User
from app.models.elder import Elder
from app.models.caregiver import Caregiver
from app.models.assignment import CareAssignment
from app.models.billing import Invoice, InvoiceLineItem
from app.models.renewal import Renewal
from app.models.audit import AuditLog, Notification
from app.models.shift import CareShift, AttendanceLog

from app.schemas.phase_d import (
    CareAssignmentResponse,
    CaregiverResponse,
)


# ============================================================================
# Router
# ============================================================================

router = APIRouter(
    tags=["Care Assignments & Buffer Pool"],
)


# ============================================================================
# Caregiver response helper
# ============================================================================

def caregiver_response(
    caregiver: Optional[Caregiver],
) -> Optional[CaregiverResponse]:
    """
    Convert the integrated SQLAlchemy Caregiver model into
    the Phase D CaregiverResponse schema.
    """

    if caregiver is None:
        return None

    return CaregiverResponse(
        id=caregiver.id,
        fullName=caregiver.full_name,
        phone=caregiver.phone,
        gender=caregiver.gender,
        rating=caregiver.rating,
        experienceYears=caregiver.experience_years,
        languages=caregiver.languages,
        specializations=caregiver.specializations,
        locality=caregiver.locality,
        isBufferPool=caregiver.isBufferPool,
        status=caregiver.status,
        avatarUrl=caregiver.avatarUrlValue,
        createdAt=caregiver.created_at,
        updatedAt=caregiver.updated_at,
    )


# ============================================================================
# Assignment response helper
# ============================================================================

def assignment_response(
    assignment: CareAssignment,
) -> CareAssignmentResponse:
    """
    Convert the integrated CareAssignment model into
    the Phase D CareAssignmentResponse schema.

    Some older Phase B integration records may have a NULL
    start_date. The Phase D response requires startDate,
    so use created_at as a safe fallback.
    """

    start_date = assignment.start_date

    if start_date is None:
        if assignment.created_at is not None:
            start_date = assignment.created_at
        else:
            start_date = datetime.now(timezone.utc)

    return CareAssignmentResponse(
        id=assignment.id,
        elderId=assignment.elder_id,
        caregiverId=assignment.caregiver_id,
        familyUserId=assignment.sponsor_id,
        shiftType=assignment.shift_type,
        startDate=start_date,
        status=assignment.status,
        notes=assignment.notes,
        monthlyRate=assignment.monthly_rate,
        createdAt=assignment.created_at,
        updatedAt=assignment.updated_at,
        caregiver=caregiver_response(
            assignment.caregiver
        ),
    )


# ============================================================================
# Phase D seed helper
# ============================================================================

async def seed_caregivers_and_assignment_if_needed(
    db: AsyncSession,
    user: User,
    elder_id: Optional[str] = None,
) -> Optional[CareAssignment]:
    """
    Seed Chennai caregiver data and an active assignment when required.

    Also creates:
      - initial invoice
      - invoice line items
      - upcoming renewal
    """

    # ------------------------------------------------------------------------
    # 1. Seed caregivers if none exist
    # ------------------------------------------------------------------------

    caregiver_result = await db.execute(
        select(Caregiver)
    )

    caregivers = caregiver_result.scalars().all()

    if not caregivers:

        cg1 = Caregiver(
            full_name="Meenakshi Sundaram",
            headline="Experienced Elder Care Attendant",
            phone="+919840112233",
            gender="FEMALE",
            rating=4.9,
            experience_years=6,
            languages="Tamil, English",
            specializations=(
                "Post-Stroke Recovery, Mobility Assistance, "
                "Vitals Monitoring"
            ),
            locality="Adyar, Chennai",
            isBufferPool=False,
            status="ON_DUTY",
            avatarUrl=(
                "https://images.unsplash.com/"
                "photo-1576765608535-5f04d1e3f289?w=150"
            ),
        )

        cg2 = Caregiver(
            full_name="Kavitha Raman",
            headline="Specialized Dementia & Palliative Care Attendant",
            phone="+919840223344",
            gender="FEMALE",
            rating=4.8,
            experience_years=4,
            languages="Tamil, Telugu, English",
            specializations=(
                "Dementia Care, Palliative Care, "
                "Bedridden Hygiene"
            ),
            locality="Besant Nagar, Chennai",
            isBufferPool=True,
            status="AVAILABLE",
            avatarUrl=(
                "https://images.unsplash.com/"
                "photo-1594824813687-849a62237078?w=150"
            ),
        )

        cg3 = Caregiver(
            full_name="Anand Kumar",
            headline="Physiotherapy & Post-Surgery Care Attendant",
            phone="+919840334455",
            gender="MALE",
            rating=4.7,
            experience_years=5,
            languages="Tamil, Hindi",
            specializations=(
                "Physiotherapy Support, Post-Surgery Care"
            ),
            locality="T. Nagar, Chennai",
            isBufferPool=True,
            status="AVAILABLE",
            avatarUrl=(
                "https://images.unsplash.com/"
                "photo-1622253692010-333f2da6031d?w=150"
            ),
        )

        db.add_all(
            [
                cg1,
                cg2,
                cg3,
            ]
        )

        await db.commit()

        await db.refresh(cg1)
        await db.refresh(cg2)
        await db.refresh(cg3)

        primary_cg = cg1

    else:
        primary_cg = caregivers[0]

    # ------------------------------------------------------------------------
    # 2. Find user's elder
    # ------------------------------------------------------------------------

    if not elder_id:

        elder_result = await db.execute(
            select(Elder).where(
                Elder.familyId == user.id
            )
        )

        elder = elder_result.scalars().first()

        if not elder:
            return None

        elder_id = elder.id

    # ------------------------------------------------------------------------
    # 3. Find existing ACTIVE assignment
    # ------------------------------------------------------------------------

    assignment_result = await db.execute(
        select(CareAssignment)
        .options(
            selectinload(
                CareAssignment.caregiver
            )
        )
        .where(
            CareAssignment.elder_id == elder_id,
            CareAssignment.status == "ACTIVE",
        )
    )

    assignment = assignment_result.scalars().first()

    # ------------------------------------------------------------------------
    # 4. Create active assignment if missing
    # ------------------------------------------------------------------------

    if not assignment:

        start_date = (
            datetime.now(timezone.utc)
            - timedelta(days=20)
        )

        assignment = CareAssignment(
            elder_id=elder_id,
            caregiver_id=primary_cg.id,
            sponsor_id=user.id,
            shift_type="EIGHT_HOUR_DAY",
            start_date=start_date.isoformat(),
            status="ACTIVE",
            monthly_rate=22000.0,
        )

        db.add(assignment)

        await db.commit()
        await db.refresh(assignment)

    # ------------------------------------------------------------------------
    # 5. Seed invoice if missing
    # ------------------------------------------------------------------------

    invoice_result = await db.execute(
        select(Invoice).where(
            Invoice.assignmentId == assignment.id
        )
    )

    invoice = invoice_result.scalars().first()

    if not invoice:

        if assignment.start_date:

            try:
                start_date = datetime.fromisoformat(
                    assignment.start_date.replace(
                        "Z",
                        "+00:00",
                    )
                )

            except (
                ValueError,
                TypeError,
            ):
                start_date = (
                    datetime.now(timezone.utc)
                    - timedelta(days=20)
                )

        else:

            start_date = (
                datetime.now(timezone.utc)
                - timedelta(days=20)
            )

        end_date = start_date + timedelta(days=30)
        due_date = start_date + timedelta(days=7)

        invoice = Invoice(
            invoiceNumber=(
                "INV-2026-CH-"
                f"{str(assignment.id)[:6].upper()}"
            ),
            familyUserId=user.id,
            elderId=elder_id,
            assignmentId=assignment.id,
            billingPeriodStart=start_date,
            billingPeriodEnd=end_date,
            subtotal=22000.0,
            agencyFee=3300.0,
            addonsAmount=0.0,
            taxAmount=4554.0,
            discountAmount=0.0,
            totalAmount=29854.0,
            currency="INR",
            dueDate=due_date,
            status="ISSUED",
        )

        db.add(invoice)

        await db.flush()

        line1 = InvoiceLineItem(
            invoiceId=invoice.id,
            itemType="BASE_CAREGIVER",
            description=(
                "Elder Care Attendant Service "
                "(8-Hr Day Shift) - Chennai"
            ),
            quantity=1,
            unitAmount=22000.0,
            amount=22000.0,
        )

        line2 = InvoiceLineItem(
            invoiceId=invoice.id,
            itemType="AGENCY_FEE",
            description=(
                "CareConnect Agency Management & "
                "Clinical Supervision Fee (15%)"
            ),
            quantity=1,
            unitAmount=3300.0,
            amount=3300.0,
        )

        line3 = InvoiceLineItem(
            invoiceId=invoice.id,
            itemType="TAX",
            description=(
                "Goods & Services Tax (GST 18%)"
            ),
            quantity=1,
            unitAmount=4554.0,
            amount=4554.0,
        )

        db.add_all(
            [
                line1,
                line2,
                line3,
            ]
        )

        await db.commit()

    # ------------------------------------------------------------------------
    # 6. Seed renewal if missing
    # ------------------------------------------------------------------------

    renewal_result = await db.execute(
        select(Renewal).where(
            Renewal.assignmentId == assignment.id
        )
    )

    renewal = renewal_result.scalars().first()

    if not renewal:

        if assignment.start_date:

            try:
                start_date = datetime.fromisoformat(
                    assignment.start_date.replace(
                        "Z",
                        "+00:00",
                    )
                )

            except (
                ValueError,
                TypeError,
            ):
                start_date = (
                    datetime.now(timezone.utc)
                    - timedelta(days=20)
                )

        else:

            start_date = (
                datetime.now(timezone.utc)
                - timedelta(days=20)
            )

        end_date = start_date + timedelta(days=30)

        renewal = Renewal(
            familyUserId=user.id,
            elderId=elder_id,
            assignmentId=assignment.id,
            currentPeriodEnd=end_date,
            requestedPeriodStart=end_date,
            requestedPeriodEnd=(
                end_date + timedelta(days=30)
            ),
            amount=29854.0,
            currency="INR",
            status="PENDING",
            autoDebitEnabled=False,
            mandateStatus="NOT_CONFIGURED",
        )

        db.add(renewal)

        await db.commit()

    # ------------------------------------------------------------------------
    # 7. Reload assignment with caregiver
    # ------------------------------------------------------------------------

    refreshed_result = await db.execute(
        select(CareAssignment)
        .options(
            selectinload(
                CareAssignment.caregiver
            )
        )
        .where(
            CareAssignment.id == assignment.id
        )
    )

    return refreshed_result.scalar_one_or_none()


# ============================================================================
# PHASE B - CREATE CARE ASSIGNMENT
# POST /api/assignments
# ============================================================================

@router.post(
    "/assignments",
    response_model=CareAssignmentResponse,
)
async def create_care_assignment(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Phase B caregiver selection endpoint.

    Creates a CareAssignment with the initial state:

        CAREGIVER_SELECTED

    This state is subsequently updated by:
        - payment confirmation
        - SLA acceptance
        - other Phase B lifecycle operations.
    """

    elder_id = payload.get("elder_id")
    caregiver_id = payload.get("caregiver_id")
    sponsor_id = payload.get("sponsor_id")

    if not elder_id:
        raise HTTPException(
            status_code=400,
            detail="elder_id is required",
        )

    if caregiver_id is None:
        raise HTTPException(
            status_code=400,
            detail="caregiver_id is required",
        )

    if not sponsor_id:
        raise HTTPException(
            status_code=400,
            detail="sponsor_id is required",
        )

    # ------------------------------------------------------------------------
    # Validate elder
    # ------------------------------------------------------------------------

    elder_result = await db.execute(
        select(Elder).where(
            Elder.id == elder_id
        )
    )

    elder = elder_result.scalar_one_or_none()

    if not elder:
        raise HTTPException(
            status_code=404,
            detail="Elder not found",
        )

    # ------------------------------------------------------------------------
    # Validate sponsor
    # ------------------------------------------------------------------------

    sponsor_result = await db.execute(
        select(User).where(
            User.id == sponsor_id
        )
    )

    sponsor = sponsor_result.scalar_one_or_none()

    if not sponsor:
        raise HTTPException(
            status_code=404,
            detail="Sponsor not found",
        )

    # ------------------------------------------------------------------------
    # Validate caregiver
    # ------------------------------------------------------------------------

    caregiver_result = await db.execute(
        select(Caregiver).where(
            Caregiver.id == caregiver_id
        )
    )

    caregiver = caregiver_result.scalar_one_or_none()

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Caregiver not found",
        )

    # ------------------------------------------------------------------------
    # Revalidate caregiver eligibility, verification, and schedule availability
    # ------------------------------------------------------------------------
    if not caregiver.is_active:
        raise HTTPException(
            status_code=400,
            detail=f"Caregiver {caregiver.full_name} is inactive and cannot be assigned.",
        )

    if not caregiver.is_identity_verified and not caregiver.is_clinical_certified:
        raise HTTPException(
            status_code=400,
            detail=f"Caregiver {caregiver.full_name} has not completed mandatory identity verification.",
        )

    # Check for conflicting active assignment
    conflict_res = await db.execute(
        select(CareAssignment).where(
            CareAssignment.caregiver_id == caregiver_id,
            CareAssignment.status.in_(["ACTIVE", "SERVICE_CONFIRMED"]),
            CareAssignment.elder_id != elder_id,
        )
    )
    if conflict_res.scalars().first():
        raise HTTPException(
            status_code=409,
            detail=f"Caregiver {caregiver.full_name} already has an active overlapping care assignment.",
        )

    # ------------------------------------------------------------------------
    # Create CareAssignment (supports WAITING_CONFIRMATION, PENDING, or CAREGIVER_SELECTED)
    # ------------------------------------------------------------------------
    initial_status = payload.get("status") or "CAREGIVER_SELECTED"

    assignment = CareAssignment(
        elder_id=elder_id,
        caregiver_id=caregiver_id,
        sponsor_id=sponsor_id,
        shift_type=(
            payload.get("shift_type")
            or "Day 10-Hour"
        ),
        start_date=payload.get("start_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        status=initial_status,
        notes=payload.get("notes"),
        monthly_rate=float(payload.get("monthly_rate") or (caregiver.daily_rate * 26) or 22000.0),
    )

    db.add(assignment)
    await db.flush()

    # ------------------------------------------------------------------------
    # Dispatch notification to CareSeeker / Sponsor (prevent duplicate notifications)
    # ------------------------------------------------------------------------
    notif_res = await db.execute(
        select(Notification).where(
            Notification.recipientUserId == sponsor_id,
            Notification.eventType == "ASSIGNMENT_SCHEDULED",
            Notification.referenceId == str(assignment.id),
        )
    )
    if not notif_res.scalars().first():
        sched_time = assignment.start_date or "the requested start date"
        db.add(
            Notification(
                recipientUserId=sponsor_id,
                eventType="ASSIGNMENT_SCHEDULED",
                referenceType="ASSIGNMENT",
                referenceId=str(assignment.id),
                title="Caregiver Assignment Requested",
                message=(
                    f"Caregiver assignment with {caregiver.full_name} for {elder.name} is scheduled for {sched_time}. "
                    "Status: Pending — Waiting for caregiver confirmation."
                ),
            )
        )

    # Record Audit Log
    db.add(
        AuditLog(
            actorUserId=sponsor_id,
            entityType="ASSIGNMENT",
            entityId=str(assignment.id),
            action="CREATED",
            oldValue=None,
            newValue=initial_status,
            auditMetadata={
                "elderId": elder_id,
                "caregiverId": caregiver_id,
                "caregiverName": caregiver.full_name,
                "shiftType": assignment.shift_type,
            },
        )
    )

    await db.commit()
    await db.refresh(assignment)

    # ------------------------------------------------------------------------
    # Reload caregiver relationship
    # ------------------------------------------------------------------------
    result = await db.execute(
        select(CareAssignment)
        .options(
            selectinload(
                CareAssignment.caregiver
            )
        )
        .where(
            CareAssignment.id == assignment.id
        )
    )

    refreshed_assignment = result.scalar_one()

    return assignment_response(
        refreshed_assignment
    )


# ============================================================================
# ASSIGNMENT STATUS LIFECYCLE (Confirm, Reject, Cancel)
# ============================================================================

@router.post("/assignments/{assignment_id}/confirm", response_model=CareAssignmentResponse)
async def confirm_care_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Caregiver or coordinator confirms assignment.
    Transitions from WAITING_CONFIRMATION / PENDING to SERVICE_CONFIRMED.
    Revalidates caregiver eligibility before confirming.
    """
    result = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Care assignment not found.")

    caregiver = assignment.caregiver
    if not caregiver or not caregiver.is_active:
        raise HTTPException(status_code=400, detail="Assigned caregiver is not active.")

    old_status = assignment.status
    assignment.status = "SERVICE_CONFIRMED"

    # Send confirmation notification (prevent duplicates)
    notif_res = await db.execute(
        select(Notification).where(
            Notification.recipientUserId == assignment.sponsor_id,
            Notification.eventType == "ASSIGNMENT_CONFIRMED",
            Notification.referenceId == str(assignment.id),
        )
    )
    if not notif_res.scalars().first():
        db.add(
            Notification(
                recipientUserId=assignment.sponsor_id,
                eventType="ASSIGNMENT_CONFIRMED",
                referenceType="ASSIGNMENT",
                referenceId=str(assignment.id),
                title="Caregiver Confirmed",
                message=(
                    f"Good news! {caregiver.full_name} has accepted the care assignment starting {assignment.start_date}. "
                    "Your care coordinator will oversee onboarding."
                ),
            )
        )

    # Audit log
    db.add(
        AuditLog(
            actorUserId=str(caregiver.id),
            entityType="ASSIGNMENT",
            entityId=str(assignment.id),
            action="STATUS_CHANGED",
            oldValue=old_status,
            newValue="SERVICE_CONFIRMED",
        )
    )

    await db.commit()
    await db.refresh(assignment)
    return assignment_response(assignment)


@router.post("/assignments/{assignment_id}/reject", response_model=CareAssignmentResponse)
async def reject_care_assignment(
    assignment_id: int,
    payload: dict = {},
    db: AsyncSession = Depends(get_db),
):
    """Caregiver or coordinator rejects assignment."""
    result = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Care assignment not found.")

    old_status = assignment.status
    assignment.status = "REJECTED"
    if payload.get("reason"):
        assignment.notes = f"{assignment.notes or ''} [Rejection reason: {payload['reason']}]"

    db.add(
        AuditLog(
            actorUserId=assignment.sponsor_id,
            entityType="ASSIGNMENT",
            entityId=str(assignment.id),
            action="STATUS_CHANGED",
            oldValue=old_status,
            newValue="REJECTED",
        )
    )

    await db.commit()
    await db.refresh(assignment)
    return assignment_response(assignment)


@router.post("/assignments/{assignment_id}/cancel", response_model=CareAssignmentResponse)
async def cancel_care_assignment(
    assignment_id: int,
    payload: dict = {},
    db: AsyncSession = Depends(get_db),
):
    """Cancel assignment (by family sponsor or admin)."""
    result = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Care assignment not found.")

    old_status = assignment.status
    assignment.status = "CANCELLED"
    if payload.get("reason"):
        assignment.notes = f"{assignment.notes or ''} [Cancellation reason: {payload['reason']}]"

    db.add(
        AuditLog(
            actorUserId=assignment.sponsor_id,
            entityType="ASSIGNMENT",
            entityId=str(assignment.id),
            action="STATUS_CHANGED",
            oldValue=old_status,
            newValue="CANCELLED",
        )
    )

    await db.commit()
    await db.refresh(assignment)
    return assignment_response(assignment)


# ============================================================================
# ASSIGNMENT HISTORY PER ELDER
# ============================================================================

@router.get("/assignments/elder/{elder_id}/history")
async def get_elder_assignment_history(
    elder_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Maintain assignment history per elder, including caregiver, scheduled dates,
    assignment status, and available completed-task details.
    Historical records remain accessible after completion.
    """
    res = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.elder_id == elder_id)
        .order_by(CareAssignment.created_at.desc())
    )
    assignments = res.scalars().all()

    # Query completed shifts and attendance details for this elder
    shifts_res = await db.execute(
        select(CareShift).where(CareShift.elderId == elder_id)
    )
    shifts = shifts_res.scalars().all()

    completed_shifts_summary = [
        {
            "shiftId": s.id,
            "status": s.status,
            "shiftType": s.shiftType,
            "scheduledStart": s.scheduledStart.isoformat() if s.scheduledStart else None,
            "scheduledEnd": s.scheduledEnd.isoformat() if s.scheduledEnd else None,
            "supervisorNotes": s.supervisorNotes,
        }
        for s in shifts
        if s.status in ["COMPLETED", "CHECKED_OUT"]
    ]

    history = []
    for asg in assignments:
        cg = asg.caregiver
        history.append({
            "id": asg.id,
            "elderId": asg.elder_id,
            "caregiverId": asg.caregiver_id,
            "caregiver": {
                "id": cg.id if cg else asg.caregiver_id,
                "fullName": cg.full_name if cg else "Caregiver",
                "phone": cg.phone if cg else None,
                "gender": cg.gender if cg else None,
                "rating": cg.rating if cg else 4.8,
                "specializations": cg.specializations if cg else None,
                "qualifications": getattr(cg, "qualifications", None) if cg else None,
                "locality": cg.locality if cg else None,
            } if cg else None,
            "shiftType": asg.shift_type,
            "startDate": asg.start_date or (asg.created_at.isoformat() if asg.created_at else None),
            "status": asg.status,
            "statusLabel": (
                "Pending — Waiting for caregiver confirmation"
                if asg.status in ["WAITING_CONFIRMATION", "PENDING"]
                else asg.status
            ),
            "monthlyRate": asg.monthly_rate,
            "notes": asg.notes,
            "createdAt": asg.created_at.isoformat() if asg.created_at else None,
            "completedTasksCount": len(completed_shifts_summary),
            "completedShifts": completed_shifts_summary,
        })

    return history


# ============================================================================
# PHASE D - GET ACTIVE ASSIGNMENT
#
# IMPORTANT:
# This route MUST appear BEFORE /assignments/{assignment_id}.
#
# Otherwise FastAPI interprets "active" as an integer assignment_id
# and returns HTTP 422.
# ============================================================================

@router.get(
    "/assignments/active",
    response_model=Optional[CareAssignmentResponse],
)
async def get_active_assignment(
    elderId: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the active caregiver assignment for the family's elder.

    Returns one assignment object, not a list.
    """

    assignment = (
        await seed_caregivers_and_assignment_if_needed(
            db,
            current_user,
            elderId,
        )
    )

    if not assignment:
        return None

    result = await db.execute(
        select(CareAssignment)
        .options(
            selectinload(
                CareAssignment.caregiver
            )
        )
        .where(
            CareAssignment.id == assignment.id
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        return None

    return assignment_response(
        assignment
    )


# ============================================================================
# PHASE D - GET BUFFER POOL
# GET /api/caregivers/buffer-pool
# ============================================================================

@router.get(
    "/caregivers/buffer-pool",
    response_model=List[CaregiverResponse],
)
async def get_buffer_pool_caregivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve available substitute caregivers
    in the Chennai buffer pool.
    """

    result = await db.execute(
        select(Caregiver).where(
            Caregiver.isBufferPool == True,
            Caregiver.status == "AVAILABLE",
        )
    )

    caregivers = result.scalars().all()

    return [
        caregiver_response(caregiver)
        for caregiver in caregivers
    ]


# ============================================================================
# PHASE B - GET CARE ASSIGNMENT
#
# IMPORTANT:
# Keep this parameterized route AFTER /assignments/active.
# ============================================================================

@router.get(
    "/assignments/{assignment_id}",
    response_model=CareAssignmentResponse,
)
async def get_care_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a single care assignment by ID.
    """

    result = await db.execute(
        select(CareAssignment)
        .options(
            selectinload(
                CareAssignment.caregiver
            )
        )
        .where(
            CareAssignment.id == assignment_id
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Care assignment not found",
        )

    return assignment_response(
        assignment
    )