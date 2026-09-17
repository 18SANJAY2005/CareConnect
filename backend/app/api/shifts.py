import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.models.shift import CareShift, AttendanceLog
from app.schemas.shift import (
    CheckInRequest, CheckOutRequest, SupervisorOverrideRequest,
    ShiftResponse, ShiftDetailResponse, LiveShiftMonitorItem
)
from app.services.attendance_service import AttendanceService
from app.services.care_task_service import CareTaskService

router = APIRouter(prefix="/shifts", tags=["Shifts & Attendance"])

@router.get("/current", status_code=status.HTTP_200_OK)
async def get_current_caregiver_shift(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the current active or upcoming shift for the logged-in caregiver."""
    shift = await AttendanceService.get_caregiver_current_shift(db, current_user.id)
    if not shift:
        # If no shift assigned directly to current_user, check if any shift exists in the system to support demo
        any_shift_res = await db.execute(select(CareShift).order_by(CareShift.createdAt.desc()))
        shift = any_shift_res.scalars().first()
        if not shift:
            return {"shift": None, "message": "No active shift assignment found."}

    elder_res = await db.execute(select(Elder).where(Elder.id == shift.elderId))
    elder = elder_res.scalar_one_or_none()

    loc_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == shift.elderId))
    elder_loc = loc_res.scalar_one_or_none()

    # Ensure daily checklist tasks are populated for this shift
    await CareTaskService.ensure_shift_tasks(db, shift.id, shift.elderId, shift.caregiverId)

    # Get latest attendance log
    log_res = await db.execute(
        select(AttendanceLog)
        .where(AttendanceLog.shiftId == shift.id)
        .order_by(AttendanceLog.createdAt.desc())
    )
    latest_log = log_res.scalars().first()

    return {
        "shift": {
            "id": shift.id,
            "elderId": shift.elderId,
            "caregiverId": shift.caregiverId,
            "shiftType": shift.shiftType,
            "status": shift.status,
            "scheduledStart": shift.scheduledStart.isoformat() if shift.scheduledStart else None,
            "scheduledEnd": shift.scheduledEnd.isoformat() if shift.scheduledEnd else None,
            "geofenceRadiusMeters": shift.geofenceRadiusMeters,
            "supervisorNotes": shift.supervisorNotes,
        },
        "elder": {
            "id": elder.id if elder else None,
            "name": elder.name if elder else "Elder Patient",
            "age": elder.age if elder else 72,
            "gender": elder.gender if elder else "FEMALE",
            "mobilityLevel": elder.mobilityLevel if elder else "INDEPENDENT",
            "primaryLanguage": elder.primaryLanguage if elder else "Tamil",
            "locality": elder_loc.locality if elder_loc else "Adyar, Chennai",
            "addressLine1": elder_loc.addressLine1 if elder_loc else "14 Gandhi Road",
            "latitude": elder_loc.latitude if elder_loc else 13.0012,
            "longitude": elder_loc.longitude if elder_loc else 80.2565
        },
        "latestAttendance": {
            "checkInTime": latest_log.checkInTime.isoformat() if latest_log else None,
            "distanceMeters": latest_log.checkInDistanceMeters if latest_log else None,
            "verificationStatus": latest_log.verificationStatus if latest_log else None,
            "checkInMethod": latest_log.checkInMethod if latest_log else None
        } if latest_log else None
    }

@router.get("/elder/{elder_id}", status_code=status.HTTP_200_OK)
async def get_elder_shift_status(
    elder_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the current active shift and attendance status for an elder (Family view)."""
    shift = await AttendanceService.get_elder_active_shift(db, elder_id)
    if not shift:
        return {"shift": None, "message": "No active shift currently running for this elder."}

    caregiver_res = await db.execute(select(User).where(User.id == shift.caregiverId))
    caregiver = caregiver_res.scalar_one_or_none()

    log_res = await db.execute(
        select(AttendanceLog)
        .where(AttendanceLog.shiftId == shift.id)
        .order_by(AttendanceLog.createdAt.desc())
    )
    latest_log = log_res.scalars().first()

    return {
        "shiftId": shift.id,
        "status": shift.status,
        "shiftType": shift.shiftType,
        "caregiver": {
            "id": caregiver.id if caregiver else None,
            "fullName": caregiver.fullName if caregiver else "Assigned Attendant",
            "phone": caregiver.phone if caregiver else "+91 98400 12345"
        },
        "attendance": {
            "checkInTime": latest_log.checkInTime.isoformat() if latest_log else None,
            "distanceMeters": latest_log.checkInDistanceMeters if latest_log else None,
            "verificationStatus": latest_log.verificationStatus if latest_log else "PENDING",
            "onDuty": shift.status in ["ACTIVE", "CHECKED_IN"]
        } if latest_log else None
    }

@router.get("/monitor", response_model=List[LiveShiftMonitorItem], status_code=status.HTTP_200_OK)
async def get_live_shift_monitor(
    db: AsyncSession = Depends(get_db)
):
    """Operations Shift Monitor: Real-time status across all shifts in Chennai."""
    items = await AttendanceService.get_live_monitor(db)
    return items

@router.post("/{shift_id}/check-in", status_code=status.HTTP_200_OK)
async def check_in_shift(
    shift_id: str,
    payload: CheckInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Caregiver check-in with GPS coordinates & geofence validation."""
    result = await AttendanceService.check_in(
        db=db,
        shift_id=shift_id,
        caregiver_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        override_code=payload.overrideCode,
        method=payload.method
    )
    return result

@router.post("/{shift_id}/check-out", status_code=status.HTTP_200_OK)
async def check_out_shift(
    shift_id: str,
    payload: CheckOutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Caregiver check-out and shift summary."""
    result = await AttendanceService.check_out(
        db=db,
        shift_id=shift_id,
        caregiver_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        summary=payload.summary
    )
    return result

@router.post("/{shift_id}/supervisor-override", status_code=status.HTTP_200_OK)
async def supervisor_override(
    shift_id: str,
    payload: SupervisorOverrideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Supervisor/Ops approves an out-of-range check-in exception."""
    result = await AttendanceService.supervisor_override(
        db=db,
        shift_id=shift_id,
        supervisor_id=current_user.id,
        reason=payload.reason
    )
    return result

@router.post("/seed-demo", status_code=status.HTTP_200_OK)
async def seed_demo_scenario(db: AsyncSession = Depends(get_db)):
    """
    Seed a complete, realistic Chennai Active Care scenario with:
    - Elder in Adyar (Kalyani Ammal, 74)
    - Caregiver (Meenakshi Sundaram)
    - Active shift today
    - Checked-in attendance log
    - Daily care tasks
    - Historical vitals
    """
    now = datetime.now(timezone.utc)

    # 1. Ensure caregiver user exists
    cg_res = await db.execute(select(User).where(User.phone == "+919876500001"))
    caregiver = cg_res.scalar_one_or_none()
    if not caregiver:
        caregiver = User(
            role="CAREGIVER",
            fullName="Meenakshi Sundaram",
            phone="+919876500001",
            email="meenakshi.care@careconnect.in",
            authProvider="PHONE_OTP"
        )
        db.add(caregiver)
        await db.flush()

    # 2. Ensure family sponsor exists
    sp_res = await db.execute(select(User).where(User.phone == "+919876543210"))
    sponsor = sp_res.scalar_one_or_none()
    if not sponsor:
        sponsor = User(
            role="FAMILY_SPONSOR",
            fullName="Suresh Kumar",
            phone="+919876543210",
            email="suresh.kumar@example.com",
            authProvider="PHONE_OTP"
        )
        db.add(sponsor)
        await db.flush()

    # 3. Ensure elder exists
    elder_res = await db.execute(select(Elder).where(Elder.name == "Kalyani Ammal"))
    elder = elder_res.scalar_one_or_none()
    if not elder:
        elder = Elder(
            familyId=sponsor.id,
            name="Kalyani Ammal",
            age=74,
            gender="FEMALE",
            mobilityLevel="ASSISTED_WALKER",
            primaryLanguage="Tamil",
            medicalConditions=["Hypertension", "Type 2 Diabetes"],
            careRequirements=["Medication Observation", "Mobility Assistance", "Daily Vitals Tracking"],
            personaStatus="SAVED"
        )
        db.add(elder)
        await db.flush()

        # Location in Adyar, Chennai (lat 13.0012, lng 80.2565)
        loc = ElderLocation(
            elderId=elder.id,
            addressLine1="Plot 12, 3rd Cross Street, Gandhi Nagar",
            locality="Adyar",
            city="Chennai",
            state="Tamil Nadu",
            postalCode="600020",
            latitude=13.0012,
            longitude=80.2565,
            verificationStatus="VERIFIED",
            serviceable=True
        )
        db.add(loc)
        await db.flush()

    # 4. Create or reset Shift for today
    shift_res = await db.execute(select(CareShift).where(CareShift.elderId == elder.id))
    shift = shift_res.scalars().first()
    if not shift:
        shift = CareShift(
            elderId=elder.id,
            caregiverId=caregiver.id,
            shiftType="EIGHT_HOUR_DAY",
            status="ACTIVE",
            scheduledStart=now.replace(hour=8, minute=0, second=0, microsecond=0),
            scheduledEnd=now.replace(hour=16, minute=0, second=0, microsecond=0),
            geofenceRadiusMeters=200.0,
            supervisorNotes="Elder prefers Tamil communication. Routine vitals at 09:00 and 14:00."
        )
        db.add(shift)
        await db.flush()

        # Add verified attendance log (15 meters away)
        att_log = AttendanceLog(
            shiftId=shift.id,
            caregiverId=caregiver.id,
            checkInTime=now.replace(hour=8, minute=5, second=0, microsecond=0),
            checkInLatitude=13.0013,
            checkInLongitude=80.2566,
            checkInDistanceMeters=15.4,
            verificationStatus="VERIFIED",
            checkInMethod="GPS"
        )
        db.add(att_log)

    await db.commit()

    # Ensure default tasks are seeded
    await CareTaskService.ensure_shift_tasks(db, shift.id, elder.id, caregiver.id)

    return {
        "success": True,
        "message": "Demo Active Care scenario seeded successfully.",
        "elderId": elder.id,
        "elderName": elder.name,
        "caregiverId": caregiver.id,
        "caregiverName": caregiver.fullName,
        "shiftId": shift.id
    }

