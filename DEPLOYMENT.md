# McCare Global ATS - Deployment Guide

## Quick Deployment Checklist

### Pre-Deployment
- [ ] Run migrations: `cd /app/backend && python -m migrations.runner --list`
- [ ] Run pending migrations: `python -m migrations.runner`
- [ ] Verify backend starts: `curl $BACKEND_URL/api/health` (or check logs)
- [ ] Verify frontend builds without errors

### Post-Deployment
- [ ] Test login with admin account
- [ ] Verify dashboard loads with data
- [ ] Spot-check one critical flow (e.g., upload document)

---

## Environment Variables

### Backend (`/app/backend/.env`)
```bash
# Required
MONGO_URL="mongodb://localhost:27017"   # MongoDB connection string
DB_NAME="test_database"                  # Database name
JWT_SECRET_KEY="your-secret-key"         # JWT signing key

# Optional - Cloud Storage (when ready)
# S3_BUCKET_NAME="mccare-documents"      # Enables S3StorageProvider
# AWS_ACCESS_KEY_ID="AKIA..."
# AWS_SECRET_ACCESS_KEY="..."
# AWS_REGION="us-east-1"

# OR for Google Cloud Storage
# GCS_BUCKET_NAME="mccare-documents"     # Enables GCSStorageProvider
# GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### Frontend (`/app/frontend/.env`)
```bash
REACT_APP_BACKEND_URL=https://your-domain.com
WDS_SOCKET_PORT=443
```

---

## Deployment Commands

### Full Redeploy
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install

# 3. Run migrations
cd /app/backend && python -m migrations.runner

# 4. Restart services
sudo supervisorctl restart backend frontend
```

### Backend Only
```bash
cd /app/backend
pip install -r requirements.txt
python -m migrations.runner
sudo supervisorctl restart backend
```

### Frontend Only
```bash
cd /app/frontend
yarn install
yarn build  # If production build needed
sudo supervisorctl restart frontend
```

---

## Database Migrations

### List Migrations
```bash
cd /app/backend
python -m migrations.runner --list
```

### Run Pending Migrations
```bash
python -m migrations.runner
```

### Dry Run (Preview)
```bash
python -m migrations.runner --dry-run
```

### Rollback Specific Migration
```bash
python -m migrations.runner --rollback 001
```

### Creating New Migrations

1. Create file: `migrations/m_XXX_description.py`
2. Use this template:

```python
"""
Migration XXX: Description

Purpose: What this migration does
Safe: Yes/No - Does it modify existing data?
Reversible: Yes/No
"""

async def up(db):
    """Forward migration"""
    # Add new field with default (SAFE - additive)
    await db.collection.update_many(
        {"new_field": {"$exists": False}},
        {"$set": {"new_field": "default_value"}}
    )

async def down(db):
    """Rollback migration (optional)"""
    # Remove the field
    await db.collection.update_many(
        {},
        {"$unset": {"new_field": ""}}
    )
```

---

## Safe Data Change Patterns

### Adding a New Field
```python
# SAFE: Add with default, doesn't break existing code
await db.candidates.update_many(
    {"new_field": {"$exists": False}},
    {"$set": {"new_field": "default"}}
)
```

### Renaming a Field
```python
# SAFE: Copy to new name, keep old (deprecate later)
await db.candidates.update_many(
    {"new_name": {"$exists": False}, "old_name": {"$exists": True}},
    [{"$set": {"new_name": "$old_name"}}]
)
# Update code to read new_name, write both
# Remove old_name in future migration
```

### Changing Field Type
```python
# SAFE: Create new field with converted value
await db.candidates.update_many(
    {"years_exp_int": {"$exists": False}},
    [{"$set": {"years_exp_int": {"$toInt": "$years_of_experience"}}}]
)
```

### Adding a New Collection
```python
# SAFE: Just create it, nothing to migrate
await db.create_collection("new_collection")
await db.new_collection.create_index("lookup_field")
```

---

## Backup & Restore

### Create Backup
```bash
mongodump --uri="$MONGO_URL" --db="$DB_NAME" --out=/backups/$(date +%Y%m%d)
```

### Restore from Backup
```bash
mongorestore --uri="$MONGO_URL" --db="$DB_NAME" /backups/20260212/test_database
```

---

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Common issues:
# - Missing environment variable → Check .env file
# - Import error → Run pip install -r requirements.txt
# - MongoDB connection → Verify MONGO_URL
```

### Frontend Won't Start
```bash
# Check logs
tail -f /var/log/supervisor/frontend.err.log

# Common issues:
# - Missing dependency → Run yarn install
# - Build error → Check for syntax errors
# - API URL wrong → Verify REACT_APP_BACKEND_URL
```

### Migration Failed
```bash
# Check which migrations ran
python -m migrations.runner --list

# View migration code for the failing version
cat migrations/m_XXX_*.py

# Fix the issue, then re-run
python -m migrations.runner
```

---

## Switching to Cloud Storage

When AWS/GCS credentials are available:

### For AWS S3
```bash
# 1. Add to backend/.env
S3_BUCKET_NAME=mccare-documents
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# 2. Restart backend
sudo supervisorctl restart backend

# System automatically uses S3StorageProvider
```

### For Google Cloud Storage
```bash
# 1. Add to backend/.env
GCS_BUCKET_NAME=mccare-documents
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# 2. Restart backend
sudo supervisorctl restart backend

# System automatically uses GCSStorageProvider
```

### Migrating Existing Files to Cloud
```python
# Create migration: m_002_migrate_files_to_cloud.py
async def up(db):
    """Migrate local files to cloud storage"""
    from storage_provider import get_storage_provider, LocalStorageProvider
    import aiofiles
    
    local = LocalStorageProvider()
    cloud = get_storage_provider()  # Will be S3/GCS based on env
    
    async for doc in db.documents.find({"storage_type": "local"}):
        if doc.get("file_path"):
            # Read from local
            content = await local.download(doc["file_path"])
            # Upload to cloud
            result = await cloud.upload(content, doc["file_name"], doc["candidate_id"])
            # Update record
            await db.documents.update_one(
                {"id": doc["id"]},
                {"$set": {
                    "file_path": result["file_path"],
                    "file_url": result["file_url"],
                    "storage_type": result["storage_type"]
                }}
            )
```

---

## Health Checks

### Backend Health
```bash
curl -s $BACKEND_URL/api/health
# Should return: {"status": "healthy"}
```

### Database Connection
```bash
cd /app/backend
python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
load_dotenv('.env')

async def check():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    count = await db.users.count_documents({})
    print(f'Connected! Users: {count}')

asyncio.run(check())
"
```

### Storage Provider Status
```bash
curl -s -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/upload/stats
# Returns storage type, file counts, usage
```

---

## Contact & Support

For deployment issues:
1. Check this guide first
2. Review error logs
3. Check SCHEMA.md for data structure questions
4. Review recent migrations for data issues
