from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.payment import Payment, PaymentOrder
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.services.payment_service import (
    create_payment_order,
    confirm_payment,
)


router = APIRouter(
    prefix="/payments",
    tags=["Payments & Advance Deposit (Razorpay)"],
)


@router.post(
    "/orders",
    response_model=PaymentOrderResponse,
)
async def create_order(
    req: PaymentOrderCreate,
    db: AsyncSession = Depends(get_db),
):
    """Creates a server-side advance deposit payment order."""

    try:
        return await create_payment_order(
            db,
            req,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@router.post(
    "/verify",
    response_model=PaymentVerifyResponse,
)
async def verify_payment(
    req: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verifies payment and activates PAYMENT_CONFIRMED."""

    try:
        return await confirm_payment(
            db,
            req,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@router.get("/{payment_id}")
async def get_payment_details(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves payment confirmation and receipt summary."""

    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id
        )
    )

    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment record not found",
        )

    result = await db.execute(
        select(PaymentOrder).where(
            PaymentOrder.provider_order_id
            == payment.provider_order_id
        )
    )

    order = result.scalar_one_or_none()

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
        "receipt": order.receipt if order else None,
    }
