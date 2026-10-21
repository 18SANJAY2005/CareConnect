import math
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.hospital import Hospital
from app.models.elder import Elder
from app.models.location import ElderLocation


INITIAL_CHENNAI_HOSPITALS = [
    {
        "id": "hosp_001",
        "name": "Fortis Malar Hospital",
        "address": "52 1st Main Rd, Gandhi Nagar, Adyar, Chennai 600020",
        "area": "South Chennai Corridor (Adyar)",
        "latitude": 13.0067,
        "longitude": 80.2575,
        "phone": "+91 44 4289 2222",
        "emergency_phone": "+91 44 4289 2200",
        "trauma_level": "24/7 Emergency & Acute Cardiac Care",
        "ambulance_available": True,
        "source": "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION",
    },
    {
        "id": "hosp_002",
        "name": "Kauvery Hospital Alwarpet",
        "address": "199 Luz Church Rd, Alwarpet, Chennai 600004",
        "area": "Mylapore Heritage Ward",
        "latitude": 13.0336,
        "longitude": 80.2625,
        "phone": "+91 44 4000 6000",
        "emergency_phone": "+91 44 4000 6666",
        "trauma_level": "Tertiary Geriatric Multi-Speciality & Neuro-ICU",
        "ambulance_available": True,
        "source": "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION",
    },
    {
        "id": "hosp_003",
        "name": "Apollo Hospital (Main Hub)",
        "address": "21 Greams Ln, Thousand Lights, Chennai 600006",
        "area": "Central Chennai (Greams Rd)",
        "latitude": 13.0604,
        "longitude": 80.2505,
        "phone": "+91 44 2829 0200",
        "emergency_phone": "+91 44 2829 3333",
        "trauma_level": "Apex Level 1 Trauma & Cardiology Hub",
        "ambulance_available": True,
        "source": "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION",
    },
    {
        "id": "hosp_004",
        "name": "Apollo Speciality Hospital OMR",
        "address": "05/639 Old Mahabalipuram Rd, Kandanchavadi, Chennai 600096",
        "area": "OMR Expressway Sector (Peripheral)",
        "latitude": 12.9667,
        "longitude": 80.2458,
        "phone": "+91 44 2496 1111",
        "emergency_phone": "+91 44 2496 9999",
        "trauma_level": "Level 1 Trauma & Comprehensive Oncology",
        "ambulance_available": True,
        "source": "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION",
    },
    {
        "id": "hosp_005",
        "name": "Dr. Kamakshi Memorial Hospital",
        "address": "1 Radial Rd, Dandeeswaram, Velachery, Chennai 600100",
        "area": "Velachery Tech Corridor",
        "latitude": 12.9463,
        "longitude": 80.2039,
        "phone": "+91 44 6630 0300",
        "emergency_phone": "+91 44 6630 0108",
        "trauma_level": "Comprehensive Emergency & Vascular Care",
        "ambulance_available": True,
        "source": "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION",
    },
    {
        "id": "hosp_006",
        "name": "MIOT International",
        "address": "4/112 Mount Poonamallee High Rd, Manapakkam, Chennai 600089",
        "area": "Guindy / Manapakkam Corridor",
        "latitude": 13.0232,
        "longitude": 80.1787,
        "phone": "+91 44 4200 2288",
        "emergency_phone": "+91 44 4200 2200",
        "trauma_level": "Level 1 Multi-Specialty Trauma & Orthopedics",
        "ambulance_available": True,
        "source": "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION",
    },
    {
        "id": "hosp_007",
        "name": "MGM Healthcare",
        "address": "72 Nelson Manickam Rd, Aminjikarai, Chennai 600029",
        "area": "Central West Chennai",
        "latitude": 13.0722,
        "longitude": 80.2185,
        "phone": "+91 44 4524 2424",
        "emergency_phone": "+91 44 4524 2400",
        "trauma_level": "24/7 Advanced Critical Care & Heart Center",
        "ambulance_available": True,
        "source": "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION",
    },
]


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two GPS coordinates using Haversine formula."""
    R = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


class HospitalService:
    @staticmethod
    async def seed_initial_hospitals_if_empty(db: AsyncSession) -> None:
        """Seed baseline verified Chennai hospital records if table is empty or missing key entries."""
        for h_data in INITIAL_CHENNAI_HOSPITALS:
            res = await db.execute(select(Hospital).where(Hospital.id == h_data["id"]))
            existing = res.scalars().first()
            if not existing:
                h = Hospital(
                    id=h_data["id"],
                    name=h_data["name"],
                    address=h_data["address"],
                    area=h_data["area"],
                    latitude=h_data["latitude"],
                    longitude=h_data["longitude"],
                    phone=h_data["phone"],
                    emergency_phone=h_data["emergency_phone"],
                    trauma_level=h_data["trauma_level"],
                    ambulance_available=h_data["ambulance_available"],
                    source=h_data["source"],
                    is_active=True,
                )
                db.add(h)
        await db.commit()

    @staticmethod
    async def list_hospitals(
        db: AsyncSession,
        search: Optional[str] = None,
        area: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Hospital]:
        """List active hospitals with optional search and area filters."""
        query = select(Hospital).where(Hospital.is_active.is_(True))

        if area and area.strip() and area.strip().upper() != "ALL":
            query = query.where(Hospital.area.ilike(f"%{area.strip()}%"))

        if search and search.strip():
            s = f"%{search.strip().lower()}%"
            query = query.where(
                (func.lower(Hospital.name).like(s))
                | (func.lower(Hospital.address).like(s))
                | (func.lower(Hospital.area).like(s))
            )

        query = query.order_by(Hospital.name.asc()).limit(limit).offset(offset)
        res = await db.execute(query)
        return list(res.scalars().all())

    @staticmethod
    async def get_nearby_hospitals(
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 15.0,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Find nearby active hospitals bounded by radius and sorted strictly by proximity.
        Uses valid coordinates and Haversine distance.
        """
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GPS coordinates provided for nearby hospital search.",
            )

        res = await db.execute(select(Hospital).where(Hospital.is_active.is_(True)))
        all_hospitals = res.scalars().all()

        nearby = []
        for h in all_hospitals:
            dist = calculate_haversine_distance(lat, lng, h.latitude, h.longitude)
            if dist <= radius_km:
                # Estimate driving ETA (roughly 2.5 mins per km in Chennai traffic)
                eta = max(3, int(round(dist * 2.8)))
                nearby.append({
                    "id": h.id,
                    "name": h.name,
                    "address": h.address,
                    "area": h.area,
                    "locality": h.area,
                    "latitude": h.latitude,
                    "longitude": h.longitude,
                    "phone": h.phone,
                    "emergencyPhone": h.emergency_phone or h.phone,
                    "distanceKm": dist,
                    "etaMins": eta,
                    "traumaLevel": h.trauma_level,
                    "ambulanceAvailable": h.ambulance_available,
                    "source": h.source,
                    "verificationStatus": "OFFICIALLY_VERIFIED" if h.source == "ABDM_HFR_VALIDATED" else "PENDING_REGULATORY_VALIDATION",
                    "isActive": h.is_active,
                })

        nearby.sort(key=lambda x: x["distanceKm"])
        return nearby[:limit]

    @staticmethod
    async def get_hospital_by_id(db: AsyncSession, hospital_id: str) -> Optional[Hospital]:
        """Fetch hospital by stable ID."""
        res = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
        return res.scalars().first()

    @staticmethod
    async def set_elder_preferred_hospital(
        db: AsyncSession,
        elder_id: str,
        hospital_id: Optional[str],
    ) -> Elder:
        """Assign or update the preferred hospital for an elder."""
        res = await db.execute(select(Elder).where(Elder.id == elder_id))
        elder = res.scalars().first()
        if not elder:
            raise HTTPException(status_code=404, detail="Elder profile not found.")

        if hospital_id:
            h_res = await db.execute(select(Hospital).where(Hospital.id == hospital_id, Hospital.is_active.is_(True)))
            hospital = h_res.scalars().first()
            if not hospital:
                raise HTTPException(status_code=404, detail="Selected hospital was not found or is currently inactive.")
            elder.preferred_hospital_id = hospital.id
        else:
            elder.preferred_hospital_id = None

        await db.commit()
        await db.refresh(elder)
        return elder
