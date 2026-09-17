from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.incident import ChatSendMessageRequest, ChatMessageItem
from app.services.incident_service import ChatService

router = APIRouter(prefix="/chat", tags=["Coordinator Chat"])

@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    payload: ChatSendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send secure message to Care Coordinator."""
    msg = await ChatService.send_message(
        db=db,
        elder_id=payload.elderId,
        sender_id=current_user.id,
        content=payload.content,
        channel=payload.channel,
        recipient_id=payload.recipientId
    )
    return {
        "id": msg.id,
        "elderId": msg.elderId,
        "senderId": msg.senderId,
        "senderName": current_user.fullName,
        "senderRole": current_user.role,
        "channel": msg.channel,
        "content": msg.content,
        "isRead": msg.isRead,
        "createdAt": msg.createdAt.isoformat()
    }

@router.get("/messages", status_code=status.HTTP_200_OK)
async def get_chat_messages(
    elder_id: str,
    channel: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve chat history between family/caregiver and Chennai Care Coordinator."""
    messages = await ChatService.get_messages(db, elder_id, channel)
    return messages

