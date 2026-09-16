from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.assignment import CareAssignment
from app.models.caregiver import Caregiver
from app.schemas.assignment import AssignmentCreate, AssignmentResponse, AssignmentStatusUpdate
from app.schemas.caregiver import CaregiverResponse

router = APIRouter(prefix="/assignments", tags=["Care Assignments"])


@router.post("", response_model=AssignmentResponse)
def create_care_assignment(req: AssignmentCreate, db: Session = Depends(get_db)):
    """Creates a pending selected-caregiver assignment for the elder."""
    cg = db.query(Caregiver).filter(Caregiver.id == req.caregiver_id).first()
    if not cg:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    assignment = CareAssignment(
        elder_id=req.elder_id,
        caregiver_id=req.caregiver_id,
        sponsor_id=req.sponsor_id,
        shift_type=req.shift_type,
        start_date=req.start_date,
        notes=req.notes,
        status="CAREGIVER_SELECTED"
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    resp = AssignmentResponse.model_validate(assignment)
    resp.caregiver = CaregiverResponse.model_validate(cg)
    return resp


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_care_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """Retrieves care assignment details including current status and selected caregiver."""
    assignment = db.query(CareAssignment).filter(CareAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    cg = db.query(Caregiver).filter(Caregiver.id == assignment.caregiver_id).first()
    resp = AssignmentResponse.model_validate(assignment)
    if cg:
        resp.caregiver = CaregiverResponse.model_validate(cg)
    return resp


@router.patch("/{assignment_id}/status", response_model=AssignmentResponse)
def update_assignment_status(assignment_id: int, req: AssignmentStatusUpdate, db: Session = Depends(get_db)):
    """Updates the status of an ongoing care assignment."""
    assignment = db.query(CareAssignment).filter(CareAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.status = req.status
    if req.notes:
        assignment.notes = req.notes
    db.commit()
    db.refresh(assignment)

    cg = db.query(Caregiver).filter(Caregiver.id == assignment.caregiver_id).first()
    resp = AssignmentResponse.model_validate(assignment)
    if cg:
        resp.caregiver = CaregiverResponse.model_validate(cg)
    return resp

