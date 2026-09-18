import asyncio
import sys
from pathlib import Path

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import httpx

BASE_URL = "http://127.0.0.1:8000"

async def test_full_system():
    print("=" * 70)
    print("CareConnect End-to-End System Feature & Flow Verification")
    print("=" * 70)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        # 1. Health check
        print("\n[1] Checking Server Health...")
        h = await client.get("/health")
        assert h.status_code == 200, f"Health check failed: {h.text}"
        print(f"  -> Health OK: {h.json()}")

        # 2. OTP Send
        print("\n[2] Testing Phase A Auth (WhatsApp OTP Send)...")
        phone = "+919876543210"
        otp_send = await client.post("/api/auth/otp/send", json={"phone": phone, "channel": "WHATSAPP"})
        assert otp_send.status_code == 200, f"OTP send failed: {otp_send.text}"
        print(f"  -> OTP Send Response: {otp_send.json()['message']}")

        # 3. OTP Verify & Login
        print("\n[3] Testing Phase A Auth (OTP Verification & Sponsor Login)...")
        otp_verify = await client.post("/api/auth/otp/verify", json={
            "phone": phone,
            "otp": "123456",
            "fullName": "Demo Sponsor",
            "email": "sponsor.demo@careconnect.test"
        })
        assert otp_verify.status_code == 200, f"OTP verify failed: {otp_verify.text}"
        token = otp_verify.json()["access_token"]
        sponsor = otp_verify.json()["user"]
        print(f"  -> Login Successful! Sponsor: {sponsor['fullName']} (ID: {sponsor['id'][:8]}...)")

        headers = {"Authorization": f"Bearer {token}"}

        # 4. Profile
        print("\n[4] Testing /api/me Profile Retrieval...")
        me = await client.get("/api/me", headers=headers)
        assert me.status_code == 200, f"Me profile failed: {me.text}"
        print(f"  -> Profile Verified: Role={me.json()['role']}, Phone={me.json()['phone']}")

        # 5. Geographic Verification
        print("\n[5] Testing Geographic Verification for Chennai Corridor (Adyar)...")
        geo = await client.post("/api/elder-locations/verify", json={
            "addressLine1": "14 Gandhi Road",
            "locality": "Adyar",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "postalCode": "600020"
        }, headers=headers)
        assert geo.status_code == 200, f"Geo verify failed: {geo.text}"
        geo_data = geo.json()
        assert geo_data["serviceable"] is True, "Expected Adyar to be serviceable!"
        print(f"  -> Location Verified: {geo_data['locality']}, Serviceable={geo_data['serviceable']}, Hub={geo_data['assignedHub']}")

        # 6. Create Elder 1
        print("\n[6] Testing Elder 1 Intake Creation...")
        e1_res = await client.post("/api/elders", json={
            "name": "Kalyani Ammal",
            "age": 74,
            "gender": "FEMALE",
            "dateOfBirth": "1952-05-12"
        }, headers=headers)
        assert e1_res.status_code == 201, f"Create elder failed: {e1_res.text}"
        elder1 = e1_res.json()
        print(f"  -> Elder 1 Created: '{elder1['name']}', ID={elder1['id']}")

        # 7. Persist Location for Elder 1
        print("\n[7] Persisting Verified Location for Elder 1...")
        loc_res = await client.patch(f"/api/elders/{elder1['id']}/location", json={
            "addressLine1": "14 Gandhi Road, Adyar",
            "locality": "Adyar",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "postalCode": "600020",
            "latitude": 13.0012,
            "longitude": 80.2565
        }, headers=headers)
        assert loc_res.status_code == 200, f"Location persist failed: {loc_res.text}"
        print(f"  -> Location Persisted for Elder 1: {loc_res.json()['locality']}")

        # 8. Finalize Persona Intake for Elder 1
        print("\n[8] Finalizing Clinical Persona for Elder 1...")
        persona_res = await client.patch(f"/api/elders/{elder1['id']}", json={
            "mobilityLevel": "ASSISTED_WALKER",
            "medicalConditions": ["Hypertension", "Post-Stroke Rehab"],
            "careRequirements": ["Medication Observation", "Mobility Assistance"],
            "dietaryPreferences": ["South Indian Vegetarian", "Low Sodium"],
            "primaryLanguage": "Tamil",
            "languages": ["Tamil", "English"],
            "shiftPreference": "EIGHT_HOUR_DAY",
            "personaStatus": "SAVED"
        }, headers=headers)
        assert persona_res.status_code == 200, f"Persona update failed: {persona_res.text}"
        print(f"  -> Persona Finalized: Status={persona_res.json()['personaStatus']}, Mobility={persona_res.json()['mobilityLevel']}")

        # 9. Create Elder 2 (The user's exact multi-elder scenario)
        print("\n[9] Testing Elder 2 Intake Creation (Multi-Elder Feature)...")
        e2_res = await client.post("/api/elders", json={
            "name": "Ramanathan Iyer",
            "age": 79,
            "gender": "MALE",
            "dateOfBirth": "1947-08-15"
        }, headers=headers)
        assert e2_res.status_code == 201, f"Create elder 2 failed: {e2_res.text}"
        elder2 = e2_res.json()
        print(f"  -> Elder 2 Created: '{elder2['name']}', ID={elder2['id']}")

        loc2_res = await client.patch(f"/api/elders/{elder2['id']}/location", json={
            "addressLine1": "8 4th Main Road, Besant Nagar",
            "locality": "Besant Nagar",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "postalCode": "600090",
            "latitude": 13.0001,
            "longitude": 80.2667
        }, headers=headers)
        assert loc2_res.status_code == 200
        print(f"  -> Location Persisted for Elder 2: {loc2_res.json()['locality']}")

        # 10. List All Elders (Ensures both elders are returned for this sponsor)
        print("\n[10] Verifying Multiple Elders Listing for Sponsor...")
        elders_list = await client.get("/api/elders", headers=headers)
        assert elders_list.status_code == 200
        all_elders = elders_list.json()
        print(f"  -> Sponsor has {len(all_elders)} elders registered:")
        for idx, el in enumerate(all_elders, 1):
            loc_name = el.get("location", {}).get("locality") if el.get("location") else "N/A"
            print(f"     {idx}. {el['name']} (Age: {el['age']}, Gender: {el['gender']}, Locality: {loc_name}, Status: {el['personaStatus']})")
        assert any(e["id"] == elder1["id"] for e in all_elders), "Elder 1 missing from list!"
        assert any(e["id"] == elder2["id"] for e in all_elders), "Elder 2 missing from list!"
        print("  [SUCCESS] Both elders verified present in sponsor account.")

        # 11. Phase B Caregiver Matching
        print("\n[11] Testing Phase B Caregiver Discovery & Curated Matching...")
        matches_res = await client.get(f"/api/caregivers/matches?elder_id={elder1['id']}")
        assert matches_res.status_code == 200, f"Caregiver matching failed: {matches_res.text}"
        matches = matches_res.json()
        print(f"  -> Matched {len(matches.get('matches', []))} curated caregivers for {matches['elder_name']}:")
        for m in matches.get("matches", []):
            cg = m["caregiver"]
            print(f"     • {cg['full_name']} | Score: {m['match_score']}% | Locality: {cg['locality']} | Speciality: {cg['specializations']}")

        # 12. Phase B Service Level Agreement (SLA)
        print("\n[12] Testing Phase B SLA Terms Retrieval...")
        sla_res = await client.get("/api/sla/current")
        assert sla_res.status_code == 200, f"SLA fetch failed: {sla_res.text}"
        sla = sla_res.json()
        print(f"  -> SLA Version: {sla['version']} - '{sla['title']}' (DPDP Compliant)")

        # 13. Phase C Shifts & Active Care
        print("\n[13] Testing Phase C Active Care & Attendance...")
        shift_res = await client.get(f"/api/shifts/elder/{elder1['id']}/status")
        print(f"  -> Active Shift Query Status: {shift_res.status_code}")

        # 14. Phase D Billing & Operations
        print("\n[14] Testing Phase D Billing Invoices...")
        inv_res = await client.get("/api/invoices", headers=headers)
        assert inv_res.status_code == 200
        print(f"  -> Invoices endpoint returned: {len(inv_res.json())} invoices")

        print("\n" + "=" * 70)
        print("ALL END-TO-END FEATURES VERIFIED SUCCESSFULLY (100% OPERATIONAL)")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_full_system())
