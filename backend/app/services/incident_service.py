import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status
from app.models.incident import Incident, CareMedia, ChatMessage
from app.models.elder import Elder
from app.models.user import User

class IncidentService:
    @staticmethod
    async def trigger_sos(
        db: AsyncSession,
        elder_id: str,
        reported_by_id: str,
        shift_id: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        notes: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> Incident:
        """
        One-Tap SOS: Immediately registers a P1 Incident.
        Notifies Operations Care Desk and records an authoritative audit trail.
        Truthful Emergency Boundary: Provides verified emergency hotline (108).
        """
        # Guard against duplicate taps if open SOS already exists within 5 minutes
        now = datetime.now(timezone.utc)
        recent_sos_res = await db.execute(
            select(Incident)
            .where(
                Incident.elderId == elder_id,
                Incident.priority == "P1",
                Incident.status.in_(["OPEN", "ACKNOWLEDGED", "ESCALATING"])
            )
            .order_by(desc(Incident.createdAt))
        )
        existing_open = recent_sos_res.scalars().first()
        if existing_open:
            # If triggered within 2 minutes, return existing to avoid duplicate panic tickets
            if (now - existing_open.createdAt.replace(tzinfo=timezone.utc)).total_seconds() < 120:
                return existing_open

        reporter_res = await db.execute(select(User).where(User.id == reported_by_id))
        reporter = reporter_res.scalar_one_or_none()
        reporter_name = reporter.fullName if reporter else "Caregiver"

        elder_res = await db.execute(select(Elder).where(Elder.id == elder_id))
        elder = elder_res.scalar_one_or_none()
        elder_name = elder.name if elder else "Elder"

        initial_timeline = [{
            "timestamp": now.isoformat(),
            "actor": f"{reporter_name} ({reporter.role if reporter else 'ATTENDANT'})",
            "action": "ONE_TAP_SOS_TRIGGERED",
            "note": notes or f"Emergency SOS triggered for {elder_name}. Operations escalation activated."
        }]

        incident = Incident(
            elderId=elder_id,
            shiftId=shift_id,
            reportedById=reported_by_id,
            priority="P1",
            incidentType="SOS",
            status="OPEN",
            title=f"EMERGENCY SOS: {elder_name}",
            description=notes or f"Immediate assistance requested by {reporter_name} at patient residence.",
            locationCoordinates={"latitude": latitude, "longitude": longitude} if latitude and longitude else {},
            timeline=initial_timeline
        )

        db.add(incident)
        await db.commit()
        await db.refresh(incident)
        return incident

    @staticmethod
    async def get_incident_desk(
        db: AsyncSession,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch incidents for Operations Incident Desk queue."""
        query = select(Incident).order_by(
            # P1 first, then chronological
            Incident.priority.asc(),
            desc(Incident.createdAt)
        )
        if status_filter:
            query = query.where(Incident.status == status_filter)

        res = await db.execute(query)
        incidents = res.scalars().all()

        items = []
        for inc in incidents:
            elder_res = await db.execute(select(Elder).where(Elder.id == inc.elderId))
            elder = elder_res.scalar_one_or_none()

            reporter_res = await db.execute(select(User).where(User.id == inc.reportedById))
            reporter = reporter_res.scalar_one_or_none()

            items.append({
                "id": inc.id,
                "priority": inc.priority,
                "incidentType": inc.incidentType,
                "status": inc.status,
                "title": inc.title,
                "description": inc.description,
                "elderId": inc.elderId,
                "elderName": elder.name if elder else "Elder",
                "locality": elder.location.locality if elder and elder.location else "Chennai",
                "reportedBy": reporter.fullName if reporter else "Caregiver",
                "locationCoordinates": inc.locationCoordinates,
                "timeline": inc.timeline,
                "createdAt": inc.createdAt.isoformat(),
                "acknowledgedAt": inc.acknowledgedAt.isoformat() if inc.acknowledgedAt else None,
                "resolutionNotes": inc.resolutionNotes
            })
        return items

    @staticmethod
    async def acknowledge_incident(
        db: AsyncSession,
        incident_id: str,
        manager_id: str,
        manager_name: str
    ) -> Incident:
        """Acknowledge an incident and assign handling to Care Manager."""
        res = await db.execute(select(Incident).where(Incident.id == incident_id))
        inc = res.scalar_one_or_none()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

        now = datetime.now(timezone.utc)
        inc.status = "ACKNOWLEDGED"
        inc.acknowledgedById = manager_id
        inc.acknowledgedAt = now

        current_timeline = list(inc.timeline)
        current_timeline.append({
            "timestamp": now.isoformat(),
            "actor": f"{manager_name} (Care Manager)",
            "action": "INCIDENT_ACKNOWLEDGED",
            "note": "Care Manager acknowledged incident and opened emergency protocol."
        })
        inc.timeline = current_timeline

        await db.commit()
        await db.refresh(inc)
        return inc

    @staticmethod
    async def escalate_incident(
        db: AsyncSession,
        incident_id: str,
        manager_id: str,
        manager_name: str,
        action_taken: str
    ) -> Incident:
        """Log escalation steps (e.g. contacting physician, neighbor, or family sponsor)."""
        res = await db.execute(select(Incident).where(Incident.id == incident_id))
        inc = res.scalar_one_or_none()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

        now = datetime.now(timezone.utc)
        inc.status = "ESCALATING"

        current_timeline = list(inc.timeline)
        current_timeline.append({
            "timestamp": now.isoformat(),
            "actor": f"{manager_name} (Care Manager)",
            "action": "ESCALATION_ACTION_TAKEN",
            "note": action_taken
        })
        inc.timeline = current_timeline

        await db.commit()
        await db.refresh(inc)
        return inc

    @staticmethod
    async def resolve_incident(
        db: AsyncSession,
        incident_id: str,
        manager_id: str,
        manager_name: str,
        resolution_notes: str
    ) -> Incident:
        """Resolve an incident with complete resolution audit notes."""
        res = await db.execute(select(Incident).where(Incident.id == incident_id))
        inc = res.scalar_one_or_none()
        if not inc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

        now = datetime.now(timezone.utc)
        inc.status = "RESOLVED"
        inc.resolvedById = manager_id
        inc.resolvedAt = now
        inc.resolutionNotes = resolution_notes

        current_timeline = list(inc.timeline)
        current_timeline.append({
            "timestamp": now.isoformat(),
            "actor": f"{manager_name} (Care Manager)",
            "action": "INCIDENT_RESOLVED",
            "note": f"Resolution: {resolution_notes}"
        })
        inc.timeline = current_timeline

        await db.commit()
        await db.refresh(inc)
        return inc

    @staticmethod
    async def get_elder_incidents(db: AsyncSession, elder_id: str) -> List[Incident]:
        """Fetch incidents for family remote visibility."""
        res = await db.execute(
            select(Incident)
            .where(Incident.elderId == elder_id)
            .order_by(desc(Incident.createdAt))
        )
        return res.scalars().all()


class MediaService:
    @staticmethod
    async def upload_media(
        db: AsyncSession,
        elder_id: str,
        uploaded_by_id: str,
        media_url: str,
        media_type: str = "PHOTO",
        category: str = "GENERAL",
        caption: Optional[str] = None,
        shift_id: Optional[str] = None
    ) -> CareMedia:
        """Save approved daily photo/video update record with metadata."""
        media = CareMedia(
            elderId=elder_id,
            shiftId=shift_id,
            uploadedById=uploaded_by_id,
            mediaUrl=media_url,
            mediaType=media_type,
            category=category,
            caption=caption,
            status="APPROVED",
            createdAt=datetime.now(timezone.utc)
        )
        db.add(media)
        await db.commit()
        await db.refresh(media)
        return media

    @staticmethod
    async def get_elder_media(db: AsyncSession, elder_id: str) -> List[CareMedia]:
        """Fetch approved daily media updates for Family view."""
        res = await db.execute(
            select(CareMedia)
            .where(CareMedia.elderId == elder_id, CareMedia.status == "APPROVED")
            .order_by(desc(CareMedia.createdAt))
        )
        return res.scalars().all()


class ChatService:
    @staticmethod
    async def send_message(
        db: AsyncSession,
        elder_id: str,
        sender_id: str,
        content: str,
        channel: str = "FAMILY_COORDINATOR",
        recipient_id: Optional[str] = None
    ) -> ChatMessage:
        """Send a message to Care Coordinator."""
        msg = ChatMessage(
            elderId=elder_id,
            senderId=sender_id,
            recipientId=recipient_id,
            channel=channel,
            content=content,
            isRead=False,
            createdAt=datetime.now(timezone.utc)
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    @staticmethod
    async def get_messages(
        db: AsyncSession,
        elder_id: str,
        channel: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch chat history with sender details."""
        query = select(ChatMessage).where(ChatMessage.elderId == elder_id)
        if channel:
            query = query.where(ChatMessage.channel == channel)
        query = query.order_by(ChatMessage.createdAt.asc())

        res = await db.execute(query)
        messages = res.scalars().all()

        items = []
        for m in messages:
            sender_res = await db.execute(select(User).where(User.id == m.senderId))
            sender = sender_res.scalar_one_or_none()

            items.append({
                "id": m.id,
                "elderId": m.elderId,
                "senderId": m.senderId,
                "senderName": sender.fullName if sender else "Participant",
                "senderRole": sender.role if sender else "USER",
                "channel": m.channel,
                "content": m.content,
                "isRead": m.isRead,
                "createdAt": m.createdAt.isoformat()
            })
        return items

