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
from app.models.caregiver import Caregiver
from app.models.assignment import CareAssignment
from app.services.geo_service import GeoService

class AttendanceService:
    @staticmethod
    def _compute_shift_schedule(shift_type: str, daily_routine: Optional[dict] = None) -> tuple[datetime, datetime]:
        now = datetime.now(timezone.utc)
        st = (shift_type or "").upper()
        routine = daily_routine or {}

        if "24" in st or "LIVE_IN" in st or "TWENTY_FOUR" in st:
            start_time = now.replace(hour=8, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(hours=24)
        elif "12" in st or "TWELVE" in st:
            start_time = now.replace(hour=8, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(hours=12)
        elif "FLEXIBLE" in st:
            pref_start = routine.get("preferredStartTime") or routine.get("startTime") or "09:00"
            pref_end = routine.get("preferredEndTime") or routine.get("endTime") or "17:00"
            try:
                sh, sm = map(int, str(pref_start).split(":"))
                eh, em = map(int, str(pref_end).split(":"))
                start_time = now.replace(hour=sh, minute=sm, second=0, microsecond=0)
                end_time = now.replace(hour=eh, minute=em, second=0, microsecond=0)
                if end_time <= start_time:
                    end_time += timedelta(days=1)
            except Exception:
                start_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(hours=8)
        else:
            # Default 8 hours
            start_time = now.replace(hour=8, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(hours=8)

        return start_time, end_time

    @staticmethod
    async def get_caregiver_current_shift(db: AsyncSession, caregiver_id: str) -> Optional[CareShift]:
        """Fetch the current active or upcoming shift assigned to this caregiver."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Look for active, checked in, or scheduled shifts first
        result = await db.execute(
            select(CareShift)
            .where(
                CareShift.caregiverId == caregiver_id,
                CareShift.status.in_(["ACTIVE", "CHECKED_IN", "EXCEPTION", "SCHEDULED", "LATE"])
            )
            .order_by(CareShift.scheduledStart.asc())
        )
        shift = result.scalars().first()
        if shift:
            return shift

        # If caregiver already checked out or completed a shift today, preserve and return it
        co_res = await db.execute(
            select(CareShift)
            .where(
                CareShift.caregiverId == caregiver_id,
                CareShift.status.in_(["CHECKED_OUT", "COMPLETED"]),
                CareShift.scheduledStart >= today_start
            )
            .order_by(CareShift.createdAt.desc())
        )
        co_shift = co_res.scalars().first()
        if co_shift:
            return co_shift

        # If no active CareShift exists, check if caregiver has an active CareAssignment
        u_res = await db.execute(select(User).where(User.id == caregiver_id))
        user = u_res.scalar_one_or_none()
        if not user:
            return None

        # Link User to Caregiver directory record by phone or name
        cg_res = await db.execute(
            select(Caregiver).where(
                (Caregiver.phone == user.phone) | (Caregiver.full_name == user.fullName)
            )
        )
        cg = cg_res.scalars().first()
        if not cg:
            return None

        # Look for confirmed/active CareAssignment
        asg_res = await db.execute(
            select(CareAssignment).where(
                CareAssignment.caregiver_id == cg.id,
                CareAssignment.status.in_(["ACTIVE", "SERVICE_CONFIRMED"])
            )
        )
        asg = asg_res.scalars().first()
        if not asg:
            return None

        # Check if elder already has an active or today's shift (prevents duplicate shifts)
        elder_shift_res = await db.execute(
            select(CareShift)
            .where(
                CareShift.elderId == asg.elder_id,
                CareShift.scheduledStart >= today_start
            )
            .order_by(CareShift.createdAt.desc())
        )
        elder_shift = elder_shift_res.scalars().first()
        if elder_shift:
            if elder_shift.caregiverId != user.id:
                elder_shift.caregiverId = user.id
                await db.commit()
                await db.refresh(elder_shift)
            return elder_shift

        # Fetch elder to inspect shift preferences and daily routine
        elder_res = await db.execute(select(Elder).where(Elder.id == asg.elder_id))
        elder = elder_res.scalar_one_or_none()
        daily_routine = elder.dailyRoutine if (elder and isinstance(elder.dailyRoutine, dict)) else {}
        shift_type = asg.shift_type or (elder.shiftPreference if elder else None) or "EIGHT_HOUR_DAY"
        start_time, end_time = AttendanceService._compute_shift_schedule(shift_type, daily_routine)

        new_shift = CareShift(
            elderId=asg.elder_id,
            caregiverId=user.id,
            shiftType=shift_type,
            status="SCHEDULED",
            scheduledStart=start_time,
            scheduledEnd=end_time,
            geofenceRadiusMeters=200.0,
            supervisorNotes=f"Auto-scheduled shift based on active CareAssignment #{asg.id} ({shift_type})."
        )
        db.add(new_shift)
        await db.commit()
        await db.refresh(new_shift)
        return new_shift

    @staticmethod
    async def get_elder_active_shift(db: AsyncSession, elder_id: str) -> Optional[CareShift]:
        """Fetch the current active shift for an elder."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        result = await db.execute(
            select(CareShift)
            .where(
                CareShift.elderId == elder_id,
                CareShift.status.in_(["ACTIVE", "CHECKED_IN", "EXCEPTION", "SCHEDULED", "LATE", "CHECKED_OUT"])
            )
            .order_by(CareShift.createdAt.desc())
        )
        shift = result.scalars().first()
        if shift:
            return shift

        # If no shift yet, check if elder has an active assignment
        asg_res = await db.execute(
            select(CareAssignment).where(
                CareAssignment.elder_id == elder_id,
                CareAssignment.status.in_(["ACTIVE", "SERVICE_CONFIRMED"])
            )
        )
        asg = asg_res.scalars().first()
        if not asg:
            return None

        # Find caregiver directory record
        cg_res = await db.execute(select(Caregiver).where(Caregiver.id == asg.caregiver_id))
        cg = cg_res.scalar_one_or_none()
        if not cg:
            return None

        # Find or create corresponding caregiver user
        user_res = await db.execute(
            select(User).where(
                (User.phone == cg.phone) | (User.fullName == cg.full_name)
            )
        )
        cg_user = user_res.scalars().first()
        if not cg_user:
            cg_user = User(
                role="CAREGIVER",
                fullName=cg.full_name,
                phone=cg.phone or "+919876500001",
                email=f"caregiver.{cg.id}@careconnect.in",
                authProvider="PHONE_OTP"
            )
            db.add(cg_user)
            await db.flush()

        elder_res = await db.execute(select(Elder).where(Elder.id == elder_id))
        elder = elder_res.scalar_one_or_none()
        daily_routine = elder.dailyRoutine if (elder and isinstance(elder.dailyRoutine, dict)) else {}
        shift_type = asg.shift_type or (elder.shiftPreference if elder else None) or "EIGHT_HOUR_DAY"
        start_time, end_time = AttendanceService._compute_shift_schedule(shift_type, daily_routine)

        new_shift = CareShift(
            elderId=elder_id,
            caregiverId=cg_user.id,
            shiftType=shift_type,
            status="SCHEDULED",
            scheduledStart=start_time,
            scheduledEnd=end_time,
            geofenceRadiusMeters=200.0,
            supervisorNotes=f"Auto-scheduled shift based on active CareAssignment #{asg.id} ({shift_type})."
        )
        db.add(new_shift)
        await db.commit()
        await db.refresh(new_shift)
        return new_shift

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
        sched_start = shift.scheduledStart
        if sched_start is not None:
            if sched_start.tzinfo is None:
                sched_start = sched_start.replace(tzinfo=timezone.utc)
            if now > sched_start + timedelta(minutes=15) and shift.status == "ACTIVE":
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

