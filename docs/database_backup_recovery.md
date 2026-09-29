# CareConnect — PostgreSQL Database Backup & Disaster Recovery Plan

**Target Database:** PostgreSQL 18 (psycopg async driver)  
**Compliance Scope:** India Digital Personal Data Protection (DPDP) Act 2023, Clinical Care Record Retention  
**Authoritative Environment:** Production Database Cluster  

---

## 1. PostgreSQL Backup Procedures

### A. Full Logical Snapshot (`pg_dump`)
Run scheduled nightly dumps with encryption and compression.

```bash
# Set environment parameters securely (avoid storing passwords in plain text files)
export PGHOST="localhost"
export PGPORT="5432"
export PGUSER="careconnect_backup_user"
export PGDATABASE="careconnect_prod"
export BACKUP_DIR="/var/backups/careconnect"
export TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create directory if it does not exist
mkdir -p "${BACKUP_DIR}"

# Execute compressed custom-format backup (allows parallel and selective restore)
pg_dump -Fc -Z 9 \
  --exclude-table-data='audit_logs_archive' \
  -f "${BACKUP_DIR}/careconnect_prod_${TIMESTAMP}.dump"

# Generate SHA-256 checksum for integrity verification
sha256sum "${BACKUP_DIR}/careconnect_prod_${TIMESTAMP}.dump" > "${BACKUP_DIR}/careconnect_prod_${TIMESTAMP}.dump.sha256"
```

### B. Continuous Archiving & Write-Ahead Logging (WAL)
For Point-In-Time Recovery (PITR) to minimize Recovery Point Objective (RPO):

In `postgresql.conf`:
```ini
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 300 # Forces segment rotation every 5 minutes
```

---

## 2. Restore Procedure

### A. Full Database Restore (`pg_restore`)
To restore a logical backup into a clean target database:

```bash
# 1. Terminate existing connections to the target database
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'careconnect_prod' AND pid <> pg_backend_pid();"

# 2. Drop and recreate database or restore directly
dropdb -U postgres --if-exists careconnect_prod
createdb -U postgres -O careconnect_user careconnect_prod

# 3. Verify dump integrity before restoration
sha256sum -c "careconnect_prod_${TIMESTAMP}.dump.sha256"

# 4. Restore using pg_restore with clean schema recreation
pg_restore -U careconnect_user -d careconnect_prod \
  --clean --if-exists --no-owner --no-privileges \
  --verbose "careconnect_prod_${TIMESTAMP}.dump"
```

### B. Point-in-Time Recovery (PITR)
To recover to a specific timestamp before an incident:

1. Stop PostgreSQL service: `systemctl stop postgresql`.
2. Restore the latest base backup into data directory.
3. Place `recovery.signal` in data directory.
4. Add recovery target settings to `postgresql.conf`:
   ```ini
   restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
   recovery_target_time = '2026-09-29 11:30:00 UTC'
   recovery_target_action = 'promote'
   ```
5. Start PostgreSQL service: `systemctl start postgresql`.

---

## 3. Recommended Backup Schedule & Frequency

| Backup Type | Frequency | Execution Window | Retention Period |
| :--- | :--- | :--- | :--- |
| **Full Base Backup** | Daily | 02:00 AM IST (Low platform traffic) | 30 Days local, 90 Days cold storage |
| **WAL Continuous Archiving** | Continuous (Every 5 mins) | Real-time | 14 Days rolling |
| **Pre-Deployment Snapshot** | Ad-hoc | Immediately prior to schema/code release | 7 Days |
| **Monthly Compliance Archive** | Monthly (1st of month) | 03:00 AM IST | 7 Years (Clinical data compliance) |

---

## 4. Backup Storage & Security Architecture

1. **Air-Gapped Cloud Storage:**
   - Backups must be replicated immediately to an offsite S3-compatible cloud object store (e.g. AWS S3 / Cloudflare R2).
   - Enable S3 Object Lock (WORM - Write Once, Read Many) in Compliance Mode to prevent ransomware deletion.
2. **At-Rest Encryption:**
   - Server-side encryption using customer-managed AWS KMS / Envelope Encryption (`AES-256`).
3. **Access Control:**
   - Dedicated IAM role with `PutObject` only permissions for the backup service; `DeleteObject` explicitly denied.

---

## 5. Backup Verification & Testing Procedure

1. **Automated Weekly Sandbox Restore:**
   - A weekly CI/CD cron job downloads the latest `.dump` file, restores it to an ephemeral PostgreSQL container, and runs `pytest tests/test_db_persistence.py`.
2. **Integrity Checksum Validation:**
   - Verify SHA-256 hash immediately after dump generation and prior to every restore.
3. **Table Row Count & Schema Validation:**
   - Run verification query checking that key tables (`users`, `elders`, `care_assignments`, `shifts`, `attendance_logs`) contain non-zero valid records.

---

## 6. Disaster Recovery Playbook

### Objectives:
- **Recovery Time Objective (RTO):** $< 30\text{ minutes}$ (Total service restoration time).
- **Recovery Point Objective (RPO):** $< 5\text{ minutes}$ (Maximum potential data loss window).

### Step-by-Step Incident Response:
1. **Declare Incident:** Operations Lead confirms catastrophic DB failure or corruption.
2. **Switch Backend to Maintenance Mode:** Route traffic to static maintenance screen.
3. **Identify Recovery Point:** Select latest verified daily snapshot + available WAL segments.
4. **Provision / Restore Database:** Execute `pg_restore` or PITR procedure on replica or fresh cluster.
5. **Run Sanity Suite:** Execute `pytest tests/test_db_persistence.py` against restored database.
6. **Update Backend Connection Pool:** Re-point `DATABASE_URL` and restart FastAPI backend service.
7. **Verify Services:** Perform end-to-end health checks on `/health`, Family Portal, and Caregiver Portal.
8. **Lift Maintenance Mode:** Restore user traffic and document post-mortem.
