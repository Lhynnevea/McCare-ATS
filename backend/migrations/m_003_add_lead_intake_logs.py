"""
Migration 003: Add lead_intake_logs collection

Adds a collection for tracking all form submission attempts for debugging.
Stores: timestamp, origin, IP, form_id, payload, status, errors.

Safe: Yes - only adds new collection
Reversible: Yes
"""


async def up(db):
    """Create lead_intake_logs collection and indexes"""
    
    # Create indexes for lead_intake_logs collection
    await db.lead_intake_logs.create_index("created_at")
    await db.lead_intake_logs.create_index("status")
    await db.lead_intake_logs.create_index("form_id")
    await db.lead_intake_logs.create_index("origin")
    await db.lead_intake_logs.create_index([("created_at", -1), ("status", 1)])
    print("    Created lead_intake_logs indexes")


async def down(db):
    """Remove lead_intake_logs collection"""
    try:
        await db.lead_intake_logs.drop()
        print("    Dropped lead_intake_logs collection")
    except Exception as e:
        print(f"    Warning: Could not drop collection: {e}")
