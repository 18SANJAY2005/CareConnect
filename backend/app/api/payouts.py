from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.user import User
from app.models.caregiver import Caregiver
from app.models.elder import Elder
from app.models.shift import CareShift
from app.models.assignment import CareAssignment
from app.models.payout import CaregiverPayout, CaregiverShiftEarning

router = APIRouter(
    prefix="/payouts",
    tags=["Caregiver Payouts & Earnings"],
)


# ============================================================================
# Schemas
# ============================================================================

class PayoutSummaryResponse(BaseModel):
    totalEarned: float
    pendingPayout: float
    approvedPayout: float
    paidPayout: float
    deductionsAmount: float
    currency: str
    period: str
    shiftsCount: int


class ShiftEarningItem(BaseModel):
    id: str
    shiftId: Optional[str]
    elderId: str
    elderName: str
    shiftDate: str
    hoursWorked: float
    dailyRate: float
    earnedAmount: float
    status: str
    payoutId: Optional[str] = None
    notes: Optional[str] = None


class ElderEarningGroup(BaseModel):
    elderId: str
    elderName: str
    shiftsCompleted: int
    totalEarned: float
    locality: Optional[str] = None


class PayoutHistoryItem(BaseModel):
    id: str
    payoutNumber: str
    periodStart: str
    periodEnd: str
    totalEarned: float
    deductionsAmount: float
    netPayoutAmount: float
    currency: str
    status: str
    providerReference: Optional[str] = None
    paidAt: Optional[str] = None
    createdAt: str
    careSeekerNames: List[str] = []
    shiftsCount: int = 0


class GeneratePayoutRequest(BaseModel):
    caregiverId: str
    deductionsAmount: Optional[float] = 0.0
    notes: Optional[str] = None


class UpdatePayoutStatusRequest(BaseModel):
    status: str  # APPROVED, PAID, REJECTED
    providerReference: Optional[str] = None
    notes: Optional[str] = None


# ============================================================================
# Reconciliation helper
# ============================================================================

async def _reconcile_caregiver_shift_earnings(db: AsyncSession, caregiver_user_id: str):
    """
    Ensure all completed shifts for this caregiver are persisted as
    auditable CaregiverShiftEarning records without duplicates.
    """
    # Fetch caregiver directory rate
    cg_res = await db.execute(select(Caregiver).join(User, User.phone == Caregiver.phone).where(User.id == caregiver_user_id))
    cg = cg_res.scalars().first()
    daily_rate = float(cg.daily_rate) if cg and cg.daily_rate else 2000.0

    # Fetch completed shifts
    shifts_res = await db.execute(
        select(CareShift).where(
            CareShift.caregiverId == caregiver_user_id,
            CareShift.status.in_(["CHECKED_OUT", "COMPLETED"]),
        )
    )
    completed_shifts = shifts_res.scalars().all()

    for shift in completed_shifts:
        # Check if shift earning already exists (unique per shiftId)
        existing = await db.execute(
            select(CaregiverShiftEarning).where(CaregiverShiftEarning.shiftId == shift.id)
        )
        if not existing.scalar_one_or_none():
            earning = CaregiverShiftEarning(
                caregiverId=caregiver_user_id,
                shiftId=shift.id,
                elderId=shift.elderId,
                shiftDate=shift.scheduledStart or datetime.now(timezone.utc),
                hoursWorked=12.0 if "12" in str(shift.shiftType) else (10.0 if "10" in str(shift.shiftType) else 8.0),
                dailyRate=daily_rate,
                earnedAmount=daily_rate,
                status="PENDING",
                notes=f"Auto-accrued from completed shift {shift.id}",
            )
            db.add(earning)

    await db.commit()


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/caregiver/summary", response_model=PayoutSummaryResponse)
async def get_caregiver_payout_summary(
    period: str = Query("this_month", description="this_week, this_month, last_month, all"),
    current_user: User = Depends(require_role(["CAREGIVER", "ADMIN", "OPS_MANAGER"])),
    caregiver_id: Optional[str] = Query(None, description="Optional caregiver ID for Admin view"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve authoritative earnings and payout summary for a selectable period.
    Enforces authorization: Caregivers can ONLY view their own records.
    """
    target_id = current_user.id
    if current_user.role in ["ADMIN", "OPS_MANAGER"] and caregiver_id:
        target_id = caregiver_id

    await _reconcile_caregiver_shift_earnings(db, target_id)

    # Calculate date range
    now = datetime.now(timezone.utc)
    start_date = None

    if period == "this_week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "this_month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "last_month":
        first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_day_of_last_month = first_of_this_month - timedelta(days=1)
        start_date = last_day_of_last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # "all" leaves start_date as None

    query = select(CaregiverShiftEarning).where(CaregiverShiftEarning.caregiverId == target_id)
    if start_date:
        query = query.where(CaregiverShiftEarning.shiftDate >= start_date)

    res = await db.execute(query)
    earnings = res.scalars().all()

    total_earned = sum(e.earnedAmount for e in earnings)
    pending_total = sum(e.earnedAmount for e in earnings if e.status in ["PENDING", "APPROVED"])
    paid_total = sum(e.earnedAmount for e in earnings if e.status == "PAID")

    # Fetch approved payouts for this caregiver
    payout_query = select(CaregiverPayout).where(CaregiverPayout.caregiverId == target_id)
    if start_date:
        payout_query = payout_query.where(CaregiverPayout.periodStart >= start_date)
    payout_res = await db.execute(payout_query)
    payouts = payout_res.scalars().all()

    approved_payout_total = sum(p.netPayoutAmount for p in payouts if p.status == "APPROVED")
    deductions_total = sum(p.deductionsAmount for p in payouts)

    return PayoutSummaryResponse(
        totalEarned=total_earned,
        pendingPayout=pending_total,
        approvedPayout=approved_payout_total,
        paidPayout=paid_total,
        deductionsAmount=deductions_total,
        currency="INR",
        period=period,
        shiftsCount=len(earnings),
    )


@router.get("/caregiver/shifts", response_model=List[ShiftEarningItem])
async def get_caregiver_shift_earnings(
    period: str = Query("all", description="this_week, this_month, last_month, all"),
    current_user: User = Depends(require_role(["CAREGIVER", "ADMIN", "OPS_MANAGER"])),
    caregiver_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve detailed earnings broken down by completed shift.
    """
    target_id = current_user.id
    if current_user.role in ["ADMIN", "OPS_MANAGER"] and caregiver_id:
        target_id = caregiver_id

    await _reconcile_caregiver_shift_earnings(db, target_id)

    query = select(CaregiverShiftEarning).where(CaregiverShiftEarning.caregiverId == target_id).order_by(CaregiverShiftEarning.shiftDate.desc())
    res = await db.execute(query)
    items = res.scalars().all()

    output = []
    for it in items:
        elder = await db.get(Elder, it.elderId)
        output.append(
            ShiftEarningItem(
                id=it.id,
                shiftId=it.shiftId,
                elderId=it.elderId,
                elderName=elder.name if elder else "Elder Patient",
                shiftDate=it.shiftDate.strftime("%d %b %Y, %I:%M %p") if it.shiftDate else "Recent",
                hoursWorked=it.hoursWorked,
                dailyRate=it.dailyRate,
                earnedAmount=it.earnedAmount,
                status=it.status,
                payoutId=it.payoutId,
                notes=it.notes,
            )
        )
    return output


@router.get("/caregiver/by-elder", response_model=List[ElderEarningGroup])
async def get_earnings_grouped_by_elder(
    current_user: User = Depends(require_role(["CAREGIVER", "ADMIN", "OPS_MANAGER"])),
    caregiver_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve caregiver earnings grouped by CareSeeker / Elder.
    """
    target_id = current_user.id
    if current_user.role in ["ADMIN", "OPS_MANAGER"] and caregiver_id:
        target_id = caregiver_id

    await _reconcile_caregiver_shift_earnings(db, target_id)

    res = await db.execute(
        select(CaregiverShiftEarning).where(CaregiverShiftEarning.caregiverId == target_id)
    )
    earnings = res.scalars().all()

    by_elder = {}
    for e in earnings:
        if e.elderId not in by_elder:
            by_elder[e.elderId] = {"shifts": 0, "total": 0.0}
        by_elder[e.elderId]["shifts"] += 1
        by_elder[e.elderId]["total"] += e.earnedAmount

    output = []
    for elder_id, data in by_elder.items():
        elder = await db.get(Elder, elder_id)
        output.append(
            ElderEarningGroup(
                elderId=elder_id,
                elderName=elder.name if elder else "Care Seeker",
                shiftsCompleted=data["shifts"],
                totalEarned=data["total"],
                locality=elder.locality if elder else "Chennai",
            )
        )
    return output


@router.get("/caregiver/history", response_model=List[PayoutHistoryItem])
async def get_payout_history(
    search: Optional[str] = Query(None, description="Search by care-seeker name, payout reference, or status"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. PENDING, APPROVED, PAID)"),
    caregiver_id: Optional[str] = Query(None, description="Optional caregiver ID for Admin view"),
    limit: int = Query(50, ge=1, le=100, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    current_user: User = Depends(require_role(["CAREGIVER", "ADMIN", "OPS_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve auditable payout history with optional search across care seeker names,
    payout number, and provider reference. Enforces strict caregiver isolation.
    """
    target_id = current_user.id
    if current_user.role in ["ADMIN", "OPS_MANAGER"] and caregiver_id:
        target_id = caregiver_id

    stmt = select(CaregiverPayout).where(CaregiverPayout.caregiverId == target_id)
    if status and status.strip():
        stmt = stmt.where(CaregiverPayout.status == status.strip().upper())
    stmt = stmt.order_by(CaregiverPayout.createdAt.desc())

    res = await db.execute(stmt)
    payouts = res.scalars().all()

    payout_ids = [p.id for p in payouts]
    payout_elders = {}
    payout_shifts = {}

    if payout_ids:
        earnings_res = await db.execute(
            select(CaregiverShiftEarning, Elder.name)
            .outerjoin(Elder, Elder.id == CaregiverShiftEarning.elderId)
            .where(
                CaregiverShiftEarning.caregiverId == target_id,
                CaregiverShiftEarning.payoutId.in_(payout_ids),
            )
        )
        for earning, elder_name in earnings_res.all():
            p_id = earning.payoutId
            if p_id not in payout_elders:
                payout_elders[p_id] = set()
                payout_shifts[p_id] = 0
            if elder_name:
                payout_elders[p_id].add(elder_name)
            payout_shifts[p_id] += 1

    results = []
    search_term = search.strip().lower() if search and search.strip() else None

    for p in payouts:
        elder_names = sorted(list(payout_elders.get(p.id, set())))
        shifts_count = payout_shifts.get(p.id, 0)

        if search_term:
            matches_elder = any(search_term in name.lower() for name in elder_names)
            matches_num = search_term in (p.payoutNumber or "").lower()
            matches_ref = search_term in (p.providerReference or "").lower()
            matches_stat = search_term in (p.status or "").lower()
            if not (matches_elder or matches_num or matches_ref or matches_stat):
                continue

        results.append(
            PayoutHistoryItem(
                id=p.id,
                payoutNumber=p.payoutNumber,
                periodStart=p.periodStart.strftime("%d %b %Y"),
                periodEnd=p.periodEnd.strftime("%d %b %Y"),
                totalEarned=p.totalEarned,
                deductionsAmount=p.deductionsAmount,
                netPayoutAmount=p.netPayoutAmount,
                currency=p.currency,
                status=p.status,
                providerReference=p.providerReference,
                paidAt=p.paidAt.strftime("%d %b %Y, %I:%M %p") if p.paidAt else None,
                createdAt=p.createdAt.strftime("%d %b %Y"),
                careSeekerNames=elder_names,
                shiftsCount=shifts_count,
            )
        )

    return results[offset : offset + limit]


@router.post("/admin/generate", status_code=status.HTTP_201_CREATED)
async def generate_caregiver_payout(
    payload: GeneratePayoutRequest,
    current_user: User = Depends(require_role(["ADMIN", "OPS_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin/Operations action to generate a persisted payout batch from pending shift earnings.
    Prevents duplicate payout creation and guarantees auditable records.
    """
    await _reconcile_caregiver_shift_earnings(db, payload.caregiverId)

    # Fetch pending shift earnings
    res = await db.execute(
        select(CaregiverShiftEarning).where(
            CaregiverShiftEarning.caregiverId == payload.caregiverId,
            CaregiverShiftEarning.status == "PENDING",
            CaregiverShiftEarning.payoutId.is_(None),
        )
    )
    pending_earnings = res.scalars().all()

    if not pending_earnings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending shift earnings available to generate a payout for this caregiver.",
        )

    total_earned = sum(e.earnedAmount for e in pending_earnings)
    deductions = float(payload.deductionsAmount or 0.0)
    net_payout = max(0.0, total_earned - deductions)

    now = datetime.now(timezone.utc)
    earliest_date = min(e.shiftDate for e in pending_earnings)
    latest_date = max(e.shiftDate for e in pending_earnings)

    payout_seq = int(now.timestamp()) % 100000
    payout_number = f"PAY-{now.year}-CH-{payout_seq}"

    payout = CaregiverPayout(
        payoutNumber=payout_number,
        caregiverId=payload.caregiverId,
        periodStart=earliest_date,
        periodEnd=latest_date,
        totalEarned=total_earned,
        deductionsAmount=deductions,
        netPayoutAmount=net_payout,
        currency="INR",
        status="APPROVED",
        approvedById=current_user.id,
        approvedAt=now,
        notes=payload.notes or "Regular scheduled caregiver payout batch",
    )
    db.add(payout)
    await db.flush()

    # Link earnings to this payout
    for e in pending_earnings:
        e.status = "INCLUDED_IN_PAYOUT"
        e.payoutId = payout.id

    await db.commit()
    await db.refresh(payout)

    return {
        "success": True,
        "message": f"Payout {payout.payoutNumber} generated successfully for ₹{net_payout:,.2f}.",
        "payoutId": payout.id,
        "payoutNumber": payout.payoutNumber,
        "netAmount": net_payout,
        "status": payout.status,
    }


@router.patch("/admin/{payout_id}/status")
async def update_payout_status(
    payout_id: str,
    payload: UpdatePayoutStatusRequest,
    current_user: User = Depends(require_role(["ADMIN", "OPS_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Authorize or mark payout as PAID with provider reference.
    Guarantees no real money transfer is claimed without provider reference.
    """
    payout = await db.get(CaregiverPayout, payout_id)
    if not payout:
        raise HTTPException(status_code=404, detail="Payout record not found.")

    new_status = payload.status.upper()
    if new_status == "PAID" and not payload.providerReference:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider reference (e.g. Bank UTR / RazorpayX Payout ID) is required to mark payout as PAID.",
        )

    payout.status = new_status
    if payload.providerReference:
        payout.providerReference = payload.providerReference
    if new_status == "PAID":
        payout.paidAt = datetime.now(timezone.utc)

        # Update all linked shift earnings to PAID
        earnings_res = await db.execute(
            select(CaregiverShiftEarning).where(CaregiverShiftEarning.payoutId == payout.id)
        )
        for e in earnings_res.scalars().all():
            e.status = "PAID"

    if payload.notes:
        payout.notes = f"{payout.notes or ''}\n{payload.notes}".strip()

    await db.commit()
    await db.refresh(payout)

    return {
        "success": True,
        "payoutId": payout.id,
        "payoutNumber": payout.payoutNumber,
        "status": payout.status,
        "providerReference": payout.providerReference,
        "paidAt": payout.paidAt.isoformat() if payout.paidAt else None,
    }
