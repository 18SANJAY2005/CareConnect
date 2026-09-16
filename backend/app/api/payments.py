from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.payment import Payment, PaymentOrder
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.services.payment_service import create_payment_order, confirm_payment

router = APIRouter(prefix="/payments", tags=["Payments & Advance Deposit (Razorpay)"])


@router.post("/orders", response_model=PaymentOrderResponse)
def create_order(req: PaymentOrderCreate, db: Session = Depends(get_db)):
    """Creates a server-side advance deposit order via Razorpay / Sandbox."""
    try:
        return create_payment_order(db, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify", response_model=PaymentVerifyResponse)
def verify_payment(req: PaymentVerifyRequest, db: Session = Depends(get_db)):
    """Verifies Razorpay payment signature and activates PAYMENT_CONFIRMED status."""
    try:
        return confirm_payment(db, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{payment_id}")
def get_payment_details(payment_id: int, db: Session = Depends(get_db)):
    """Retrieves payment confirmation record and receipt summary."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    order = db.query(PaymentOrder).filter(PaymentOrder.provider_order_id == payment.provider_order_id).first()

    return {
        "payment_id": payment.id,
        "assignment_id": payment.assignment_id,
        "provider_order_id": payment.provider_order_id,
        "provider_payment_id": payment.provider_payment_id,
        "amount": payment.amount,
        "currency": payment.currency,
        "payment_method": payment.payment_method,
        "status": payment.status,
        "confirmed_at": payment.confirmed_at,
        "receipt": order.receipt if order else None
    }

