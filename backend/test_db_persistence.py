import asyncio
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Windows + psycopg async event loop policy
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, engine
from app.models.user import User
from app.models.elder import Elder
from app.models.location import ElderLocation


async def test_persistence():
    print("=" * 65)
    print("CareConnect Live PostgreSQL Persistence Verification")
    print("=" * 65)
    print(f"Engine Dialect: {engine.dialect.name} | Driver: {engine.dialect.driver}")
    print(f"Target Database: {engine.url.database} at {engine.url.host}:{engine.url.port}")
    print("-" * 65)

    test_uid = uuid.uuid4().hex[:8]
    test_phone = f"+9199999{test_uid[:5]}"
    test_email = f"test.sponsor.{test_uid}@careconnect.test"
    test_elder_name = f"Test Elder {test_uid.upper()}"

    user_id = None
    elder_id = None
    location_id = None

    try:
        # -------------------------------------------------------------
        # STEP 1: Insert records in Session 1 and COMMIT
        # -------------------------------------------------------------
        print("\n[STEP 1] Inserting test entities into PostgreSQL...")
        async with AsyncSessionLocal() as session1:
            test_user = User(
                fullName=f"Test Sponsor {test_uid}",
                phone=test_phone,
                email=test_email,
                role="FAMILY_SPONSOR",
                authProvider="PHONE_OTP",
            )
            session1.add(test_user)
            await session1.flush()
            user_id = test_user.id
            print(f"  -> Created User: ID={user_id}, Phone={test_phone}")

            test_elder = Elder(
                familyId=user_id,
                name=test_elder_name,
                age=78,
                gender="FEMALE",
                mobilityLevel="CANE_WALKER",
                primaryLanguage="Tamil",
                medicalConditions=["Hypertension", "Mild Arthritis"],
                personaStatus="DRAFT",
            )
            session1.add(test_elder)
            await session1.flush()
            elder_id = test_elder.id
            print(f"  -> Created Elder: ID={elder_id}, Name='{test_elder_name}'")

            test_loc = ElderLocation(
                elderId=elder_id,
                addressLine1="12 Besant Avenue Road",
                locality="Besant Nagar",
                city="Chennai",
                state="Tamil Nadu",
                postalCode="600090",
                latitude=13.0001,
                longitude=80.2667,
                verificationStatus="VERIFIED",
                serviceable=True,
            )
            session1.add(test_loc)
            await session1.flush()
            location_id = test_loc.id
            print(f"  -> Created Location: ID={location_id}, Locality='Besant Nagar'")

            # Explicit commit to disk
            await session1.commit()
            print("  [SUCCESS] Transaction committed to PostgreSQL.")

        # -------------------------------------------------------------
        # STEP 2: Read back in a FRESH Session 2 to verify persistence
        # -------------------------------------------------------------
        print("\n[STEP 2] Opening fresh, independent database session to verify persistence...")
        async with AsyncSessionLocal() as session2:
            res_user = await session2.execute(select(User).where(User.id == user_id))
            loaded_user = res_user.scalar_one_or_none()
            assert loaded_user is not None, "Failed to retrieve user from database!"
            assert loaded_user.phone == test_phone, "User phone does not match!"
            print(f"  -> Verified User persisted: Name='{loaded_user.fullName}', Role='{loaded_user.role}'")

            res_elder = await session2.execute(select(Elder).where(Elder.id == elder_id))
            loaded_elder = res_elder.scalar_one_or_none()
            assert loaded_elder is not None, "Failed to retrieve elder from database!"
            assert loaded_elder.name == test_elder_name, "Elder name does not match!"
            assert loaded_elder.age == 78, "Elder age does not match!"
            assert "Hypertension" in loaded_elder.medicalConditions, "Elder conditions not stored properly!"
            print(f"  -> Verified Elder persisted: Name='{loaded_elder.name}', Age={loaded_elder.age}, Status='{loaded_elder.personaStatus}'")

            res_loc = await session2.execute(select(ElderLocation).where(ElderLocation.elderId == elder_id))
            loaded_loc = res_loc.scalar_one_or_none()
            assert loaded_loc is not None, "Failed to retrieve elder location from database!"
            assert loaded_loc.locality == "Besant Nagar", "Location locality mismatch!"
            assert loaded_loc.serviceable is True, "Serviceable flag mismatch!"
            print(f"  -> Verified Location persisted: Address='{loaded_loc.addressLine1}', City='{loaded_loc.city}', Serviceable={loaded_loc.serviceable}")

        # -------------------------------------------------------------
        # STEP 3: Update records in Session 3 and verify UPDATE persistence
        # -------------------------------------------------------------
        print("\n[STEP 3] Updating Elder record and verifying update persistence...")
        async with AsyncSessionLocal() as session3:
            res_elder = await session3.execute(select(Elder).where(Elder.id == elder_id))
            elder_to_update = res_elder.scalar_one()
            elder_to_update.personaStatus = "SAVED"
            elder_to_update.care_tier_needed = "TIER_2_ASSISTED"
            elder_to_update.shiftPreference = "TWELVE_HOUR_DAY"
            await session3.commit()
            print("  -> Updated personaStatus to 'SAVED' and careTier to 'TIER_2_ASSISTED'. Committed.")

        async with AsyncSessionLocal() as session4:
            res_elder = await session4.execute(select(Elder).where(Elder.id == elder_id))
            updated_elder = res_elder.scalar_one()
            assert updated_elder.personaStatus == "SAVED", "Updated status failed to persist!"
            assert updated_elder.care_tier_needed == "TIER_2_ASSISTED", "Updated care tier failed to persist!"
            print(f"  -> Verified updated record from fresh session: Status='{updated_elder.personaStatus}', Tier='{updated_elder.care_tier_needed}'")

        # -------------------------------------------------------------
        # STEP 4: Raw SQL count check on PostgreSQL
        # -------------------------------------------------------------
        print("\n[STEP 4] Executing raw SQL queries directly on PostgreSQL...")
        async with engine.connect() as conn:
            user_count = (await conn.execute(text("SELECT count(*) FROM users;"))).scalar()
            elder_count = (await conn.execute(text("SELECT count(*) FROM elders;"))).scalar()
            loc_count = (await conn.execute(text("SELECT count(*) FROM elder_locations;"))).scalar()
            print(f"  -> PostgreSQL Total Row Counts: Users={user_count}, Elders={elder_count}, Locations={loc_count}")

        # -------------------------------------------------------------
        # STEP 5: Clean up test records
        # -------------------------------------------------------------
        print("\n[STEP 5] Cleaning up test records...")
        async with AsyncSessionLocal() as session5:
            res_loc = await session5.execute(select(ElderLocation).where(ElderLocation.id == location_id))
            l = res_loc.scalar_one_or_none()
            if l:
                await session5.delete(l)

            res_elder = await session5.execute(select(Elder).where(Elder.id == elder_id))
            e = res_elder.scalar_one_or_none()
            if e:
                await session5.delete(e)

            res_user = await session5.execute(select(User).where(User.id == user_id))
            u = res_user.scalar_one_or_none()
            if u:
                await session5.delete(u)

            await session5.commit()
            print("  -> Cleaned up test records successfully.")

        print("\n" + "=" * 65)
        print("RESULT: ALL POSTGRESQL PERSISTENCE TESTS PASSED (100% CONFIRMED)")
        print("=" * 65)
        return True

    except Exception as e:
        print(f"\n[FAILURE] Persistence test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_persistence())
    sys.exit(0 if success else 1)
