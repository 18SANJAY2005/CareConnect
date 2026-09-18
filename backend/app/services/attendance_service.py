import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status
from app.models.shift import CareShift, AttendanceLog
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.models.user import User
from app.services.geo_service import GeoService

class AttendanceService:
    @staticmethod
    async def get_caregiver_current_shift(db: AsyncSession, caregiver_id: str) -> Optional[CareShift]:
        """Fetch the current active or upcoming shift assigned to this caregiver."""
        now = datetime.now(timezone.utc)
        # Look for active or checked in shifts first
        result = await db.execute(
            select(CareShift)
            .where(
                CareShift.caregiverId == caregiver_id,
                CareShift.status.in_(["ACTIVE", "CHECKED_IN", "EXCEPTION", "SCHEDULED", "LATE"])
            )
            .order_by(CareShift.scheduledStart.asc())
        )
        return result.scalars().first()

    @staticmethod
    async def get_elder_active_shift(db: AsyncSession, elder_id: str) -> Optional[CareShift]:
        """Fetch the current active shift for an elder."""
        result = await db.execute(
            select(CareShift)
            .where(
                CareShift.elderId == elder_id,
                CareShift.status.in_(["ACTIVE", "CHECKED_IN", "EXCEPTION", "SCHEDULED", "LATE", "CHECKED_OUT"])
            )
            .order_by(CareShift.createdAt.desc())
        )
        return result.scalars().first()

    @staticmethod
    async def check_in(
        db: AsyncSession,
        shift_id: str,
        caregiver_id: str,
        latitude: float,
        longitude: float,
        override_code: Optional[str] = None,
        method: str = "GPS"
    ) -> Dict[str, Any]:
        """
        Record caregiver check-in. Validates proximity against Elder's verified coordinates.
        Supports household OTP or supervisor override if out of range.
        """
        result = await db.execute(select(CareShift).where(CareShift.id == shift_id))
        shift = result.scalar_one_or_none()
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        if shift.caregiverId != caregiver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized for this shift assignment"
            )

        if shift.status in ["CHECKED_IN", "ACTIVE"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Caregiver is already checked into this shift"
            )

        # Retrieve Elder location
        loc_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == shift.elderId))
        elder_loc = loc_res.scalar_one_or_none()

        elder_lat = elder_loc.latitude if elder_loc else 0.0
        elder_lng = elder_loc.longitude if elder_loc else 0.0

        # Evaluate geofence
        geo_result = GeoService.verify_geofence(
            elder_lat=elder_lat,
            elder_lng=elder_lng,
            checkin_lat=latitude,
            checkin_lng=longitude,
            radius_meters=shift.geofenceRadiusMeters
        )

        verification_status = geo_result["verificationStatus"]
        checkin_method = method

        # Handle OTP override if out of range
        if not geo_result["verified"] and override_code:
            # Household OTP override (Mocked until OTP service integration)
            if override_code:
                verification_status = "OTP_OVERRIDE"
                checkin_method = "HOUSEHOLD_OTP"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid household verification OTP provided."
                )

        # Update shift status: ACTIVE if verified or overridden, else EXCEPTION
        shift.status = "ACTIVE" if verification_status in ["VERIFIED", "OTP_OVERRIDE"] else "EXCEPTION"
        
        # Check if late
        now = datetime.now(timezone.utc)
        if shift.scheduledStart and now > shift.scheduledStart + timedelta(minutes=15) and shift.status == "ACTIVE":
            # Shift was started late
            shift.supervisorNotes = (shift.supervisorNotes or "") + f" [Check-in completed late at {now.isoformat()}]"

        # Create attendance log
        log = AttendanceLog(
            shiftId=shift.id,
            caregiverId=caregiver_id,
            checkInTime=now,
            checkInLatitude=latitude,
            checkInLongitude=longitude,
            checkInDistanceMeters=geo_result["distanceMeters"],
            verificationStatus=verification_status,
            checkInMethod=checkin_method
        )
        db.add(log)
        await db.commit()
        await db.refresh(shift)
        await db.refresh(log)

        return {
            "shiftId": shift.id,
            "shiftStatus": shift.status,
            "verificationStatus": verification_status,
            "distanceMeters": geo_result["distanceMeters"],
            "radiusMeters": shift.geofenceRadiusMeters,
            "checkInTime": log.checkInTime.isoformat(),
            "message": (
                "Attendance verified! You are on duty."
                if verification_status in ["VERIFIED", "OTP_OVERRIDE"]
                else f"Check-in recorded with Out-of-Range warning ({round(geo_result['distanceMeters'], 1)}m away). Flagged for supervisor review."
            )
        }

    @staticmethod
    async def supervisor_override(
        db: AsyncSession,
        shift_id: str,
        supervisor_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """Authorize supervisor override for an out-of-range or exception check-in."""
        shift_res = await db.execute(select(CareShift).where(CareShift.id == shift_id))
        shift = shift_res.scalar_one_or_none()
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        # Update latest log
        log_res = await db.execute(
            select(AttendanceLog)
            .where(AttendanceLog.shiftId == shift_id)
            .order_by(AttendanceLog.createdAt.desc())
        )
        log = log_res.scalars().first()
        if log:
            log.verificationStatus = "SUPERVISOR_OVERRIDE"

        shift.status = "ACTIVE"
        shift.supervisorNotes = (shift.supervisorNotes or "") + f" [Supervisor Override: {reason}]"

        await db.commit()
        return {"success": True, "message": "Supervisor override approved. Shift is now ACTIVE."}

    @staticmethod
    async def check_out(
        db: AsyncSession,
        shift_id: str,
        caregiver_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """Record caregiver check-out and complete the shift."""
        shift_res = await db.execute(select(CareShift).where(CareShift.id == shift_id))
        shift = shift_res.scalar_one_or_none()
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        if shift.caregiverId != caregiver_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

        now = datetime.now(timezone.utc)
        shift.status = "CHECKED_OUT"

        # Update attendance log
        log_res = await db.execute(
            select(AttendanceLog)
            .where(AttendanceLog.shiftId == shift_id)
            .order_by(AttendanceLog.createdAt.desc())
        )
        log = log_res.scalars().first()
        if log:
            log.checkOutTime = now
            log.checkOutLatitude = latitude
            log.checkOutLongitude = longitude
            log.checkOutSummary = summary

        await db.commit()
        return {
            "shiftId": shift.id,
            "status": "CHECKED_OUT",
            "checkOutTime": now.isoformat(),
            "summary": summary,
            "message": "Shift completed successfully. Care records archived to family timeline."
        }

    @staticmethod
    async def get_live_monitor(db: AsyncSession) -> List[Dict[str, Any]]:
        """Operations Shift Monitor: Retrieve all shifts with live status and elder/caregiver details."""
        res = await db.execute(
            select(CareShift)
            .order_by(CareShift.createdAt.desc())
        )
        shifts = res.scalars().all()
        now = datetime.now(timezone.utc)

        monitor_items = []
        for s in shifts:
            # Re-evaluate late / missed
            computed_status = s.status
            if s.status == "SCHEDULED" and s.scheduledStart:
                if now > s.scheduledStart + timedelta(hours=2):
                    computed_status = "MISSED"
                elif now > s.scheduledStart + timedelta(minutes=15):
                    computed_status = "LATE"

            # Fetch elder and caregiver info
            elder_res = await db.execute(select(Elder).where(Elder.id == s.elderId))
            elder = elder_res.scalar_one_or_none()

            caregiver_res = await db.execute(select(User).where(User.id == s.caregiverId))
            caregiver = caregiver_res.scalar_one_or_none()

            log_res = await db.execute(
                select(AttendanceLog)
                .where(AttendanceLog.shiftId == s.id)
                .order_by(AttendanceLog.createdAt.desc())
            )
            log = log_res.scalars().first()

            monitor_items.append({
                "shiftId": s.id,
                "status": computed_status,
                "shiftType": s.shiftType,
                "scheduledStart": s.scheduledStart.isoformat() if s.scheduledStart else None,
                "scheduledEnd": s.scheduledEnd.isoformat() if s.scheduledEnd else None,
                "elderId": s.elderId,
                "elderName": elder.name if elder else "Unknown Elder",
                "locality": elder.location.locality if elder and elder.location else "Chennai",
                "caregiverId": s.caregiverId,
                "caregiverName": caregiver.fullName if caregiver else "Assigned Caregiver",
                "checkInTime": log.checkInTime.isoformat() if log else None,
                "distanceMeters": log.checkInDistanceMeters if log else None,
                "verificationStatus": log.verificationStatus if log else None,
                "supervisorNotes": s.supervisorNotes
            })

        return monitor_items

