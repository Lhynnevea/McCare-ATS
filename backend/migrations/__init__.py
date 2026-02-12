"""
Database Migration System for McCare Global ATS

This module provides safe, incremental data migrations for MongoDB.
Migrations are versioned and tracked to prevent re-running.

Usage:
    python -m migrations.runner          # Run all pending migrations
    python -m migrations.runner --list   # List all migrations and status
    python -m migrations.runner --rollback <version>  # Rollback specific migration

Guidelines for Safe Migrations:
1. NEVER delete fields - mark as deprecated instead
2. ALWAYS add new fields with defaults or make them optional
3. Use additive changes only (new fields, new collections)
4. Create backups before running migrations in production
5. Test migrations on staging data first
"""
