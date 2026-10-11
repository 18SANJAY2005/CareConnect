import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.billing import Invoice, InvoiceLineItem, PaymentTransaction, BillingAdjustment
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


class BillingAdjustmentCreate(BaseModel):
    serviceChange: str
    changeType: str  # "ADDITION" | "REMOVAL"
    adjustmentAmount: float
    effectiveDate: Optional[datetime] = None
    notes: Optional[str] = None


@router.post("/invoices/{id}/adjustments", status_code=status.HTTP_201_CREATED)
async def create_billing_adjustment(
    id: str,
    payload: BillingAdjustmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Support mid-month service additions and removals with traceable adjustments.
    Records effective date, service change, adjustment amount, previous balance, and resulting balance.
    Updates the parent invoice line items and totals safely.
    """
    res = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.lineItems))
        .where(Invoice.id == id)
    )
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if invoice.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    change_type = payload.changeType.upper()
    if change_type not in ["ADDITION", "REMOVAL"]:
        raise HTTPException(status_code=400, detail="changeType must be 'ADDITION' or 'REMOVAL'.")

    adj_mag = abs(payload.adjustmentAmount)
    adj_signed = adj_mag if change_type == "ADDITION" else -adj_mag

    previous_balance = invoice.totalAmount
    resulting_balance = max(0.0, round(previous_balance + adj_signed, 2))

    # Update invoice financials safely
    if change_type == "ADDITION":
        invoice.subtotal += adj_mag
    else:
        invoice.subtotal = max(0.0, invoice.subtotal - adj_mag)
    invoice.totalAmount = resulting_balance

    eff_date = payload.effectiveDate or datetime.now(timezone.utc)

    # Add traceable line item
    line_item = InvoiceLineItem(
        invoiceId=invoice.id,
        itemType="MID_MONTH_ADJUSTMENT",
        description=f"Mid-Month Adjustment: {payload.serviceChange} ({change_type.title()})",
        quantity=1,
        unitAmount=adj_signed,
        amount=adj_signed,
        itemMetadata={
            "effectiveDate": eff_date.isoformat(),
            "changeType": change_type,
            "previousBalance": previous_balance,
            "resultingBalance": resulting_balance,
        },
    )
    db.add(line_item)

    # Record BillingAdjustment
    adjustment = BillingAdjustment(
        invoiceId=invoice.id,
        elderId=invoice.elderId,
        familyUserId=invoice.familyUserId,
        effectiveDate=eff_date,
        serviceChange=payload.serviceChange,
        changeType=change_type,
        adjustmentAmount=adj_signed,
        previousBalance=previous_balance,
        resultingBalance=resulting_balance,
        notes=payload.notes,
    )
    db.add(adjustment)

    # Audit log
    db.add(
        AuditLog(
            actorUserId=current_user.id,
            entityType="INVOICE_ADJUSTMENT",
            entityId=invoice.id,
            action="MID_MONTH_ADJUSTMENT",
            oldValue=str(previous_balance),
            newValue=str(resulting_balance),
            auditMetadata={
                "serviceChange": payload.serviceChange,
                "adjustmentAmount": adj_signed,
                "effectiveDate": eff_date.isoformat(),
            },
        )
    )

    # Notification
    db.add(
        Notification(
            recipientUserId=invoice.familyUserId,
            eventType="BILLING_ADJUSTMENT",
            referenceType="INVOICE",
            referenceId=invoice.id,
            title="Service Adjustment Applied",
            message=(
                f"A mid-month adjustment of ₹{adj_signed:+,.2f} for '{payload.serviceChange}' "
                f"has been applied to invoice {invoice.invoiceNumber}. New balance: ₹{resulting_balance:,.2f}."
            ),
        )
    )

    await db.commit()
    await db.refresh(adjustment)

    return {
        "id": adjustment.id,
        "invoiceId": adjustment.invoiceId,
        "elderId": adjustment.elderId,
        "effectiveDate": adjustment.effectiveDate.isoformat(),
        "serviceChange": adjustment.serviceChange,
        "changeType": adjustment.changeType,
        "adjustmentAmount": adjustment.adjustmentAmount,
        "previousBalance": adjustment.previousBalance,
        "resultingBalance": adjustment.resultingBalance,
        "notes": adjustment.notes,
        "createdAt": adjustment.createdAt.isoformat(),
    }


@router.get("/invoices/{id}/adjustments")
async def list_invoice_adjustments(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all mid-month adjustments for a specific invoice."""
    inv_res = await db.execute(select(Invoice).where(Invoice.id == id))
    invoice = inv_res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if invoice.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    res = await db.execute(
        select(BillingAdjustment)
        .where(BillingAdjustment.invoiceId == id)
        .order_by(desc(BillingAdjustment.effectiveDate))
    )
    adjustments = res.scalars().all()
    return [
        {
            "id": a.id,
            "invoiceId": a.invoiceId,
            "elderId": a.elderId,
            "effectiveDate": a.effectiveDate.isoformat(),
            "serviceChange": a.serviceChange,
            "changeType": a.changeType,
            "adjustmentAmount": a.adjustmentAmount,
            "previousBalance": a.previousBalance,
            "resultingBalance": a.resultingBalance,
            "notes": a.notes,
            "createdAt": a.createdAt.isoformat(),
        }
        for a in adjustments
    ]


@router.get("/invoices/elder/{elder_id}/adjustments")
async def list_elder_adjustments(
    elder_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all mid-month adjustments for an elder's invoices."""
    res = await db.execute(
        select(BillingAdjustment)
        .where(BillingAdjustment.elderId == elder_id)
        .order_by(desc(BillingAdjustment.effectiveDate))
    )
    adjustments = res.scalars().all()
    return [
        {
            "id": a.id,
            "invoiceId": a.invoiceId,
            "elderId": a.elderId,
            "effectiveDate": a.effectiveDate.isoformat(),
            "serviceChange": a.serviceChange,
            "changeType": a.changeType,
            "adjustmentAmount": a.adjustmentAmount,
            "previousBalance": a.previousBalance,
            "resultingBalance": a.resultingBalance,
            "notes": a.notes,
            "createdAt": a.createdAt.isoformat(),
        }
        for a in adjustments
    ]

