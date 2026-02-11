# McCare Global ATS - User Guide & Workflow Documentation

## Table of Contents
1. [Overview](#overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [The Recruitment Lifecycle](#the-recruitment-lifecycle)
4. [Module-by-Module Instructions](#module-by-module-instructions)
5. [Workflow Diagrams](#workflow-diagrams)
6. [Demo Credentials](#demo-credentials)

---

## Overview

McCare Global ATS is a comprehensive Applicant Tracking System designed for travel nurse recruitment and staffing in Canada. The platform manages the entire recruitment lifecycle from lead capture to placement and billing.

### Key Features
- **Lead Pipeline Management** - HubSpot-style Kanban board for tracking prospects
- **Candidate Database** - Complete nurse profiles with credentials and documents
- **Compliance Tracking** - Monitor licenses, certifications, and expiring documents
- **Client Management** - Healthcare facilities and job order management
- **Assignment Management** - Travel nurse contract placements
- **Timesheet & Billing** - Weekly timesheet submission and approval workflow

---

## User Roles & Permissions

| Role | Access Level | Primary Responsibilities |
|------|-------------|-------------------------|
| **Admin** | Full Access | System configuration, user management, all modules |
| **Recruiter** | Leads, Candidates, Jobs | Lead pipeline management, candidate sourcing, job matching |
| **Compliance Officer** | Documents, Compliance | Verify credentials, monitor expiring documents |
| **Scheduler** | Assignments, Timesheets | Create placements, manage schedules, process timesheets |
| **Finance** | Timesheets, Reports | Approve timesheets, billing, financial reporting |
| **Nurse** | Own Profile Only | View assignments, submit timesheets, upload documents |

---

## The Recruitment Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        McCare Global ATS - Recruitment Cycle                 │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐
  │  LEAD    │───►│ CANDIDATE │───►│ MATCHING │───►│ PLACEMENT │───►│ BILLING │
  │ CAPTURE  │    │  PROFILE  │    │  & JOBS  │    │ ASSIGNMENT│    │TIMESHEET│
  └──────────┘    └───────────┘    └──────────┘    └───────────┘    └─────────┘
       │               │                │                │               │
       ▼               ▼                ▼                ▼               ▼
  ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐
  │ Pipeline │    │ Documents │    │ Facility │    │ Contract  │    │ Invoice │
  │  Stages  │    │ Compliance│    │ Job Order│    │  Active   │    │ Payment │
  └──────────┘    └───────────┘    └──────────┘    └───────────┘    └─────────┘
```

### Phase 1: Lead Capture & Nurturing
1. Leads enter the system (manual entry, HubSpot webhook, or other sources)
2. Recruiters move leads through pipeline stages
3. Qualified leads are converted to candidates

### Phase 2: Candidate Onboarding
1. Create detailed candidate profile
2. Upload and verify required documents
3. Track license expirations and certifications

### Phase 3: Job Matching
1. Facilities submit job orders
2. Match candidates to job requirements
3. Shortlist candidates for positions

### Phase 4: Assignment & Placement
1. Create assignment contract
2. Set pay rates and billing rates
3. Monitor credential compliance during assignment

### Phase 5: Timesheets & Billing
1. Nurses submit weekly timesheets
2. Schedulers/Finance approve timesheets
3. Generate billing data for invoicing

---

## Module-by-Module Instructions

### 1. Dashboard

The dashboard provides an at-a-glance overview of your recruitment operations.

**Key Metrics Displayed:**
- Total Leads
- Active Candidates
- Open Job Orders
- Active Assignments
- Expiring Credentials (30-day alert)
- Pending Timesheets

**Charts:**
- Leads by Pipeline Stage (bar chart)
- Candidates by Specialty (pie chart)

**Quick Actions:**
- Add New Lead
- View Candidates
- Manage Job Orders
- Check Compliance

---

### 2. Leads Module

**Purpose:** Track and nurture prospective nurse candidates through the recruitment pipeline.

#### Pipeline Stages:
1. **New Lead** - Initial contact/inquiry
2. **Contacted** - Recruiter has made contact
3. **Screening Scheduled** - Phone/video screening booked
4. **Application Submitted** - Formal application received
5. **Interview** - Interview process ongoing
6. **Offer** - Job offer extended
7. **Hired** - Offer accepted, ready to convert
8. **Rejected** - Did not proceed

#### How to Add a New Lead:
1. Click **"Add Lead"** button
2. Fill in required fields:
   - First Name, Last Name
   - Email (required)
   - Phone
   - Source (HubSpot, LinkedIn, Referral, etc.)
   - Specialty (ICU, ER, Med-Surg, etc.)
   - Province Preference
3. Click **"Add Lead"** to save

#### How to Move Leads Through Pipeline:
1. Find the lead card in the Kanban board
2. Click the **"..."** menu on the card
3. Select a new stage, OR
4. Use the quick stage buttons at the bottom of each card

#### How to Convert Lead to Candidate:
1. Click **"..."** menu on a qualified lead
2. Select **"Convert to Candidate"**
3. System creates candidate profile with lead data
4. Lead status changes to "Hired"

#### HubSpot Integration (Prepared):
- Webhook endpoint: `POST /api/webhooks/hubspot`
- Accepts lead data and creates new leads automatically
- Tags incoming leads with "hubspot" source

---

### 3. Candidates Module

**Purpose:** Manage nurse profiles, qualifications, and placement status.

#### Candidate Statuses:
- **Active** - Available for placement
- **Inactive** - Not currently seeking work
- **Do Not Place** - Flagged (compliance/performance issues)
- **On Assignment** - Currently placed at a facility
- **Completed** - Assignment finished

#### How to Add a New Candidate:
1. Click **"Add Candidate"** button
2. Complete the form sections:

**Personal Information:**
- First Name, Last Name, Preferred Name
- Email, Phone
- City, Province, Postal Code
- Work Eligibility (Citizen, PR, Work Permit)

**Professional Information:**
- Nurse Type (RN, RPN, LPN, NP)
- Primary Specialty
- Years of Experience
- Available Start Date
- Travel Willingness

3. Click **"Add Candidate"** to save

#### Candidate Profile Tabs:

**Overview Tab:**
- Contact information
- Professional details
- Notes and tags

**Documents Tab:**
- Upload credentials
- Track expiry dates
- Verify documents

**Activity Tab:**
- View all actions taken
- See status changes
- Track communications

**Assignments Tab:**
- View current/past placements
- Assignment history

---

### 4. Compliance Module

**Purpose:** Monitor document status and ensure all nurses have valid credentials.

#### Document Types Tracked:
- Nursing License (by province)
- Criminal Record Check (CRC)
- Immunization Records
- BLS/ACLS Certification
- Professional References
- Resume/CV
- Employment Contract
- Government ID
- Work Permit

#### Document Statuses:
- **Pending** - Uploaded, awaiting review
- **Verified** - Reviewed and approved
- **Expiring Soon** - Within 30 days of expiry
- **Expired** - Past expiration date

#### How to Verify a Document:
1. Go to **Compliance** page
2. Find document in the table
3. Click **"Verify"** button
4. Document status changes to "Verified"

#### Monitoring Expiring Documents:
1. Dashboard shows "Expiring Credentials" count
2. Compliance page highlights documents expiring within 30/60/90 days
3. Expired documents shown in red
4. Filter by days until expiry

---

### 5. Clients & Jobs Module

**Purpose:** Manage healthcare facility relationships and job orders.

#### Facilities Tab

**How to Add a Facility:**
1. Click **"Add Facility"** button
2. Enter facility details:
   - Facility Name
   - City, Province
   - Facility Type (Hospital, LTC, Clinic, etc.)
   - Main Contact Name
   - Contact Email & Phone
   - Billing Notes
3. Click **"Add Facility"** to save

#### Job Orders Tab

**Job Order Statuses:**
- **Open** - Actively seeking candidates
- **In Progress** - Candidates being interviewed/screened
- **Filled** - Position(s) filled
- **Closed** - Job order cancelled/completed

**How to Create a Job Order:**
1. Click **"Create Job Order"** button
2. Select the Facility
3. Enter job details:
   - Role (e.g., Registered Nurse)
   - Specialty required
   - Number of openings
   - Shift Type (Days, Nights, Rotation)
   - Start/End Dates
   - Required Experience (years)
   - Pay Rate ($/hr to nurse)
   - Bill Rate ($/hr to facility)
4. Click **"Create Job Order"** to save

**Updating Job Order Status:**
1. Find job order in table
2. Use status dropdown to change status
3. Status updates immediately

---

### 6. Assignments Module

**Purpose:** Create and manage nurse placements at facilities.

#### Assignment Statuses:
- **Scheduled** - Future start date
- **Active** - Currently ongoing
- **Completed** - Assignment finished
- **Cancelled** - Assignment terminated early

#### Contract Types:
- **Travel** - 13-week travel nursing contract
- **Local** - Local/regional placement
- **Per Diem** - Day-by-day as needed

#### How to Create an Assignment:
1. Click **"Create Assignment"** button
2. Select **Candidate** (from active candidates)
3. Optionally select **Job Order** (auto-fills details)
4. Select **Facility**
5. Set contract details:
   - Start Date, End Date
   - Contract Type
   - Weekly Hours
   - Pay Rate (regular, OT, holiday)
   - Bill Rate
   - Shift Pattern
6. Click **"Create Assignment"** to save

#### Credential Warnings:
- System automatically checks if any candidate credentials expire during assignment period
- Warnings displayed on assignment row
- Allows proactive credential renewal

---

### 7. Timesheets Module

**Purpose:** Track hours worked and generate billing data.

#### Timesheet Statuses:
- **Draft** - Created, not yet submitted
- **Submitted** - Sent for approval
- **Approved** - Verified, ready for billing
- **Processed** - Invoiced/paid

#### How to Create a Timesheet:
1. Click **"Create Timesheet"** button
2. Select **Assignment** (shows candidate @ facility)
3. Select **Week Start Date**
4. System auto-calculates week end and generates daily entries
5. Click **"Create Timesheet"** to save

#### Timesheet Workflow:

```
┌─────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐
│  Draft  │────►│ Submitted │────►│ Approved │────►│ Processed │
└─────────┘     └───────────┘     └──────────┘     └───────────┘
     │               │                  │                │
  Nurse/         Scheduler/         Finance          Accounting
 Scheduler        Finance                            (External)
```

1. **Create** - Scheduler or Nurse creates timesheet
2. **Submit** - Click "Submit" button when hours are complete
3. **Approve** - Finance/Scheduler clicks "Approve" 
4. **Process** - Mark as processed after invoicing

#### Billing Calculation:
- **Regular Hours** × Bill Rate = Regular Billable
- **OT Hours** × Bill Rate × 1.5 = OT Billable
- **Total Billable** = Regular + OT amounts

---

### 8. Reports Module

**Purpose:** Analytics and financial reporting.

#### Available Reports:

**KPI Dashboard:**
- Total Leads
- Active Candidates
- Active Assignments
- Total Revenue (approved timesheets)

**Charts:**
- Lead Pipeline Distribution
- Candidates by Specialty

**Billing Summary:**
- Revenue by Facility
- Hours by Period
- Timesheet counts

---

### 9. Settings Module

**Purpose:** System configuration and user management.

#### Profile Tab (All Users):
- View your account details
- See your role and permissions

#### Users Tab (Admin Only):
- View all registered users
- See user roles and join dates

#### System Tab (Admin Only):
- **Seed Database** - Reset with demo data
- View demo credentials for testing

---

## Workflow Diagrams

### Complete Recruitment Flow

```
                                    McCare Global ATS
                                  Complete Recruitment Flow
                                  
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   LEAD SOURCES                    RECRUITMENT                   OPERATIONS      │
│   ───────────                     ──────────                   ──────────      │
│                                                                                 │
│   ┌──────────┐                                                                  │
│   │ HubSpot  │──┐                                                              │
│   └──────────┘  │     ┌──────────────────┐                                     │
│                 │     │                  │    ┌────────────┐                   │
│   ┌──────────┐  ├────►│  LEADS PIPELINE  │───►│ CANDIDATE  │                   │
│   │ LinkedIn │──┤     │                  │    │  PROFILE   │                   │
│   └──────────┘  │     │  New Lead        │    └─────┬──────┘                   │
│                 │     │  Contacted       │          │                          │
│   ┌──────────┐  │     │  Screening       │    ┌─────▼──────┐                   │
│   │ Referral │──┤     │  Application     │    │ COMPLIANCE │                   │
│   └──────────┘  │     │  Interview       │    │ DOCUMENTS  │                   │
│                 │     │  Offer           │    └─────┬──────┘                   │
│   ┌──────────┐  │     │  Hired ─────────►│          │                          │
│   │  Direct  │──┘     │  Rejected        │          │                          │
│   └──────────┘        └──────────────────┘          │                          │
│                                                     │                          │
│   ┌──────────────────────────────────────────────────┘                          │
│   │                                                                             │
│   │     ┌────────────┐         ┌─────────────┐         ┌────────────┐          │
│   └────►│ JOB ORDER  │────────►│ ASSIGNMENT  │────────►│ TIMESHEET  │          │
│         │            │         │             │         │            │          │
│         │ Facility   │         │ Start Date  │         │ Hours      │          │
│         │ Role       │         │ End Date    │         │ Billable   │          │
│         │ Specialty  │         │ Pay Rate    │         │ Status     │          │
│         │ Pay/Bill   │         │ Bill Rate   │         │            │          │
│         └────────────┘         └─────────────┘         └─────┬──────┘          │
│                                                              │                 │
│                                                        ┌─────▼──────┐          │
│                                                        │  BILLING   │          │
│                                                        │  REPORTS   │          │
│                                                        └────────────┘          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Timesheet Approval Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Timesheet Approval Workflow                   │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────┐                                      
    │  NURSE  │                                      
    │ submits │                                      
    │  hours  │                                      
    └────┬────┘                                      
         │                                           
         ▼                                           
    ┌─────────┐         ┌──────────┐                
    │  DRAFT  │────────►│SUBMITTED │                
    └─────────┘         └────┬─────┘                
                             │                       
                             ▼                       
                     ┌───────────────┐               
                     │   SCHEDULER   │               
                     │   reviews     │               
                     └───────┬───────┘               
                             │                       
              ┌──────────────┼──────────────┐        
              ▼              │              ▼        
        ┌──────────┐         │        ┌──────────┐  
        │ REJECTED │         │        │ APPROVED │  
        │ (notes)  │         │        └────┬─────┘  
        └──────────┘         │             │        
                             │             ▼        
                             │       ┌──────────┐   
                             │       │ FINANCE  │   
                             │       │ reviews  │   
                             │       └────┬─────┘   
                             │             │        
                             │             ▼        
                             │       ┌──────────┐   
                             │       │PROCESSED │   
                             │       │(invoiced)│   
                             │       └──────────┘   
                             │                      
                             ▼                      
                     ┌───────────────┐              
                     │   BILLING     │              
                     │   generated   │              
                     └───────────────┘              
```

---

## Demo Credentials

Use these accounts to test different role perspectives:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mccareglobal.com | admin123 |
| Recruiter | recruiter@mccareglobal.com | recruiter123 |
| Compliance Officer | compliance@mccareglobal.com | compliance123 |
| Scheduler | scheduler@mccareglobal.com | scheduler123 |
| Finance | finance@mccareglobal.com | finance123 |
| Nurse | nurse@mccareglobal.com | nurse123 |

---

## Quick Start Guide

### For Recruiters:
1. Login with recruiter credentials
2. Go to **Leads** → Add new leads or work existing pipeline
3. Move leads through stages as you engage them
4. Convert qualified leads to candidates
5. Match candidates to job orders

### For Compliance Officers:
1. Login with compliance credentials
2. Go to **Compliance** → Review expiring documents
3. Verify pending documents
4. Alert recruiters about credential issues

### For Schedulers:
1. Login with scheduler credentials
2. Go to **Clients & Jobs** → Create job orders
3. Go to **Assignments** → Place candidates at facilities
4. Go to **Timesheets** → Create and manage timesheets

### For Finance:
1. Login with finance credentials
2. Go to **Timesheets** → Approve submitted timesheets
3. Go to **Reports** → View billing summaries
4. Generate invoice data from approved timesheets

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Leads
- `GET /api/leads` - List leads (with filters)
- `POST /api/leads` - Create lead
- `PUT /api/leads/{id}` - Update lead
- `DELETE /api/leads/{id}` - Delete lead
- `POST /api/leads/{id}/convert` - Convert to candidate

### Candidates
- `GET /api/candidates` - List candidates
- `POST /api/candidates` - Create candidate
- `GET /api/candidates/{id}` - Get candidate details
- `PUT /api/candidates/{id}` - Update candidate
- `DELETE /api/candidates/{id}` - Delete candidate

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `PUT /api/documents/{id}` - Update/verify document
- `GET /api/compliance/expiring` - Get expiring documents

### Facilities
- `GET /api/facilities` - List facilities
- `POST /api/facilities` - Create facility
- `PUT /api/facilities/{id}` - Update facility
- `DELETE /api/facilities/{id}` - Delete facility

### Job Orders
- `GET /api/job-orders` - List job orders
- `POST /api/job-orders` - Create job order
- `PUT /api/job-orders/{id}` - Update job order
- `POST /api/job-orders/{id}/candidates/{candidate_id}` - Shortlist candidate

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/{id}` - Update assignment

### Timesheets
- `GET /api/timesheets` - List timesheets
- `POST /api/timesheets` - Create timesheet
- `POST /api/timesheets/{id}/submit` - Submit for approval
- `POST /api/timesheets/{id}/approve` - Approve timesheet

### Dashboard & Reports
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/invoices` - Billing summary data

### System
- `POST /api/seed` - Seed database with demo data
- `GET /api/document-types` - List document types

---

## Support

**Company:** McCare Global Healthcare Services Inc.

**Tagline:** *Your Global Partner in Healthcare Opportunities*

For technical support or questions about the ATS, contact your system administrator.

---

*Documentation Version: 1.0*
*Last Updated: February 2026*
