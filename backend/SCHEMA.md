# McCare Global ATS - Database Schema Documentation

## Overview
MongoDB collections with their current field definitions.
This document serves as the source of truth for data structure.

**Last Updated:** February 12, 2026

---

## Collections

### `users`
User accounts for ATS access.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `email` | string | Yes | Login email (unique) |
| `password` | string | Yes | Bcrypt hashed password |
| `first_name` | string | Yes | User's first name |
| `last_name` | string | Yes | User's last name |
| `role` | string | Yes | One of: Admin, Recruiter, Compliance Officer, Scheduler, Finance, Nurse |
| `created_at` | string (ISO date) | Yes | Account creation timestamp |

---

### `leads`
Sales/recruitment leads in the pipeline.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `first_name` | string | Yes | Lead's first name |
| `last_name` | string | Yes | Lead's last name |
| `email` | string | Yes | Contact email |
| `phone` | string | No | Contact phone |
| `source` | string | No | Lead source (API, HubSpot, ATS Form, Landing Page, Direct) |
| `specialty` | string | No | Nursing specialty |
| `province_preference` | string | No | Preferred work province |
| `tags` | array[string] | No | Applied tags |
| `notes` | string | No | Free-form notes |
| `stage` | string | Yes | Pipeline stage |
| `recruiter_id` | string | No | Assigned recruiter user ID |
| `utm_source` | string | No | UTM tracking |
| `utm_medium` | string | No | UTM tracking |
| `utm_campaign` | string | No | UTM tracking |
| `utm_term` | string | No | UTM tracking |
| `utm_content` | string | No | UTM tracking |
| `form_id` | string | No | Source form identifier |
| `landing_page_url` | string | No | Source landing page |
| `referrer_url` | string | No | HTTP referrer |
| `hubspot_form_id` | string | No | HubSpot form GUID |
| `hubspot_portal_id` | string | No | HubSpot portal ID |
| `campaign_name` | string | No | Marketing campaign name |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

**Pipeline Stages:** New Lead, Contacted, Screening, Scheduled, Interview, Offer, Hired, Rejected

---

### `candidates`
Nurse candidates in the system.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `first_name` | string | Yes | Candidate's first name |
| `last_name` | string | Yes | Candidate's last name |
| `preferred_name` | string | No | Nickname/preferred name |
| `email` | string | Yes | Contact email |
| `phone` | string | No | Contact phone |
| `address` | string | No | Street address |
| `city` | string | No | City |
| `province` | string | No | Province |
| `postal_code` | string | No | Postal code |
| `country` | string | No | Country (default: Canada) |
| `work_eligibility` | string | No | Work permit status |
| `nurse_type` | string | No | RN, RPN, LPN, NP, etc. |
| `primary_specialty` | string | No | Main nursing specialty |
| `years_of_experience` | integer | No | Years of experience |
| `desired_locations` | array[string] | No | Preferred work locations |
| `travel_willingness` | boolean | No | Willing to travel |
| `start_date_availability` | string (date) | No | Available start date |
| `status` | string | Yes | Active, Inactive, Do Not Place, On Assignment, Completed |
| `tags` | array[string] | No | Applied tags |
| `notes` | string | No | Free-form notes |
| `lead_id` | string | No | Source lead if converted |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

---

### `documents`
Candidate documents and credentials.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `candidate_id` | string | Yes | Associated candidate ID |
| `document_type` | string | Yes | Type of document |
| `file_url` | string | No | URL to document (legacy/external) |
| `file_path` | string | No | Storage path for uploaded files |
| `file_name` | string | No | Original filename |
| `file_size` | integer | No | File size in bytes |
| `file_type` | string | No | File extension (.pdf, .doc, etc.) |
| `storage_type` | string | No | Storage provider: local, s3, gcs, legacy |
| `issue_date` | string (date) | No | Document issue date |
| `expiry_date` | string (date) | No | Document expiry date |
| `status` | string | Yes | Pending, Verified, Expired, Expiring Soon |
| `verified_by` | string | No | User ID who verified |
| `uploaded_by` | string | No | User ID who uploaded |
| `notes` | string | No | Free-form notes |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

**Document Types:** Nursing License, Criminal Record Check, Immunization Records, BLS/ACLS, Resume, References, Employment Contract, Government ID, Work Permit, Other

---

### `facilities`
Client healthcare facilities.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `name` | string | Yes | Facility name |
| `address` | string | No | Street address |
| `city` | string | No | City |
| `province` | string | No | Province |
| `facility_type` | string | No | Hospital, Clinic, Long-term Care, etc. |
| `main_contact_name` | string | No | Primary contact name |
| `main_contact_email` | string | No | Primary contact email |
| `main_contact_phone` | string | No | Primary contact phone |
| `billing_notes` | string | No | Billing instructions |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

---

### `job_orders`
Open positions at facilities.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `facility_id` | string | Yes | Associated facility ID |
| `role` | string | Yes | Job role/title |
| `specialty` | string | Yes | Required specialty |
| `openings` | integer | No | Number of positions |
| `shift_type` | string | No | Days, Nights, Rotating |
| `start_date` | string (date) | No | Assignment start |
| `end_date` | string (date) | No | Assignment end |
| `required_experience` | integer | No | Min years experience |
| `required_credentials` | array[string] | No | Required certifications |
| `pay_rate` | number | No | Hourly pay rate |
| `bill_rate` | number | No | Hourly bill rate |
| `status` | string | Yes | Open, In Progress, Filled, Closed |
| `shortlisted_candidates` | array[string] | No | Candidate IDs |
| `notes` | string | No | Free-form notes |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

---

### `assignments`
Active placements of candidates at facilities.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `candidate_id` | string | Yes | Assigned candidate ID |
| `job_order_id` | string | Yes | Source job order ID |
| `facility_id` | string | Yes | Facility ID |
| `start_date` | string (date) | Yes | Assignment start |
| `end_date` | string (date) | Yes | Assignment end |
| `shift_pattern` | string | No | Work schedule pattern |
| `contract_type` | string | No | Travel, Local, Per Diem |
| `pay_rate_regular` | number | No | Regular hourly rate |
| `pay_rate_ot` | number | No | Overtime rate |
| `pay_rate_holiday` | number | No | Holiday rate |
| `bill_rate` | number | No | Client bill rate |
| `weekly_hours` | number | No | Expected weekly hours |
| `status` | string | Yes | Scheduled, Active, Completed, Cancelled |
| `notes` | string | No | Free-form notes |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

---

### `timesheets`
Weekly timesheet records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `assignment_id` | string | Yes | Associated assignment ID |
| `candidate_id` | string | Yes | Candidate ID |
| `week_start` | string (date) | Yes | Week start date |
| `week_end` | string (date) | Yes | Week end date |
| `entries` | array[object] | No | Daily time entries |
| `entries[].day` | string | Yes | Day of week |
| `entries[].regular_hours` | number | No | Regular hours worked |
| `entries[].ot_hours` | number | No | Overtime hours |
| `status` | string | Yes | Draft, Submitted, Approved, Processed |
| `notes` | string | No | Free-form notes |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

---

### `activities`
Audit log of system activities.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `entity_type` | string | Yes | lead, candidate, document, etc. |
| `entity_id` | string | Yes | ID of related entity |
| `activity_type` | string | Yes | created, updated, stage_change, etc. |
| `description` | string | Yes | Human-readable description |
| `user_id` | string | No | User who performed action |
| `created_at` | string (ISO date) | Yes | Activity timestamp |

---

### `lead_capture_settings`
Configuration for lead intake system.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `required_fields` | array[string] | No | Required form fields |
| `optional_fields` | array[string] | No | Optional form fields |
| `default_pipeline_stage` | string | No | Default stage for new leads |
| `default_recruiter_id` | string | No | Default assigned recruiter |
| `auto_tag_rules` | array[object] | No | Auto-tagging rules |
| `auto_convert_to_candidate` | boolean | No | Auto-create candidate from lead |
| `notify_on_new_lead` | boolean | No | Send notifications |
| `allowed_sources` | array[string] | No | Allowed lead sources |
| `created_at` | string (ISO date) | Yes | Creation timestamp |
| `updated_at` | string (ISO date) | Yes | Last update timestamp |

---

### `lead_audit_logs`
Audit trail for lead intake.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Primary identifier |
| `lead_id` | string | Yes | Associated lead ID |
| `source` | string | Yes | Intake source |
| `timestamp` | string (ISO date) | Yes | Intake timestamp |
| `payload_summary` | object | No | Summary of submitted data |
| `auto_populated_fields` | array[string] | No | Fields auto-filled |
| `auto_tags_applied` | array[string] | No | Tags auto-applied |
| `recruiter_assigned` | string | No | Auto-assigned recruiter |
| `auto_converted` | boolean | No | Was auto-converted to candidate |

---

### `_migrations`
Internal tracking for database migrations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Migration version number |
| `name` | string | Yes | Migration name |
| `direction` | string | Yes | up or down |
| `executed_at` | string (ISO date) | Yes | Execution timestamp |

---

## Schema Evolution Guidelines

### DO ✅
- Add new optional fields with sensible defaults
- Add new collections
- Add indexes for query performance
- Use migrations for data transformations
- Document all changes in this file

### DON'T ❌
- Delete existing fields (mark as deprecated instead)
- Change field types without migration
- Rename fields (add new, migrate data, deprecate old)
- Drop collections without backup
- Make breaking changes to API responses

### Deprecation Pattern
When a field needs to be removed:
1. Mark as `_deprecated_` in documentation
2. Stop writing to the field in code
3. Add migration to copy data if needed
4. Keep field in schema for 2+ releases
5. Finally remove in future migration (optional)
