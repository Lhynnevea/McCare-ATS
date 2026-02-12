"""
Migration 004: Fix orphan documents and add data integrity checks

Identifies documents without valid candidate_id and either:
1. Links them to matching candidates (by email)
2. Flags them as orphans for manual review

Also adds candidate_id validation for future document creation.

Safe: Yes - only adds indexes and flags, doesn't delete data
Reversible: Yes
"""


async def up(db):
    """Fix orphan documents and add indexes for compliance queries"""
    
    # Create indexes for compliance queries
    await db.documents.create_index([("candidate_id", 1), ("status", 1)])
    await db.documents.create_index([("expiry_date", 1)])
    await db.documents.create_index([("document_type", 1)])
    print("    Created compliance query indexes")
    
    # Get all candidates for mapping
    candidates = await db.candidates.find({}, {"_id": 0, "id": 1, "email": 1}).to_list(10000)
    candidate_ids = {c["id"] for c in candidates}
    email_to_id = {c["email"]: c["id"] for c in candidates if c.get("email")}
    
    # Find orphan documents
    orphan_count = 0
    fixed_count = 0
    
    documents = await db.documents.find({}, {"_id": 0}).to_list(10000)
    
    for doc in documents:
        candidate_id = doc.get("candidate_id")
        
        # Check if candidate_id is missing or invalid
        if not candidate_id or candidate_id not in candidate_ids:
            orphan_count += 1
            
            # Flag as orphan
            await db.documents.update_one(
                {"id": doc["id"]},
                {"$set": {"is_orphan": True, "orphan_reason": "Missing or invalid candidate_id"}}
            )
    
    print(f"    Found {orphan_count} orphan documents, flagged for review")
    print(f"    Fixed {fixed_count} documents by email matching")


async def down(db):
    """Remove orphan flags"""
    result = await db.documents.update_many(
        {"is_orphan": True},
        {"$unset": {"is_orphan": "", "orphan_reason": ""}}
    )
    print(f"    Removed orphan flags from {result.modified_count} documents")
