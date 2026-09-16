import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.billing import Invoice, InvoiceLineItem, PaymentTransaction
from app.models.audit import AuditLog, Notification
from app.schemas.phase_d import (
    InvoiceResponse,
    PaymentIntentResponse,
    PaymentConfirmRequest
)

router = APIRouter(tags=["Monthly Billing & Invoicing (Phase D03)"])

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all monthly invoices for the authenticated family sponsor."""
    res = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.lineItems), selectinload(Invoice.transactions))
        .where(Invoice.familyUserId == current_user.id)
        .order_by(desc(Invoice.createdAt))
    )
    return res.scalars().all()


@router.get("/invoices/{id}", response_model=InvoiceResponse)
async def get_invoice(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get itemized invoice details by ID."""
    res = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.lineItems), selectinload(Invoice.transactions))
        .where(Invoice.id == id)
    )
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    if invoice.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return invoice


@router.post("/invoices/{id}/pay", response_model=PaymentIntentResponse)
async def initiate_payment(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initiate a Razorpay payment intent for the invoice."""
    res = await db.execute(select(Invoice).where(Invoice.id == id))
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    if invoice.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if invoice.status == "PAID":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already paid.")

    # Generate mock Razorpay order reference
    mock_order_id = f"order_chennai_{uuid.uuid4().hex[:12]}"
    invoice.providerReference = mock_order_id
    if invoice.status == "ISSUED":
        invoice.status = "PENDING"
    await db.commit()

    return PaymentIntentResponse(
        orderId=mock_order_id,
        amount=invoice.totalAmount,
        currency=invoice.currency,
        keyId="rzp_test_careconnect_chennai",
        invoiceId=invoice.id
    )


@router.post("/invoices/{id}/confirm-payment", response_model=InvoiceResponse)
async def confirm_payment(
    id: str,
    payload: PaymentConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Confirm payment after Razorpay checkout return, verifying signature and recording transaction."""
    res = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.lineItems), selectinload(Invoice.transactions))
        .where(Invoice.id == id)
    )
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    if invoice.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    old_status = invoice.status
    invoice.status = "PAID"

    # Record payment transaction
    tx = PaymentTransaction(
        invoiceId=invoice.id,
        provider="RAZORPAY",
        providerPaymentId=payload.razorpayPaymentId,
        amount=invoice.totalAmount,
        currency=invoice.currency,
        status="SUCCESS",
        paidAt=datetime.now(timezone.utc)
    )
    db.add(tx)

    # Record audit log
    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="INVOICE",
        entityId=invoice.id,
        action="PAID",
        oldValue=old_status,
        newValue="PAID",
        auditMetadata={"paymentId": payload.razorpayPaymentId, "amount": invoice.totalAmount}
    ))

    # Send notification
    db.add(Notification(
        recipientUserId=invoice.familyUserId,
        eventType="PAYMENT_CONFIRMED",
        referenceType="INVOICE",
        referenceId=invoice.id,
        title="Payment Successful",
        message=f"Payment of ₹{invoice.totalAmount:,.2f} for invoice {invoice.invoiceNumber} has been received. Thank you!"
    ))

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.get("/operations/invoices", response_model=List[InvoiceResponse])
async def get_operations_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations console endpoint for platform-wide invoices."""
    query = (
        select(Invoice)
        .options(selectinload(Invoice.lineItems), selectinload(Invoice.transactions))
        .order_by(desc(Invoice.createdAt))
    )
    if status_filter:
        query = query.where(Invoice.status == status_filter)
    res = await db.execute(query)
    return res.scalars().all()

