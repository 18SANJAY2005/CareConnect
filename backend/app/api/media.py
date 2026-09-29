from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.authorization import verify_elder_access
from app.models.user import User
from app.schemas.incident import MediaUploadRequest, MediaResponse
from app.services.incident_service import MediaService

router = APIRouter(prefix="/media", tags=["Daily Care Media Updates"])

@router.post("/upload", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
async def upload_daily_media(
    payload: MediaUploadRequest,
    current_user: User = Depends(require_role(["CAREGIVER", "FAMILY_SPONSOR", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Upload approved daily photo/video update for family remote visibility with elder access validation."""
    await verify_elder_access(db, current_user, payload.elderId)

    media = await MediaService.upload_media(
        db=db,
        elder_id=payload.elderId,
        uploaded_by_id=current_user.id,
        media_url=payload.mediaUrl,
        media_type=payload.mediaType,
        category=payload.category,
        caption=payload.caption,
        shift_id=payload.shiftId
    )
    return media

@router.get("/elder/{elder_id}", response_model=List[MediaResponse], status_code=status.HTTP_200_OK)
async def get_elder_media_updates(
    elder_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetch approved daily media updates for authorized Family or Caregiver view."""
    await verify_elder_access(db, current_user, elder_id)
    media_items = await MediaService.get_elder_media(db, elder_id)
    return media_items
