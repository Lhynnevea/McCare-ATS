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
- Kanban board with 8 pipeline stages
- Lead card with contact info, specialty, source, tags
- Convert lead to candidate functionality
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

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Login page with demo credentials display
- ✅ Dashboard with stats tiles and charts
- ✅ Leads page with Kanban board and color-coded source badges
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

## API Endpoints - Lead Capture System

### Public Endpoints (No Authentication Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/leads` | POST | Submit lead from external integrations |
| `/api/public/form-submit` | POST | Submit lead from ATS embedded form |
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
- [ ] Email notifications for expiring credentials
- [x] **Document file upload with Storage Provider abstraction** ✅ COMPLETE
- [ ] Advanced search/filtering
- [ ] Bulk actions (leads, candidates)
- [ ] Migrate to S3/GCS when cloud credentials available

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
2. Add email notifications for new lead alerts
3. Implement document file upload with storage
4. Build candidate self-service portal
5. Add advanced filtering and search capabilities
6. Implement calendar view for assignments

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

### URLs
- Frontend: https://mccare-ats-hub.preview.emergentagent.com
- Backend API: https://mccare-ats-hub.preview.emergentagent.com/api

---
*Last Updated: February 11, 2026*
