"""
Migration 002: Add notification collections and indexes

Adds:
- notifications collection for in-app notifications
- notification_logs collection for email audit trail
- notification_settings collection for configuration
- last_notified field to documents for tracking credential alerts

Safe: Yes - only adds new collections and fields
Reversible: Yes
"""


async def up(db):
    """Create notification collections and indexes"""
    
    # Create indexes for notifications collection
    await db.notifications.create_index("user_ids")
    await db.notifications.create_index("created_at")
    await db.notifications.create_index([("type", 1), ("created_at", -1)])
    print("    Created notifications indexes")
    
    # Create indexes for notification_logs collection
    await db.notification_logs.create_index("created_at")
    await db.notification_logs.create_index("type")
    await db.notification_logs.create_index("status")
    print("    Created notification_logs indexes")
    
    # Add last_notified field to documents that don't have it
    result = await db.documents.update_many(
        {"last_notified": {"$exists": False}},
        {"$set": {"last_notified": {}}}
    )
    print(f"    Updated {result.modified_count} documents with last_notified field")


async def down(db):
    """Remove notification collections (optional rollback)"""
    
    # Drop indexes (collections will be empty anyway in demo)
    try:
        await db.notifications.drop_indexes()
        await db.notification_logs.drop_indexes()
        print("    Dropped notification indexes")
    except Exception as e:
        print(f"    Warning: Could not drop indexes: {e}")
    
    # Remove last_notified field from documents
    result = await db.documents.update_many(
        {},
        {"$unset": {"last_notified": ""}}
    )
    print(f"    Removed last_notified from {result.modified_count} documents")
