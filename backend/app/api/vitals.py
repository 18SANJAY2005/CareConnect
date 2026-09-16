from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.vital import VitalReadingCreate, VitalReadingResponse, VitalAlertItem
from app.services.vitals_service import VitalsService

router = APIRouter(prefix="/vitals", tags=["Vitals & Health Tracker"])

@router.post("/", response_model=VitalReadingResponse, status_code=status.HTTP_201_CREATED)
async def record_vital_reading(
    payload: VitalReadingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Record elder vital reading with physiological validation and operational alert checks.
    Readings are treated strictly as monitoring measurements, not medical diagnoses.
    """
    reading = await VitalsService.record_vitals(
        db=db,
        elder_id=payload.elderId,
        recorded_by_id=current_user.id,
        shift_id=payload.shiftId,
        systolic_bp=payload.systolicBp,
        diastolic_bp=payload.diastolicBp,
        pulse=payload.pulse,
        blood_glucose=payload.bloodGlucose,
        glucose_context=payload.glucoseContext,
        temperature_celsius=payload.temperatureCelsius,
        source=payload.source,
        notes=payload.notes,
        idempotency_key=payload.idempotencyKey
    )
    return reading

@router.get("/elder/{elder_id}", response_model=List[VitalReadingResponse], status_code=status.HTTP_200_OK)
async def get_elder_vitals_history(
    elder_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve historical vitals readings for an elder."""
    readings = await VitalsService.get_elder_vitals_history(db, elder_id, limit)
    return readings

@router.get("/elder/{elder_id}/trends", status_code=status.HTTP_200_OK)
async def get_elder_vitals_trends(
    elder_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve structured trend data formatted for frontend chart visualization:
    - Blood pressure trend (systolic & diastolic series)
    - Blood glucose trend
    - Pulse rate trend
    - Temperature trend
    """
    readings = await VitalsService.get_elder_vitals_history(db, elder_id, limit=30)
    # Reverse to chronological order (oldest -> newest) for plotting
    chronological = list(reversed(readings))

    bp_series = []
    glucose_series = []
    pulse_series = []
    temp_series = []

    for r in chronological:
        time_label = r.recordedAt.strftime("%d %b, %H:%M")
        if r.systolicBp and r.diastolicBp:
            bp_series.append({
                "timestamp": time_label,
                "systolic": r.systolicBp,
                "diastolic": r.diastolicBp,
                "isAbnormal": r.isAbnormal
            })
        if r.bloodGlucose is not None:
            glucose_series.append({
                "timestamp": time_label,
                "glucose": r.bloodGlucose,
                "context": r.glucoseContext,
                "isAbnormal": r.isAbnormal
            })
        if r.pulse is not None:
            pulse_series.append({
                "timestamp": time_label,
                "pulse": r.pulse,
                "isAbnormal": r.isAbnormal
            })
        if r.temperatureCelsius is not None:
            temp_series.append({
                "timestamp": time_label,
                "temperature": r.temperatureCelsius,
                "isAbnormal": r.isAbnormal
            })

    latest = readings[0] if readings else None

    return {
        "bpTrend": bp_series,
        "glucoseTrend": glucose_series,
        "pulseTrend": pulse_series,
        "temperatureTrend": temp_series,
        "latestReading": {
            "systolicBp": latest.systolicBp if latest else None,
            "diastolicBp": latest.diastolicBp if latest else None,
            "pulse": latest.pulse if latest else None,
            "bloodGlucose": latest.bloodGlucose if latest else None,
            "glucoseContext": latest.glucoseContext if latest else None,
            "temperatureCelsius": latest.temperatureCelsius if latest else None,
            "isAbnormal": latest.isAbnormal if latest else False,
            "alertSeverity": latest.alertSeverity if latest else "NORMAL",
            "alertMessage": latest.alertMessage if latest else None,
            "recordedAt": latest.recordedAt.isoformat() if latest else None
        } if latest else None
    }

@router.get("/alerts", response_model=List[VitalAlertItem], status_code=status.HTTP_200_OK)
async def get_vital_alerts(
    db: AsyncSession = Depends(get_db)
):
    """Operations queue: Fetch active, unacknowledged abnormal vitals alerts."""
    alerts = await VitalsService.get_active_vital_alerts(db)
    return alerts

@router.post("/alerts/{vital_id}/acknowledge", status_code=status.HTTP_200_OK)
async def acknowledge_vital_alert(
    vital_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge an abnormal vital reading alert by Care Manager."""
    res = await VitalsService.acknowledge_alert(db, vital_id, current_user.id)
    return res

