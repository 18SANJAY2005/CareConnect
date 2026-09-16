from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PaymentOrderCreate(BaseModel):
    assignment_id: int
    sponsor_id: int
    base_tier_amount: float = 14000.0  # 7-Day trial advance deposit
    addon_amount: float = 1000.0       # Specialist support / Medical kit
    currency: str = "INR"


class PaymentOrderResponse(BaseModel):
    order_id: int
    provider_order_id: str
    amount: float
    currency: str
    base_tier_amount: float
    addon_amount: float
    tax_amount: float
    status: str
    key_id: str
    receipt: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentVerifyRequest(BaseModel):
    assignment_id: int
    sponsor_id: int
    provider_order_id: str
    provider_payment_id: str
    signature: str
    payment_method: str = "UPI"


class PaymentVerifyResponse(BaseModel):
    status: str
    is_confirmed: bool
    payment_id: int
    provider_payment_id: str
    amount: float
    currency: str
    confirmed_at: datetime
    receipt_url: str
    assignment_status: str

