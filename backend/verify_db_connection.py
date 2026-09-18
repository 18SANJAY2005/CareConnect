import asyncio
import sys
import time
from pathlib import Path

# Windows + psycopg async compatibility.
# This MUST be configured before creating/running the asyncio event loop.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Make sure the backend directory is available on Python's import path.
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


async def verify_database() -> bool:
    from sqlalchemy import text, inspect

    from app.core.database import DATABASE_URL, engine, init_db

    print("=" * 60)
    print("CareConnect Database Connectivity Verification")
    print("=" * 60)

    # Mask password before displaying the URL.
    from urllib.parse import urlsplit, urlunsplit

    try:
        parsed = urlsplit(DATABASE_URL)

        if parsed.password is not None:
            safe_netloc = parsed.netloc.replace(
                f":{parsed.password}@",
                ":****@",
                1,
            )
            safe_url = urlunsplit(
                (
                    parsed.scheme,
                    safe_netloc,
                    parsed.path,
                    parsed.query,
                    parsed.fragment,
                )
            )
        else:
            safe_url = DATABASE_URL

    except Exception:
        safe_url = "[URL could not be displayed safely]"

    print(f"Target Database URL: {safe_url}")

    # ---------------------------------------------------------
    # 1. Test database connection
    # ---------------------------------------------------------
    try:
        start_time = time.perf_counter()

        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1;"))
            scalar = result.scalar()

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        print(
            f"[SUCCESS] Test query 'SELECT 1;' executed successfully "
            f"(scalar={scalar}) in {elapsed_ms:.2f}ms"
        )

        print(
            f"Dialect: {engine.dialect.name} | "
            f"Driver: {engine.dialect.driver}"
        )

    except Exception as exc:
        print(f"[ERROR] Database connection failed: {exc}")
        print("=" * 60)
        print("Database connection status: UNREACHABLE / ERROR")
        print("=" * 60)
        return False

    # ---------------------------------------------------------
    # 2. Create missing CareConnect tables
    # ---------------------------------------------------------
    try:
        await init_db()
    except Exception as exc:
        print(f"[ERROR] Database initialization failed: {exc}")
        print("=" * 60)
        print("Database connection status: HEALTHY, INITIALIZATION FAILED")
        print("=" * 60)
        return False

    # ---------------------------------------------------------
    # 3. Count and display tables
    # ---------------------------------------------------------
    try:
        async with engine.connect() as conn:

            def get_table_names(sync_conn):
                return inspect(sync_conn).get_table_names()

            table_names = await conn.run_sync(get_table_names)

        table_names = sorted(table_names)

        print(f"Found {len(table_names)} tables in database:")

        if table_names:
            for index, table_name in enumerate(table_names, start=1):
                print(f"  {index:2}. {table_name}")
        else:
            print("  (No tables found.)")

    except Exception as exc:
        print(f"[ERROR] Could not inspect database tables: {exc}")
        print("=" * 60)
        print("Database connection status: HEALTHY, TABLE INSPECTION FAILED")
        print("=" * 60)
        return False

    print("=" * 60)
    print("Database connection status: HEALTHY")
    print("=" * 60)

    return True


if __name__ == "__main__":
    success = asyncio.run(verify_database())
    sys.exit(0 if success else 1)