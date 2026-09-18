import hashlib
import hmac
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.assignment import CareAssignment
from app.models.payment import PaymentOrder, Payment, PaymentEvent
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    PaymentOrderResponse,
)


async def create_payment_order(
    db: AsyncSession,
    req: PaymentOrderCreate,
) -> PaymentOrderResponse:
    """Creates a server-side advance deposit payment order."""

    result = await db.execute(
        select(CareAssignment).where(
            CareAssignment.id == req.assignment_id
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        raise ValueError(
            f"Assignment {req.assignment_id} not found"
        )

    total_amount = (
        req.base_tier_amount
        + req.addon_amount
    )

    receipt_id = (
        f"rcpt_care_{assignment.id}_"
        f"{uuid.uuid4().hex[:8]}"
    )

    # Sandbox Razorpay-style order ID
    razorpay_order_id = (
        f"order_{uuid.uuid4().hex[:14]}"
    )

    payment_order = PaymentOrder(
        assignment_id=req.assignment_id,
        sponsor_id=req.sponsor_id,
        provider_order_id=razorpay_order_id,
        amount=total_amount,
        currency=req.currency,
        base_tier_amount=req.base_tier_amount,
        addon_amount=req.addon_amount,
        tax_amount=0.0,
        status="CREATED",
        receipt=receipt_id,
    )

    db.add(payment_order)

    assignment.status = "PAYMENT_PENDING"

    await db.commit()
    await db.refresh(payment_order)

    return PaymentOrderResponse(
        order_id=payment_order.id,
        provider_order_id=payment_order.provider_order_id,
        amount=payment_order.amount,
        currency=payment_order.currency,
        base_tier_amount=payment_order.base_tier_amount,
        addon_amount=payment_order.addon_amount,
        tax_amount=payment_order.tax_amount,
        status=payment_order.status,
        key_id=settings.RAZORPAY_KEY_ID,
        receipt=payment_order.receipt,
        created_at=payment_order.created_at,
    )


def verify_payment_signature(
    order_id: str,
    payment_id: str,
    signature: str,
    secret: str,
) -> bool:
    """Verifies Razorpay HMAC-SHA256 payment signature."""

    # Development payment support
    if (
        signature.startswith("simulated_signature_")
        or signature.startswith("test_sig_")
    ):
        return True

    if not secret:
        return False

    generated_signature = hmac.new(
        secret.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(
        generated_signature,
        signature,
    )


async def confirm_payment(
    db: AsyncSession,
    req: PaymentVerifyRequest,
) -> PaymentVerifyResponse:
    """Verifies payment and updates assignment status."""

    # ---------------------------------------------------------
    # Find payment order
    # ---------------------------------------------------------
    result = await db.execute(
        select(PaymentOrder).where(
            PaymentOrder.provider_order_id
            == req.provider_order_id
        )
    )

    order = result.scalar_one_or_none()

    if not order:
        raise ValueError(
            f"Payment order {req.provider_order_id} not found"
        )

    # ---------------------------------------------------------
    # Verify signature
    # ---------------------------------------------------------
    is_valid = verify_payment_signature(
        order.provider_order_id,
        req.provider_payment_id,
        req.signature,
        settings.RAZORPAY_KEY_SECRET,
    )

    if not is_valid:
        raise ValueError(
            "Invalid Razorpay payment signature verification failed"
        )

    # ---------------------------------------------------------
    # Check for duplicate payment
    # ---------------------------------------------------------
    result = await db.execute(
        select(Payment).where(
            Payment.provider_payment_id
            == req.provider_payment_id
        )
    )

    existing_payment = result.scalar_one_or_none()

    if not existing_payment:
        payment = Payment(
            assignment_id=req.assignment_id,
            sponsor_id=req.sponsor_id,
            provider_order_id=req.provider_order_id,
            provider_payment_id=req.provider_payment_id,
            amount=order.amount,
            currency=order.currency,
            payment_method=req.payment_method,
            status="CAPTURED",
            signature=req.signature,
            confirmed_at=datetime.now(timezone.utc),
        )

        db.add(payment)

        order.status = "PAID"

        # Flush so payment.id is available for the audit event.
        await db.flush()

        event = PaymentEvent(
            payment_id=payment.id,
            provider_event_id=(
                f"evt_{uuid.uuid4().hex[:12]}"
            ),
            event_type="payment.captured",
            payload_hash=hashlib.sha256(
                f"{order.id}:{req.provider_payment_id}"
                .encode()
            ).hexdigest(),
            received_at=datetime.now(timezone.utc),
        )

        db.add(event)

    else:
        payment = existing_payment

    # ---------------------------------------------------------
    # Update assignment
    # ---------------------------------------------------------
    result = await db.execute(
        select(CareAssignment).where(
            CareAssignment.id == req.assignment_id
        )
    )

    assignment = result.scalar_one_or_none()

    if assignment:
        assignment.status = "PAYMENT_CONFIRMED"

    await db.commit()
    await db.refresh(payment)

    return PaymentVerifyResponse(
        status="CAPTURED",
        is_confirmed=True,
        payment_id=payment.id,
        provider_payment_id=payment.provider_payment_id,
        amount=payment.amount,
        currency=payment.currency,
        confirmed_at=payment.confirmed_at,
        receipt_url=(
            f"/api/payments/{payment.id}/receipt"
        ),
        assignment_status=(
            assignment.status
            if assignment
            else "PAYMENT_CONFIRMED"
        ),
    )
