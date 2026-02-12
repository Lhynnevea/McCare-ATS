"""
Database Migration Runner for McCare Global ATS

Safe, versioned migrations for MongoDB with rollback support.
Tracks executed migrations to prevent re-running.

Usage:
    python -m migrations.runner          # Run all pending migrations
    python -m migrations.runner --list   # List migrations and status
    python -m migrations.runner --dry-run # Preview without executing
"""

import asyncio
import importlib
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / '.env')

MIGRATIONS_COLLECTION = "_migrations"


async def get_db():
    """Get database connection"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    return client[os.environ['DB_NAME']]


async def get_executed_migrations(db) -> set:
    """Get set of already executed migration versions"""
    executed = await db[MIGRATIONS_COLLECTION].find({}, {"version": 1}).to_list(1000)
    return {m["version"] for m in executed}


async def mark_migration_executed(db, version: str, name: str, direction: str = "up"):
    """Record that a migration was executed"""
    await db[MIGRATIONS_COLLECTION].insert_one({
        "version": version,
        "name": name,
        "direction": direction,
        "executed_at": datetime.now(timezone.utc).isoformat()
    })


async def mark_migration_rolled_back(db, version: str):
    """Remove migration record when rolled back"""
    await db[MIGRATIONS_COLLECTION].delete_one({"version": version})


def discover_migrations() -> list:
    """Discover all migration files in migrations/ directory"""
    migrations_dir = Path(__file__).parent
    migrations = []
    
    for file in sorted(migrations_dir.glob("m_*.py")):
        version = file.stem.split("_")[1]  # m_001_name -> 001
        name = "_".join(file.stem.split("_")[2:])  # m_001_name -> name
        migrations.append({
            "version": version,
            "name": name,
            "file": file.stem,
            "path": file
        })
    
    return migrations


async def run_migration(db, migration: dict, dry_run: bool = False):
    """Run a single migration"""
    module = importlib.import_module(f"migrations.{migration['file']}")
    
    print(f"  Running {migration['version']}: {migration['name']}...")
    
    if dry_run:
        print(f"    [DRY RUN] Would execute migration")
        return True
    
    try:
        await module.up(db)
        await mark_migration_executed(db, migration['version'], migration['name'])
        print(f"    ✓ Complete")
        return True
    except Exception as e:
        print(f"    ✗ Failed: {e}")
        return False


async def rollback_migration(db, migration: dict):
    """Rollback a single migration"""
    module = importlib.import_module(f"migrations.{migration['file']}")
    
    print(f"  Rolling back {migration['version']}: {migration['name']}...")
    
    try:
        if hasattr(module, 'down'):
            await module.down(db)
        await mark_migration_rolled_back(db, migration['version'])
        print(f"    ✓ Rolled back")
        return True
    except Exception as e:
        print(f"    ✗ Failed: {e}")
        return False


async def run_pending_migrations(dry_run: bool = False):
    """Run all pending migrations"""
    db = await get_db()
    executed = await get_executed_migrations(db)
    migrations = discover_migrations()
    
    pending = [m for m in migrations if m['version'] not in executed]
    
    if not pending:
        print("No pending migrations.")
        return
    
    print(f"Found {len(pending)} pending migration(s):")
    
    for migration in pending:
        success = await run_migration(db, migration, dry_run)
        if not success and not dry_run:
            print("Migration failed. Stopping.")
            break


async def list_migrations():
    """List all migrations with their status"""
    db = await get_db()
    executed = await get_executed_migrations(db)
    migrations = discover_migrations()
    
    print("\nMigrations:")
    print("-" * 60)
    
    for m in migrations:
        status = "✓ Executed" if m['version'] in executed else "○ Pending"
        print(f"  {m['version']} | {status:12} | {m['name']}")
    
    print("-" * 60)
    print(f"Total: {len(migrations)} | Executed: {len(executed)} | Pending: {len(migrations) - len(executed)}")


async def main():
    """Main entry point"""
    args = sys.argv[1:]
    
    if "--list" in args:
        await list_migrations()
    elif "--dry-run" in args:
        await run_pending_migrations(dry_run=True)
    elif "--rollback" in args:
        idx = args.index("--rollback")
        if idx + 1 < len(args):
            version = args[idx + 1]
            db = await get_db()
            migrations = discover_migrations()
            migration = next((m for m in migrations if m['version'] == version), None)
            if migration:
                await rollback_migration(db, migration)
            else:
                print(f"Migration {version} not found")
        else:
            print("Usage: --rollback <version>")
    else:
        await run_pending_migrations()


if __name__ == "__main__":
    asyncio.run(main())
