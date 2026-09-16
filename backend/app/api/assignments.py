from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.elder import Elder
from app.models.caregiver import Caregiver, CareAssignment
from app.models.billing import Invoice, InvoiceLineItem
from app.models.renewal import Renewal
from app.schemas.phase_d import CareAssignmentResponse, CaregiverResponse

router = APIRouter(tags=["Care Assignments & Buffer Pool"])

# Seed data helper for Caregivers and Active Assignment in Chennai
async def seed_caregivers_and_assignment_if_needed(db: AsyncSession, user: User, elder_id: Optional[str] = None) -> Optional[CareAssignment]:
    # Check if caregivers exist, if not seed
    res = await db.execute(select(Caregiver))
    caregivers = res.scalars().all()
    if not caregivers:
        cg1 = Caregiver(
            fullName="Meenakshi Sundaram",
            phone="+919840112233",
            gender="FEMALE",
            rating=4.9,
            experienceYears=6,
            languages=["Tamil", "English"],
            specializations=["Post-Stroke Recovery", "Mobility Assistance", "Vitals Monitoring"],
            locality="Adyar, Chennai",
            isBufferPool=False,
            status="ON_DUTY",
            avatarUrl="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=150"
        )
        cg2 = Caregiver(
            fullName="Kavitha Raman",
            phone="+919840223344",
            gender="FEMALE",
            rating=4.8,
            experienceYears=4,
            languages=["Tamil", "Telugu", "English"],
            specializations=["Dementia Care", "Palliative Care", "Bedridden Hygiene"],
            locality="Besant Nagar, Chennai",
            isBufferPool=True,
            status="AVAILABLE",
            avatarUrl="https://images.unsplash.com/photo-1594824813687-849a62237078?w=150"
        )
        cg3 = Caregiver(
            fullName="Anand Kumar",
            phone="+919840334455",
            gender="MALE",
            rating=4.7,
            experienceYears=5,
            languages=["Tamil", "Hindi"],
            specializations=["Physiotherapy Support", "Post-Surgery Care"],
            locality="T. Nagar, Chennai",
            isBufferPool=True,
            status="AVAILABLE",
            avatarUrl="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150"
        )
        db.add_all([cg1, cg2, cg3])
        await db.commit()
        await db.refresh(cg1)
        primary_cg = cg1
    else:
        primary_cg = caregivers[0]

    # Find the user's elder
    if not elder_id:
        elder_res = await db.execute(select(Elder).where(Elder.familyId == user.id))
        elder = elder_res.scalars().first()
        if not elder:
            return None
        elder_id = elder.id

    # Check if active assignment exists
    asg_res = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.elderId == elder_id, CareAssignment.status == "ACTIVE")
    )
    assignment = asg_res.scalars().first()
    if not assignment:
        assignment = CareAssignment(
            elderId=elder_id,
            caregiverId=primary_cg.id,
            familyUserId=user.id,
            shiftType="EIGHT_HOUR_DAY",
            startDate=datetime.now(timezone.utc) - timedelta(days=20),
            status="ACTIVE",
            monthlyRate=22000.0
        )
        db.add(assignment)
        await db.commit()
        await db.refresh(assignment)

    # Check and seed initial invoice for this assignment if missing
    inv_check = await db.execute(select(Invoice).where(Invoice.assignmentId == assignment.id))
    if not inv_check.scalars().first():
        start_date = assignment.startDate
        end_date = start_date + timedelta(days=30)
        due_date = start_date + timedelta(days=7)
        invoice = Invoice(
            invoiceNumber=f"INV-2026-CH-{assignment.id[:6].upper()}",
            familyUserId=user.id,
            elderId=elder_id,
            assignmentId=assignment.id,
            billingPeriodStart=start_date,
            billingPeriodEnd=end_date,
            subtotal=22000.0,
            agencyFee=3300.0,
            addonsAmount=0.0,
            taxAmount=4554.0,  # 18% GST
            discountAmount=0.0,
            totalAmount=29854.0,
            currency="INR",
            dueDate=due_date,
            status="ISSUED"
        )
        db.add(invoice)
        await db.flush()

        line1 = InvoiceLineItem(
            invoiceId=invoice.id,
            itemType="BASE_CAREGIVER",
            description="Elder Care Attendant Service (8-Hr Day Shift) - Chennai",
            quantity=1,
            unitAmount=22000.0,
            amount=22000.0
        )
        line2 = InvoiceLineItem(
            invoiceId=invoice.id,
            itemType="AGENCY_FEE",
            description="CareConnect Agency Management & Clinical Supervision Fee (15%)",
            quantity=1,
            unitAmount=3300.0,
            amount=3300.0
        )
        line3 = InvoiceLineItem(
            invoiceId=invoice.id,
            itemType="TAX",
            description="Goods & Services Tax (GST 18%)",
            quantity=1,
            unitAmount=4554.0,
            amount=4554.0
        )
        db.add_all([line1, line2, line3])
        await db.commit()

    # Check and seed upcoming renewal if missing
    ren_check = await db.execute(select(Renewal).where(Renewal.assignmentId == assignment.id))
    if not ren_check.scalars().first():
        start_date = assignment.startDate
        end_date = start_date + timedelta(days=30)
        renewal = Renewal(
            familyUserId=user.id,
            elderId=elder_id,
            assignmentId=assignment.id,
            currentPeriodEnd=end_date,
            requestedPeriodStart=end_date,
            requestedPeriodEnd=end_date + timedelta(days=30),
            amount=29854.0,
            currency="INR",
            status="PENDING",
            autoDebitEnabled=False,
            mandateStatus="NOT_CONFIGURED"
        )
        db.add(renewal)
        await db.commit()
        await db.refresh(assignment)

    return assignment


@router.get("/assignments/active", response_model=Optional[CareAssignmentResponse])
async def get_active_assignment(
    elderId: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve active caregiver assignment for the family's elder."""
    assignment = await seed_caregivers_and_assignment_if_needed(db, current_user, elderId)
    if not assignment:
        return None

    # Load with caregiver relationship
    res = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.id == assignment.id)
    )
    return res.scalar_one_or_none()


@router.get("/caregivers/buffer-pool", response_model=List[CaregiverResponse])
async def get_buffer_pool_caregivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve available substitute caregivers in Chennai buffer pool."""
    res = await db.execute(
        select(Caregiver)
        .where(Caregiver.isBufferPool == True, Caregiver.status == "AVAILABLE")
    )
    return res.scalars().all()
