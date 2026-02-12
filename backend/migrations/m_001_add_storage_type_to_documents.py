"""
Migration 001: Add storage_type field to documents

This is an example migration showing the pattern for safe, additive changes.
Adds the storage_type field to existing documents that don't have it.

Safe Migration Pattern:
- Adds new optional field with default value
- Does NOT remove any existing fields
- Idempotent (safe to run multiple times)
"""


async def up(db):
    """
    Add storage_type field to documents without it.
    Default to 'legacy' for documents created before Storage Provider.
    """
    result = await db.documents.update_many(
        {"storage_type": {"$exists": False}},
        {"$set": {"storage_type": "legacy"}}
    )
    print(f"    Updated {result.modified_count} documents with storage_type='legacy'")


async def down(db):
    """
    Rollback: Remove the storage_type field.
    Note: In production, consider keeping fields even on rollback.
    """
    result = await db.documents.update_many(
        {"storage_type": "legacy"},
        {"$unset": {"storage_type": ""}}
    )
    print(f"    Removed storage_type from {result.modified_count} documents")
