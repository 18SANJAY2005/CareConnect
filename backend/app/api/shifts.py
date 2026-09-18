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
            "name": elder.name if elder else "",
            "age": elder.age if elder else 0,
            "gender": elder.gender if elder else "",
            "mobilityLevel": elder.mobilityLevel if elder else "",
            "primaryLanguage": elder.primaryLanguage if elder else "",
            "locality": elder_loc.locality if elder_loc else "",
            "addressLine1": elder_loc.addressLine1 if elder_loc else "",
            "latitude": elder_loc.latitude if elder_loc else 0.0,
            "longitude": elder_loc.longitude if elder_loc else 0.0
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

