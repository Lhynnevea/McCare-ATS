# McCare Global ATS - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called McCare Global ATS – Travel Nurse Recruitment & Staffing Platform for McCare Global Healthcare Services Inc. (Canadian healthcare staffing agency hiring travel nurses). Backend similar to Crelate (ATS/CRM) with a HubSpot-style lead/pipeline front end.

**Enhancement Request:** Build standalone lead intake capabilities like HubSpot, including:
- Built-in Lead Intake Forms (embeddable)
- Public Lead API Endpoints
- HubSpot-Compatible Webhook
- Lead Capture Settings with auto-tagging
- Unified Lead Inbox with source tracking
- Audit Logging

## User Choices
- **Authentication**: JWT-based custom auth (email/password)
- **Database**: MongoDB (pre-configured in environment)
- **Design Theme**: Clean light theme with red accent (#ff0000) and teal secondary
- **Demo Data**: Full demo data for all modules
- **Branding**: 
  - Tagline: "Your Global Partner in Healthcare Opportunities"
  - Logo color: Red #ff0000

## User Personas

### Primary Users
1. **Admin** - Full system access, user management, lead capture configuration
2. **Recruiter** - Lead pipeline management, candidate sourcing, job matching
3. **Compliance Officer** - Document verification, credential monitoring
4. **Scheduler/Placement Coordinator** - Assignment creation, timesheet management
5. **Finance** - Timesheet approval, billing, financial reporting
6. **Nurse (Portal User)** - View own profile, assignments, submit timesheets

## Core Requirements (Static)

### Authentication & Roles
- JWT-based authentication with role-based access control
- 6 distinct user roles with specific permissions
- Secure password hashing with bcrypt

### Lead Capture System (HubSpot-like)
- Built-in embeddable lead capture form (HTML/JS snippet)
- Public API endpoint for third-party integrations
- HubSpot-compatible webhook for form submissions
- Landing page submission endpoint
- UTM parameter tracking (source, medium, campaign, term, content)
- Auto-tagging rules based on field values
- Audit logging for all lead intake
- Unified lead inbox with color-coded source badges

### Leads & Pipelines
- Kanban board with 9 pipeline stages (including Converted)
- Lead card with contact info, specialty, source, tags
- **Enhanced Lead Actions Dropdown Menu**:
  - Edit Lead
  - Assign Recruiter
  - Move Stage
  - Convert to Candidate
  - Reject Lead
  - Delete Lead
- **Convert to Candidate Workflow**:
  - Field mapping (name, email, phone, specialty, province, notes, recruiter)
  - Bidirectional linking (lead.candidateId ↔ candidate.sourceLeadId)
  - Duplicate detection by email
  - Option to link to existing candidate
  - Configurable post-conversion stage (Converted/Hired)
  - Activity logging with user attribution
  - Auto-redirect to candidate profile
- Color-coded source badges (HubSpot, ATS Form, API, Landing Page, etc.)

### Candidate/Nurse Management
- Complete nurse profiles (personal, professional, licensing)
- Status tracking (Active, Inactive, Do Not Place, On Assignment, Completed)
- Document upload and tracking
- Profile tabs: Overview, Documents, Activity, Assignments

### Compliance & Documents
- 10 document types tracked
- Status workflow: Pending → Verified
- Expiration monitoring (30/60/90 days)
- Compliance dashboard with alerts

### Client Facilities & Job Orders
- Facility entity with contacts and billing info
- Job orders with specialty, rates, requirements
- Candidate shortlisting for job orders
- Status tracking (Open, In Progress, Filled, Closed)

### Assignments
- Contract management (Travel, Local, Per Diem)
- Pay rates and bill rates tracking
- Credential warning system
- Status workflow (Scheduled, Active, Completed, Cancelled)

### Timesheets & Billing
- Weekly timesheet entry
- Approval workflow (Draft → Submitted → Approved → Processed)
- Automatic billing calculation
- Invoice data generation

### Dashboard & Reporting
- KPI tiles (leads, candidates, jobs, assignments, credentials, timesheets)
- Pipeline distribution chart
- Candidates by specialty pie chart
- Billing summary by facility

## What's Been Implemented (February 2026)

### Backend (FastAPI + MongoDB)
- ✅ Complete REST API with JWT authentication
- ✅ All CRUD endpoints for leads, candidates, documents, facilities, job orders, assignments, timesheets
- ✅ Dashboard statistics endpoint
- ✅ Compliance/expiring documents endpoint
- ✅ Invoices/billing summary endpoint
- ✅ Database seeding with demo data
- ✅ **NEW: Public Lead Submission API (no auth required)**
- ✅ **NEW: ATS Form Submission Endpoint**
- ✅ **NEW: Enhanced HubSpot Webhook with UTM tracking**
- ✅ **NEW: Landing Page Submission Endpoint**
- ✅ **NEW: Lead Capture Settings API**
- ✅ **NEW: Lead Audit Log API**
- ✅ **NEW: Lead Intake Statistics API**
- ✅ **NEW: Embeddable Form Code Generator**
- ✅ **NEW (Feb 12): Document File Upload System**
  - Storage Provider abstraction pattern (Local/S3/GCS)
  - LocalStorageProvider for MVP (ready for cloud migration)
  - S3StorageProvider skeleton (requires AWS credentials)
  - GCSStorageProvider skeleton (requires GCS credentials)
  - File upload/download/delete endpoints
  - File validation (extension, size limits)
  - Content-type detection

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Login page with demo credentials display
- ✅ Dashboard with stats tiles and charts
- ✅ Leads page with Kanban board and color-coded source badges
- ✅ **NEW (Feb 12): Enhanced Lead Actions Module**
  - Actions dropdown menu with 6 options
  - Convert to Candidate dialog with data preview
  - Duplicate detection modal with link option
  - Assign Recruiter dialog with recruiter list
  - Move Stage dialog with all 9 stages
  - Reject Lead dialog with reason input
  - Converted badge shown on converted leads
- ✅ Candidates page with table and filters
- ✅ Candidate detail page with tabs
- ✅ Compliance dashboard with expiry tracking
- ✅ Clients & Jobs page with facilities and job orders
- ✅ Assignments page with contract management
- ✅ Timesheets page with approval workflow
- ✅ Reports page with analytics
- ✅ Settings page with user management
- ✅ **NEW: Lead Capture Settings Page with 4 tabs:**
  - Settings: Pipeline config, auto-tagging rules, auto-convert toggle
  - Embed Form: Copy-paste embeddable form code
  - API Endpoints: All 4 public endpoints with copy buttons
  - Audit Log: Track all lead submissions with source/tags
- ✅ **NEW (Feb 12): Document Upload UI**
  - Upload File button on candidate Documents tab
  - Upload dialog with file picker, document type, dates
  - Progress indicator during upload
  - Download/Verify/Delete actions for documents
- ✅ **NEW (Feb 12): Notification System**
  - In-app notifications with bell icon and unread count
  - Notifications dropdown with mark as read
  - New lead notifications (in-app + email logged)
  - Expiring credential alerts (configurable thresholds)
  - Notification Settings page with 4 tabs
  - Email provider abstraction (Demo/SendGrid/AWS SES ready)
  - Email audit logs for compliance

### Documentation
- ✅ USER_GUIDE.md - Complete workflow documentation
- ✅ QUICK_REFERENCE.md - Quick reference card

### Demo Data Seeded
- 6 users (one per role)
- 16+ leads across pipeline stages with diverse sources
- 10 candidates with various specialties
- 60 documents with different statuses
- 6 facilities across Canada
- 4 job orders
- 3 active assignments
- 9 timesheets
- Lead capture settings with auto-tagging rules
- Lead audit logs for all seeded leads

## API Endpoints - Lead Actions

### Lead Conversion & Management Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads/{id}/convert` | POST | Convert lead to candidate with duplicate detection |
| `/api/leads/{id}/check-duplicate` | GET | Check if candidate with same email exists |
| `/api/leads/{id}/reject` | PUT | Reject lead and move to Rejected stage |
| `/api/leads/{id}/assign` | PUT | Assign recruiter to lead |
| `/api/recruiters` | GET | Get list of Admin/Recruiter users |
| `/api/pipeline/stages` | GET | Get all 9 pipeline stages with colors |

## API Endpoints - Lead Capture System

### Public Endpoints (No Authentication Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/leads` | POST | Submit lead from external integrations |
| `/api/public/form-submit` | POST | Submit lead from ATS embedded form |
| `/api/public/lead-capture-settings` | GET | Get form settings for embedded forms (no auth) |
| `/api/public/landing-page` | POST | Submit lead from custom landing pages |
| `/api/webhooks/hubspot` | POST | Receive leads from HubSpot webhooks |

### Admin Endpoints (Authentication Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lead-capture/settings` | GET/PUT | Get/Update lead capture settings |
| `/api/lead-capture/embed-code` | GET | Get embeddable form HTML/JS code |
| `/api/lead-audit-logs` | GET | Get lead intake audit logs |
| `/api/lead-intake/stats` | GET | Get lead intake statistics by source |

## Prioritized Backlog

### P0 (Critical - Must Have) ✅ COMPLETE
- [x] Authentication system
- [x] Leads pipeline
- [x] Candidate management
- [x] Compliance tracking
- [x] Facilities & Job Orders
- [x] Assignments
- [x] Timesheets
- [x] Dashboard
- [x] **Lead Capture System**

### P1 (High Priority - Should Have)
- [ ] Real HubSpot API integration (with API keys)
- [x] **Email notifications for expiring credentials** ✅ COMPLETE (Demo mode)
- [x] **Document file upload with Storage Provider abstraction** ✅ COMPLETE
- [ ] Advanced search/filtering
- [ ] Bulk actions (leads, candidates)
- [ ] Migrate to S3/GCS when cloud credentials available
- [ ] Production email provider (SendGrid/AWS SES/Mailgun)

### P2 (Medium Priority - Nice to Have)
- [ ] Calendar integration for scheduling
- [ ] SMS notifications (Twilio)
- [ ] PDF invoice generation
- [ ] Candidate portal login
- [ ] Mobile-responsive improvements

### P3 (Low Priority - Future)
- [ ] Advanced analytics/reporting
- [ ] Integration with payroll systems
- [ ] Multi-tenancy support
- [ ] Audit logging (full system)
- [ ] Custom workflow builder

## Next Tasks List
1. ~~Add built-in lead capture capabilities~~ ✅ DONE
2. ~~Implement document file upload with Storage Provider~~ ✅ DONE (Feb 12)
3. ~~Add email notifications for leads and credentials~~ ✅ DONE (Feb 12 - Demo mode)
4. ~~Enhanced Lead Actions with Convert to Candidate~~ ✅ DONE (Feb 12)
5. ~~Fix embedded form settings fetch with public endpoint~~ ✅ DONE (Feb 12)
6. **Migrate to S3/GCS when cloud credentials available** (P1)
7. **Configure production email provider** (P1 - SendGrid/AWS SES/Mailgun)
8. Build candidate self-service portal
9. Add advanced filtering and search capabilities
10. Implement calendar view for assignments

## Notification System Architecture
```
/app/backend/
├── email_provider.py      # Email abstraction layer
│   ├── EmailProvider (ABC)
│   ├── DemoEmailProvider (Active - logs to DB)
│   ├── SendGridEmailProvider (Ready - needs SENDGRID_API_KEY)
│   └── AWSESEmailProvider (Ready - needs AWS credentials)
├── notification_service.py  # Notification business logic
│   ├── create_notification() - In-app notifications
│   ├── notify_new_lead() - Triggered on lead creation
│   └── check_expiring_credentials() - Daily scheduler
└── migrations/
    └── m_002_add_notification_collections.py

Collections:
- notifications: In-app notifications with user_ids, read_by
- notification_logs: Email audit trail (demo: logged, prod: sent)
- notification_settings: Admin configuration
```

## Storage Provider Architecture
```
storage_provider.py
├── StorageProvider (Abstract Base Class)
│   ├── upload(content, filename, folder, content_type) -> dict
│   ├── download(file_path) -> bytes
│   ├── delete(file_path) -> bool
│   ├── exists(file_path) -> bool
│   └── get_full_path(file_path) -> str
├── LocalStorageProvider (MVP - Active)
│   └── Stores files in /app/backend/uploads/
├── S3StorageProvider (Ready - needs AWS credentials)
│   └── Requires: S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
└── GCSStorageProvider (Ready - needs GCS credentials)
    └── Requires: GCS_BUCKET_NAME, GOOGLE_APPLICATION_CREDENTIALS
```

## Technical Architecture

### Backend Stack
- FastAPI (Python web framework)
- MongoDB (database)
- JWT (authentication)
- Pydantic (data validation)
- Motor (async MongoDB driver)

### Frontend Stack
- React 19
- Tailwind CSS
- Shadcn/UI components
- Recharts (visualizations)
- React Router (navigation)
- Axios (API client)

### Deployment & DevOps
- **Migration System:** `/app/backend/migrations/` - versioned, safe data migrations
- **Schema Documentation:** `/app/backend/SCHEMA.md` - full collection schemas
- **Deployment Guide:** `/app/DEPLOYMENT.md` - deployment checklist and commands
- **Health Check:** `GET /api/health` - verify deployment status

### URLs
- Frontend: https://leads-filter-preview.preview.emergentagent.com
- Backend API: https://leads-filter-preview.preview.emergentagent.com/api
- Health Check: https://leads-filter-preview.preview.emergentagent.com/api/health

---
*Last Updated: February 12, 2026 - Added Convert to Candidate feature*
