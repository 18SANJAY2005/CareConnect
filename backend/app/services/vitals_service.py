import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status
from app.models.vital import VitalReading
from app.models.elder import Elder
from app.models.user import User

class VitalsService:
    @staticmethod
    def validate_physiological_ranges(
        systolic_bp: Optional[int] = None,
        diastolic_bp: Optional[int] = None,
        pulse: Optional[int] = None,
        blood_glucose: Optional[float] = None,
        temperature_celsius: Optional[float] = None
    ):
        """Ensure entered readings conform to valid human physiological limits."""
        if systolic_bp is not None and not (50 <= systolic_bp <= 260):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Systolic BP ({systolic_bp} mmHg) is outside valid physiological range (50-260 mmHg)."
            )
        if diastolic_bp is not None and not (30 <= diastolic_bp <= 150):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Diastolic BP ({diastolic_bp} mmHg) is outside valid physiological range (30-150 mmHg)."
            )
        if systolic_bp is not None and diastolic_bp is not None and systolic_bp <= diastolic_bp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Systolic BP ({systolic_bp}) must be greater than Diastolic BP ({diastolic_bp})."
            )
        if pulse is not None and not (30 <= pulse <= 220):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pulse ({pulse} bpm) is outside valid physiological range (30-220 bpm)."
            )
        if blood_glucose is not None and not (20.0 <= blood_glucose <= 600.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Blood glucose ({blood_glucose} mg/dL) is outside valid range (20-600 mg/dL)."
            )
        if temperature_celsius is not None and not (32.0 <= temperature_celsius <= 43.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Body temperature ({temperature_celsius} °C) is outside valid range (32.0-43.0 °C)."
            )

    @staticmethod
    def evaluate_operational_alerts(
        systolic_bp: Optional[int] = None,
        diastolic_bp: Optional[int] = None,
        pulse: Optional[int] = None,
        blood_glucose: Optional[float] = None,
        glucose_context: Optional[str] = "RANDOM",
        temperature_celsius: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluate readings against configurable operational threshold rules.
        Labels readings strictly as measurements for active monitoring, not clinical diagnoses.
        """
        alerts = []
        severity = "NORMAL"

        # Blood Pressure Thresholds
        if systolic_bp is not None or diastolic_bp is not None:
            if (systolic_bp and systolic_bp >= 180) or (diastolic_bp and diastolic_bp >= 120):
                severity = "CRITICAL"
                alerts.append(f"Elevated Blood Pressure measurement ({systolic_bp}/{diastolic_bp} mmHg) exceeds critical threshold.")
            elif (systolic_bp and systolic_bp > 140) or (diastolic_bp and diastolic_bp > 90):
                if severity != "CRITICAL":
                    severity = "WARNING"
                alerts.append(f"Blood Pressure measurement ({systolic_bp}/{diastolic_bp} mmHg) exceeds standard upper limit.")
            elif (systolic_bp and systolic_bp < 90) or (diastolic_bp and diastolic_bp < 60):
                if severity != "CRITICAL":
                    severity = "WARNING"
                alerts.append(f"Low Blood Pressure measurement ({systolic_bp}/{diastolic_bp} mmHg).")

        # Pulse Thresholds
        if pulse is not None:
            if pulse > 120 or pulse < 45:
                severity = "CRITICAL"
                alerts.append(f"Pulse rate ({pulse} bpm) exceeds critical limit.")
            elif pulse > 100 or pulse < 50:
                if severity != "CRITICAL":
                    severity = "WARNING"
                alerts.append(f"Abnormal pulse reading ({pulse} bpm).")

        # Blood Glucose Thresholds
        if blood_glucose is not None:
            ctx = glucose_context or "RANDOM"
            if ctx == "FASTING":
                if blood_glucose > 180 or blood_glucose < 60:
                    severity = "CRITICAL"
                    alerts.append(f"Fasting blood glucose ({blood_glucose} mg/dL) at critical variance.")
                elif blood_glucose > 126 or blood_glucose < 70:
                    if severity != "CRITICAL":
                        severity = "WARNING"
                    alerts.append(f"Elevated fasting glucose reading ({blood_glucose} mg/dL).")
            elif ctx == "POST_PRANDIAL":
                if blood_glucose > 250 or blood_glucose < 60:
                    severity = "CRITICAL"
                    alerts.append(f"Post-meal glucose reading ({blood_glucose} mg/dL) at critical variance.")
                elif blood_glucose > 200 or blood_glucose < 70:
                    if severity != "CRITICAL":
                        severity = "WARNING"
                    alerts.append(f"Elevated post-meal glucose reading ({blood_glucose} mg/dL).")
            else: # RANDOM
                if blood_glucose > 250 or blood_glucose < 60:
                    severity = "CRITICAL"
                    alerts.append(f"Random blood glucose ({blood_glucose} mg/dL) at critical variance.")
                elif blood_glucose > 180 or blood_glucose < 70:
                    if severity != "CRITICAL":
                        severity = "WARNING"
                    alerts.append(f"Random glucose reading ({blood_glucose} mg/dL) outside normal range.")

        # Temperature Thresholds
        if temperature_celsius is not None:
            if temperature_celsius >= 39.0: # >= 102.2 F
                severity = "CRITICAL"
                alerts.append(f"High fever reading ({temperature_celsius} °C).")
            elif temperature_celsius >= 37.8: # >= 100 F
                if severity != "CRITICAL":
                    severity = "WARNING"
                alerts.append(f"Low-grade fever reading ({temperature_celsius} °C).")
            elif temperature_celsius < 35.5:
                if severity != "CRITICAL":
                    severity = "WARNING"
                alerts.append(f"Low body temperature measurement ({temperature_celsius} °C).")

        is_abnormal = (severity != "NORMAL")
        alert_msg = " | ".join(alerts) if alerts else None

        return {
            "isAbnormal": is_abnormal,
            "alertSeverity": severity,
            "alertMessage": alert_msg
        }

    @staticmethod
    async def record_vitals(
        db: AsyncSession,
        elder_id: str,
        recorded_by_id: str,
        shift_id: Optional[str] = None,
        systolic_bp: Optional[int] = None,
        diastolic_bp: Optional[int] = None,
        pulse: Optional[int] = None,
        blood_glucose: Optional[float] = None,
        glucose_context: Optional[str] = "RANDOM",
        temperature_celsius: Optional[float] = None,
        source: str = "MANUAL",
        notes: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> VitalReading:
        """Record and validate vital readings with operational alert evaluation. Idempotency protected."""
        if idempotency_key:
            res_idemp = await db.execute(select(VitalReading).where(VitalReading.idempotencyKey == idempotency_key))
            existing = res_idemp.scalar_one_or_none()
            if existing:
                return existing

        # Validate physiological ranges
        VitalsService.validate_physiological_ranges(
            systolic_bp=systolic_bp,
            diastolic_bp=diastolic_bp,
            pulse=pulse,
            blood_glucose=blood_glucose,
            temperature_celsius=temperature_celsius
        )

        # Operational alert check
        alert_eval = VitalsService.evaluate_operational_alerts(
            systolic_bp=systolic_bp,
            diastolic_bp=diastolic_bp,
            pulse=pulse,
            blood_glucose=blood_glucose,
            glucose_context=glucose_context,
            temperature_celsius=temperature_celsius
        )

        reading = VitalReading(
            elderId=elder_id,
            shiftId=shift_id,
            recordedById=recorded_by_id,
            recordedAt=datetime.now(timezone.utc),
            systolicBp=systolic_bp,
            diastolicBp=diastolic_bp,
            pulse=pulse,
            bloodGlucose=blood_glucose,
            glucoseContext=glucose_context,
            temperatureCelsius=temperature_celsius,
            source=source,
            isAbnormal=alert_eval["isAbnormal"],
            alertSeverity=alert_eval["alertSeverity"],
            alertMessage=alert_eval["alertMessage"],
            alertAcknowledged=False,
            notes=notes,
            idempotencyKey=idempotency_key
        )

        db.add(reading)
        await db.commit()
        await db.refresh(reading)
        return reading

    @staticmethod
    async def get_elder_vitals_history(db: AsyncSession, elder_id: str, limit: int = 50) -> List[VitalReading]:
        """Fetch chronological vitals readings for an elder."""
        res = await db.execute(
            select(VitalReading)
            .where(VitalReading.elderId == elder_id)
            .order_by(desc(VitalReading.recordedAt))
            .limit(limit)
        )
        return res.scalars().all()

    @staticmethod
    async def get_active_vital_alerts(db: AsyncSession) -> List[Dict[str, Any]]:
        """Fetch all unacknowledged vital alerts for Operations/Care Manager queue."""
        res = await db.execute(
            select(VitalReading)
            .where(VitalReading.isAbnormal == True, VitalReading.alertAcknowledged == False)
            .order_by(desc(VitalReading.recordedAt))
        )
        alerts = res.scalars().all()

        alert_items = []
        for v in alerts:
            elder_res = await db.execute(select(Elder).where(Elder.id == v.elderId))
            elder = elder_res.scalar_one_or_none()

            rec_res = await db.execute(select(User).where(User.id == v.recordedById))
            rec = rec_res.scalar_one_or_none()

            alert_items.append({
                "id": v.id,
                "elderId": v.elderId,
                "elderName": elder.name if elder else "Elder",
                "locality": elder.location.locality if elder and elder.location else "Chennai",
                "recordedAt": v.recordedAt.isoformat(),
                "severity": v.alertSeverity,
                "message": v.alertMessage,
                "readings": {
                    "bloodPressure": f"{v.systolicBp}/{v.diastolicBp}" if v.systolicBp else None,
                    "pulse": v.pulse,
                    "bloodGlucose": v.bloodGlucose,
                    "glucoseContext": v.glucoseContext,
                    "temperature": v.temperatureCelsius
                },
                "recordedBy": rec.fullName if rec else "Caregiver"
            })
        return alert_items

    @staticmethod
    async def acknowledge_alert(db: AsyncSession, vital_id: str, user_id: str) -> Dict[str, Any]:
        """Operations Care Manager acknowledges an operational vital alert."""
        res = await db.execute(select(VitalReading).where(VitalReading.id == vital_id))
        reading = res.scalar_one_or_none()
        if not reading:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vital reading not found")

        reading.alertAcknowledged = True
        reading.acknowledgedById = user_id
        reading.acknowledgedAt = datetime.now(timezone.utc)
        await db.commit()
        return {"success": True, "message": "Vital alert acknowledged by Care Manager."}

