from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import shutil
import aiofiles
from io import BytesIO

# Import Storage Provider abstraction
from storage_provider import get_storage_provider, LocalStorageProvider

# Import Notification Service
from notification_service import NotificationService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# File Upload Settings
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt'}

# Initialize storage provider (LocalStorageProvider for MVP, can swap to S3/GCS later)
storage_provider = get_storage_provider()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize notification service
notification_service = NotificationService(db)

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="McCare Global ATS API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRole(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    permissions: List[str] = []

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "Nurse"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Lead Models
class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    source: Optional[str] = "Direct"
    specialty: Optional[str] = None
    province_preference: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    specialty: Optional[str] = None
    province_preference: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    stage: Optional[str] = None
    recruiter_id: Optional[str] = None

# Public Lead Submission (no auth required)
class PublicLeadSubmission(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    specialty: Optional[str] = None
    province_preference: Optional[str] = None
    notes: Optional[str] = None
    # UTM/Campaign tracking
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    # Form metadata
    form_id: Optional[str] = None
    landing_page_url: Optional[str] = None
    referrer_url: Optional[str] = None

# Lead Capture Settings Model
class AutoTagRule(BaseModel):
    field: str  # e.g., "province_preference"
    value: str  # e.g., "Ontario"
    tag: str    # e.g., "ontario-lead"

class LeadCaptureSettings(BaseModel):
    required_fields: List[str] = ["first_name", "last_name", "email"]
    optional_fields: List[str] = ["phone", "specialty", "province_preference", "notes"]
    default_pipeline_stage: str = "New Lead"
    default_recruiter_id: Optional[str] = None
    auto_tag_rules: List[AutoTagRule] = []
    auto_convert_to_candidate: bool = False
    notify_on_new_lead: bool = True
    allowed_sources: List[str] = ["ATS Form", "API", "HubSpot", "Website", "Landing Page"]

# HubSpot Webhook Payload
class HubSpotWebhookPayload(BaseModel):
    properties: Optional[dict] = None
    form_id: Optional[str] = None
    portal_id: Optional[str] = None
    campaign_name: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None

# Lead Audit Log Entry
class LeadAuditLogEntry(BaseModel):
    id: str
    lead_id: str
    source: str
    timestamp: str
    payload_summary: dict
    auto_populated_fields: List[str]
    auto_tags_applied: List[str]
    recruiter_assigned: Optional[str] = None
    auto_converted: bool = False

# Candidate Models
class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    preferred_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Canada"
    work_eligibility: Optional[str] = None
    nurse_type: Optional[str] = None
    primary_specialty: Optional[str] = None
    years_of_experience: Optional[int] = None
    desired_locations: List[str] = []
    travel_willingness: bool = True
    start_date_availability: Optional[str] = None
    status: str = "Active"
    tags: List[str] = []
    notes: Optional[str] = None
    lead_id: Optional[str] = None

class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    preferred_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    work_eligibility: Optional[str] = None
    nurse_type: Optional[str] = None
    primary_specialty: Optional[str] = None
    years_of_experience: Optional[int] = None
    desired_locations: Optional[List[str]] = None
    travel_willingness: Optional[bool] = None
    start_date_availability: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

# Document Models
class DocumentCreate(BaseModel):
    candidate_id: str
    document_type: str
    file_url: str
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = None

class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    file_url: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = None
    verified_by: Optional[str] = None
    notes: Optional[str] = None

# Facility Models
class FacilityCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    facility_type: str = "Hospital"
    main_contact_name: Optional[str] = None
    main_contact_email: Optional[str] = None
    main_contact_phone: Optional[str] = None
    billing_notes: Optional[str] = None

class FacilityUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    facility_type: Optional[str] = None
    main_contact_name: Optional[str] = None
    main_contact_email: Optional[str] = None
    main_contact_phone: Optional[str] = None
    billing_notes: Optional[str] = None

# Job Order Models
class JobOrderCreate(BaseModel):
    facility_id: str
    role: str
    specialty: str
    openings: int = 1
    shift_type: str = "Days"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    required_experience: Optional[int] = None
    required_credentials: List[str] = []
    pay_rate: Optional[float] = None
    bill_rate: Optional[float] = None
    notes: Optional[str] = None

class JobOrderUpdate(BaseModel):
    facility_id: Optional[str] = None
    role: Optional[str] = None
    specialty: Optional[str] = None
    openings: Optional[int] = None
    shift_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    required_experience: Optional[int] = None
    required_credentials: Optional[List[str]] = None
    pay_rate: Optional[float] = None
    bill_rate: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# Assignment Models
class AssignmentCreate(BaseModel):
    candidate_id: str
    job_order_id: str
    facility_id: str
    start_date: str
    end_date: str
    shift_pattern: Optional[str] = None
    contract_type: str = "Travel"
    pay_rate_regular: Optional[float] = None
    pay_rate_ot: Optional[float] = None
    pay_rate_holiday: Optional[float] = None
    bill_rate: Optional[float] = None
    weekly_hours: float = 36.0
    notes: Optional[str] = None

class AssignmentUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    shift_pattern: Optional[str] = None
    contract_type: Optional[str] = None
    pay_rate_regular: Optional[float] = None
    pay_rate_ot: Optional[float] = None
    pay_rate_holiday: Optional[float] = None
    bill_rate: Optional[float] = None
    weekly_hours: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# Timesheet Models
class TimesheetEntryCreate(BaseModel):
    day: str
    regular_hours: float = 0
    ot_hours: float = 0

class TimesheetCreate(BaseModel):
    assignment_id: str
    candidate_id: str
    week_start: str
    week_end: str
    entries: List[TimesheetEntryCreate] = []
    notes: Optional[str] = None

class TimesheetUpdate(BaseModel):
    entries: Optional[List[TimesheetEntryCreate]] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# Activity Model
class ActivityCreate(BaseModel):
    entity_type: str
    entity_id: str
    activity_type: str
    description: str
    user_id: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize_doc(doc):
    """Remove _id and convert ObjectId to string"""
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user_dict["id"], "role": user_dict["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            first_name=user_dict["first_name"],
            last_name=user_dict["last_name"],
            role=user_dict["role"],
            created_at=user_dict["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            role=user["role"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

# ==================== LEADS ENDPOINTS ====================

@api_router.get("/leads")
async def get_leads(
    stage: Optional[str] = None,
    specialty: Optional[str] = None,
    province: Optional[str] = None,
    recruiter_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if stage:
        query["stage"] = stage
    if specialty:
        query["specialty"] = specialty
    if province:
        query["province_preference"] = province
    if recruiter_id:
        query["recruiter_id"] = recruiter_id
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(1000)
    return leads

@api_router.post("/leads")
async def create_lead(lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    lead_dict = lead.model_dump()
    lead_dict["id"] = str(uuid.uuid4())
    lead_dict["stage"] = "New Lead"
    lead_dict["recruiter_id"] = current_user["id"]
    lead_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    lead_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.insert_one(lead_dict)
    
    # Log activity
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "lead",
        "entity_id": lead_dict["id"],
        "activity_type": "created",
        "description": f"Lead created: {lead.first_name} {lead.last_name}",
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return serialize_doc(lead_dict)

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, lead_update: LeadUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Log stage change if applicable
    if "stage" in update_data:
        await db.activities.insert_one({
            "id": str(uuid.uuid4()),
            "entity_type": "lead",
            "entity_id": lead_id,
            "activity_type": "stage_change",
            "description": f"Stage changed to: {update_data['stage']}",
            "user_id": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return lead

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}

@api_router.post("/leads/{lead_id}/convert")
async def convert_lead_to_candidate(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Create candidate from lead
    candidate_dict = {
        "id": str(uuid.uuid4()),
        "first_name": lead["first_name"],
        "last_name": lead["last_name"],
        "email": lead["email"],
        "phone": lead.get("phone"),
        "primary_specialty": lead.get("specialty"),
        "province": lead.get("province_preference"),
        "tags": lead.get("tags", []),
        "notes": lead.get("notes"),
        "status": "Active",
        "lead_id": lead_id,
        "country": "Canada",
        "desired_locations": [],
        "travel_willingness": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.candidates.insert_one(candidate_dict)
    
    # Update lead stage
    await db.leads.update_one({"id": lead_id}, {"$set": {"stage": "Hired", "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    # Log activity
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "lead",
        "entity_id": lead_id,
        "activity_type": "converted",
        "description": f"Lead converted to candidate: {candidate_dict['id']}",
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return serialize_doc(candidate_dict)

# ==================== LEAD CAPTURE & INTAKE SYSTEM ====================

async def get_lead_capture_settings():
    """Get or create default lead capture settings"""
    settings = await db.lead_capture_settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        settings = {
            "id": str(uuid.uuid4()),
            "required_fields": ["first_name", "last_name", "email"],
            "optional_fields": ["phone", "specialty", "province_preference", "notes"],
            "default_pipeline_stage": "New Lead",
            "default_recruiter_id": None,
            "auto_tag_rules": [
                {"field": "province_preference", "value": "Ontario", "tag": "ontario-lead"},
                {"field": "province_preference", "value": "British Columbia", "tag": "bc-lead"},
                {"field": "province_preference", "value": "Alberta", "tag": "alberta-lead"},
            ],
            "auto_convert_to_candidate": False,
            "notify_on_new_lead": True,
            "allowed_sources": ["ATS Form", "API", "HubSpot", "Website", "Landing Page"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.lead_capture_settings.insert_one(settings)
    return settings

async def apply_auto_tags(lead_data: dict, rules: list) -> List[str]:
    """Apply auto-tagging rules based on lead data"""
    applied_tags = []
    for rule in rules:
        field_value = lead_data.get(rule.get("field"))
        if field_value and field_value.lower() == rule.get("value", "").lower():
            applied_tags.append(rule.get("tag"))
    return applied_tags

async def create_lead_audit_log(lead_id: str, source: str, payload: dict, auto_fields: list, auto_tags: list, recruiter_id: str = None, auto_converted: bool = False):
    """Create audit log entry for lead intake"""
    audit_entry = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "source": source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload_summary": {
            "email": payload.get("email"),
            "name": f"{payload.get('first_name', '')} {payload.get('last_name', '')}",
            "specialty": payload.get("specialty"),
            "province": payload.get("province_preference"),
            "utm_source": payload.get("utm_source"),
            "utm_campaign": payload.get("utm_campaign"),
            "form_id": payload.get("form_id"),
            "landing_page": payload.get("landing_page_url"),
        },
        "auto_populated_fields": auto_fields,
        "auto_tags_applied": auto_tags,
        "recruiter_assigned": recruiter_id,
        "auto_converted": auto_converted
    }
    await db.lead_audit_logs.insert_one(audit_entry)
    return audit_entry

async def process_lead_intake(lead_data: dict, source: str) -> dict:
    """Central lead processing function for all intake sources"""
    settings = await get_lead_capture_settings()
    
    # Generate lead ID
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Build tags list
    tags = lead_data.get("tags", [])
    tags.append(source.lower().replace(" ", "-"))
    
    # Apply auto-tagging rules
    auto_tags = await apply_auto_tags(lead_data, settings.get("auto_tag_rules", []))
    tags.extend(auto_tags)
    tags = list(set(tags))  # Remove duplicates
    
    # Build lead document
    lead_dict = {
        "id": lead_id,
        "first_name": lead_data.get("first_name", "Unknown"),
        "last_name": lead_data.get("last_name", ""),
        "email": lead_data.get("email", ""),
        "phone": lead_data.get("phone"),
        "source": source,
        "specialty": lead_data.get("specialty"),
        "province_preference": lead_data.get("province_preference"),
        "tags": tags,
        "notes": lead_data.get("notes"),
        "stage": settings.get("default_pipeline_stage", "New Lead"),
        "recruiter_id": settings.get("default_recruiter_id"),
        # UTM/Campaign tracking
        "utm_source": lead_data.get("utm_source"),
        "utm_medium": lead_data.get("utm_medium"),
        "utm_campaign": lead_data.get("utm_campaign"),
        "utm_term": lead_data.get("utm_term"),
        "utm_content": lead_data.get("utm_content"),
        # Form metadata
        "form_id": lead_data.get("form_id"),
        "landing_page_url": lead_data.get("landing_page_url"),
        "referrer_url": lead_data.get("referrer_url"),
        # HubSpot metadata
        "hubspot_form_id": lead_data.get("hubspot_form_id"),
        "hubspot_portal_id": lead_data.get("hubspot_portal_id"),
        "campaign_name": lead_data.get("campaign_name"),
        # Timestamps
        "created_at": now,
        "updated_at": now
    }
    
    # Insert lead
    await db.leads.insert_one(lead_dict)
    
    # Log activity
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "lead",
        "entity_id": lead_id,
        "activity_type": "created",
        "description": f"Lead captured from {source}: {lead_dict['first_name']} {lead_dict['last_name']}",
        "user_id": settings.get("default_recruiter_id"),
        "created_at": now
    })
    
    # Auto-populate fields tracking
    auto_populated = []
    if settings.get("default_recruiter_id"):
        auto_populated.append("recruiter_id")
    if auto_tags:
        auto_populated.append("tags")
    
    # Auto-convert to candidate if enabled and required fields present
    auto_converted = False
    candidate_id = None
    if settings.get("auto_convert_to_candidate"):
        required = settings.get("required_fields", [])
        has_all_required = all(lead_dict.get(f) for f in required)
        if has_all_required:
            candidate_dict = {
                "id": str(uuid.uuid4()),
                "first_name": lead_dict["first_name"],
                "last_name": lead_dict["last_name"],
                "email": lead_dict["email"],
                "phone": lead_dict.get("phone"),
                "primary_specialty": lead_dict.get("specialty"),
                "province": lead_dict.get("province_preference"),
                "tags": lead_dict.get("tags", []),
                "notes": lead_dict.get("notes"),
                "status": "Active",
                "lead_id": lead_id,
                "country": "Canada",
                "desired_locations": [],
                "travel_willingness": True,
                "created_at": now,
                "updated_at": now
            }
            await db.candidates.insert_one(candidate_dict)
            candidate_id = candidate_dict["id"]
            auto_converted = True
            await db.leads.update_one({"id": lead_id}, {"$set": {"stage": "Hired", "updated_at": now}})
    
    # Create audit log
    await create_lead_audit_log(
        lead_id=lead_id,
        source=source,
        payload=lead_data,
        auto_fields=auto_populated,
        auto_tags=auto_tags,
        recruiter_id=settings.get("default_recruiter_id"),
        auto_converted=auto_converted
    )
    
    result = serialize_doc(lead_dict)
    if auto_converted:
        result["auto_converted"] = True
        result["candidate_id"] = candidate_id
    
    return result

# Public Lead Submission Endpoint (No Auth Required)
@api_router.post("/public/leads")
async def submit_public_lead(lead: PublicLeadSubmission):
    """
    Public endpoint for submitting leads from external websites and forms.
    No authentication required. Can be called from landing pages, embedded forms, etc.
    """
    try:
        lead_data = lead.model_dump()
        lead_data["source"] = "API"
        
        # Check if email already exists
        existing = await db.leads.find_one({"email": lead.email})
        if existing:
            # Update existing lead instead of creating duplicate
            update_data = {k: v for k, v in lead_data.items() if v is not None}
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.leads.update_one({"email": lead.email}, {"$set": update_data})
            
            # Create audit log for update
            await create_lead_audit_log(
                lead_id=existing["id"],
                source="API (Update)",
                payload=lead_data,
                auto_fields=[],
                auto_tags=[],
                auto_converted=False
            )
            
            return {"status": "updated", "lead_id": existing["id"], "message": "Lead updated with new information"}
        
        result = await process_lead_intake(lead_data, "API")
        return {"status": "success", "lead_id": result["id"], "auto_converted": result.get("auto_converted", False)}
    except Exception as e:
        logger.error(f"Public lead submission error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Built-in ATS Form Submission Endpoint
@api_router.post("/public/form-submit")
async def submit_form_lead(payload: dict):
    """
    Endpoint for the built-in ATS lead capture form.
    Accepts form data and creates a lead with "ATS Form" source.
    """
    try:
        lead_data = {
            "first_name": payload.get("first_name", payload.get("firstName", "")),
            "last_name": payload.get("last_name", payload.get("lastName", "")),
            "email": payload.get("email", ""),
            "phone": payload.get("phone", ""),
            "specialty": payload.get("specialty", payload.get("specialization", "")),
            "province_preference": payload.get("province_preference", payload.get("province", "")),
            "notes": payload.get("notes", payload.get("message", "")),
            "utm_source": payload.get("utm_source"),
            "utm_medium": payload.get("utm_medium"),
            "utm_campaign": payload.get("utm_campaign"),
            "form_id": payload.get("form_id", "ats-default-form"),
            "landing_page_url": payload.get("landing_page_url"),
            "referrer_url": payload.get("referrer_url"),
        }
        
        if not lead_data["email"]:
            raise HTTPException(status_code=400, detail="Email is required")
        
        result = await process_lead_intake(lead_data, "ATS Form")
        return {
            "status": "success", 
            "lead_id": result["id"],
            "message": "Thank you! We'll be in touch soon.",
            "auto_converted": result.get("auto_converted", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Form submission error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Enhanced HubSpot Webhook Endpoint
@api_router.post("/webhooks/hubspot")
async def hubspot_webhook(payload: dict):
    """
    Accept incoming leads from HubSpot webhook.
    Supports standard HubSpot form submission payloads.
    Captures UTM parameters, form IDs, campaign names, etc.
    """
    try:
        # Extract properties from various HubSpot payload formats
        properties = payload.get("properties", {})
        if not properties:
            properties = payload
        
        # Map HubSpot field names to our schema
        lead_data = {
            "first_name": properties.get("firstname", properties.get("first_name", "Unknown")),
            "last_name": properties.get("lastname", properties.get("last_name", "")),
            "email": properties.get("email", ""),
            "phone": properties.get("phone", properties.get("mobilephone", "")),
            "specialty": properties.get("specialty", properties.get("nursing_specialty", "")),
            "province_preference": properties.get("province", properties.get("state", "")),
            "notes": properties.get("message", properties.get("notes", "")),
            # UTM tracking
            "utm_source": properties.get("utm_source", payload.get("utm_source")),
            "utm_medium": properties.get("utm_medium", payload.get("utm_medium")),
            "utm_campaign": properties.get("utm_campaign", payload.get("utm_campaign")),
            "utm_term": properties.get("utm_term"),
            "utm_content": properties.get("utm_content"),
            # HubSpot metadata
            "hubspot_form_id": payload.get("formGuid", payload.get("form_id")),
            "hubspot_portal_id": payload.get("portalId", payload.get("portal_id")),
            "campaign_name": payload.get("campaign", payload.get("campaign_name")),
            "form_id": payload.get("formGuid", "hubspot-webhook"),
        }
        
        if not lead_data["email"]:
            # Try to extract email from nested structures
            if "email" in str(payload):
                for key, value in payload.items():
                    if isinstance(value, dict) and "email" in value:
                        lead_data["email"] = value["email"]
                        break
        
        # Check for existing lead by email
        if lead_data["email"]:
            existing = await db.leads.find_one({"email": lead_data["email"]})
            if existing:
                # Update existing lead
                update_data = {k: v for k, v in lead_data.items() if v}
                update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
                update_data["source"] = "HubSpot"  # Update source
                await db.leads.update_one({"email": lead_data["email"]}, {"$set": update_data})
                
                await create_lead_audit_log(
                    lead_id=existing["id"],
                    source="HubSpot (Update)",
                    payload=lead_data,
                    auto_fields=[],
                    auto_tags=[],
                    auto_converted=False
                )
                
                return {"status": "updated", "lead_id": existing["id"]}
        
        result = await process_lead_intake(lead_data, "HubSpot")
        return {
            "status": "success", 
            "lead_id": result["id"],
            "auto_converted": result.get("auto_converted", False)
        }
    except Exception as e:
        logger.error(f"HubSpot webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Landing Page Submission Endpoint
@api_router.post("/public/landing-page")
async def landing_page_submission(payload: dict):
    """
    Endpoint for landing page form submissions.
    Specifically designed for external landing pages with custom forms.
    """
    try:
        lead_data = {
            "first_name": payload.get("first_name", payload.get("firstName", payload.get("name", "").split()[0] if payload.get("name") else "")),
            "last_name": payload.get("last_name", payload.get("lastName", payload.get("name", "").split()[-1] if payload.get("name") and len(payload.get("name", "").split()) > 1 else "")),
            "email": payload.get("email", ""),
            "phone": payload.get("phone", payload.get("telephone", "")),
            "specialty": payload.get("specialty", payload.get("specialization", payload.get("nursing_type", ""))),
            "province_preference": payload.get("province", payload.get("province_preference", payload.get("location", ""))),
            "notes": payload.get("notes", payload.get("message", payload.get("comments", ""))),
            "utm_source": payload.get("utm_source"),
            "utm_medium": payload.get("utm_medium"),
            "utm_campaign": payload.get("utm_campaign"),
            "utm_term": payload.get("utm_term"),
            "utm_content": payload.get("utm_content"),
            "form_id": payload.get("form_id", "landing-page"),
            "landing_page_url": payload.get("landing_page_url", payload.get("page_url")),
            "referrer_url": payload.get("referrer_url", payload.get("referrer")),
        }
        
        if not lead_data["email"]:
            raise HTTPException(status_code=400, detail="Email is required")
        
        result = await process_lead_intake(lead_data, "Landing Page")
        return {
            "status": "success",
            "lead_id": result["id"],
            "message": "Lead captured successfully",
            "auto_converted": result.get("auto_converted", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Landing page submission error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== LEAD CAPTURE SETTINGS ENDPOINTS ====================

@api_router.get("/lead-capture/settings")
async def get_lead_settings(current_user: dict = Depends(get_current_user)):
    """Get current lead capture settings"""
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    settings = await get_lead_capture_settings()
    return settings

@api_router.put("/lead-capture/settings")
async def update_lead_settings(settings_update: dict, current_user: dict = Depends(get_current_user)):
    """Update lead capture settings"""
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings_update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.lead_capture_settings.find_one({})
    if existing:
        await db.lead_capture_settings.update_one({}, {"$set": settings_update})
    else:
        settings_update["id"] = str(uuid.uuid4())
        settings_update["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.lead_capture_settings.insert_one(settings_update)
    
    return await get_lead_capture_settings()

@api_router.get("/lead-capture/embed-code")
async def get_embed_code(current_user: dict = Depends(get_current_user)):
    """Generate embeddable form code for external websites"""
    if current_user["role"] not in ["Admin", "Recruiter"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    backend_url = os.environ.get('BACKEND_URL', 'https://mccare-ats-hub.preview.emergentagent.com')
    
    embed_html = f'''<!-- McCare Global ATS Lead Capture Form -->
<div id="mccare-lead-form"></div>
<script>
(function() {{
  var formContainer = document.getElementById('mccare-lead-form');
  var form = document.createElement('form');
  form.id = 'mccare-capture-form';
  form.style.cssText = 'max-width:500px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;';
  
  var fields = [
    {{name: 'first_name', label: 'First Name', type: 'text', required: true}},
    {{name: 'last_name', label: 'Last Name', type: 'text', required: true}},
    {{name: 'email', label: 'Email', type: 'email', required: true}},
    {{name: 'phone', label: 'Phone', type: 'tel', required: false}},
    {{name: 'specialty', label: 'Nursing Specialty', type: 'select', options: ['', 'ICU', 'ER', 'Med-Surg', 'OR', 'Pediatrics', 'NICU', 'L&D', 'Cardiac', 'Oncology', 'Psych']}},
    {{name: 'province_preference', label: 'Province Preference', type: 'select', options: ['', 'Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick']}},
    {{name: 'notes', label: 'Message', type: 'textarea', required: false}}
  ];
  
  fields.forEach(function(field) {{
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom:16px;';
    
    var label = document.createElement('label');
    label.textContent = field.label + (field.required ? ' *' : '');
    label.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;color:#374151;';
    wrapper.appendChild(label);
    
    var input;
    if (field.type === 'select') {{
      input = document.createElement('select');
      field.options.forEach(function(opt) {{
        var option = document.createElement('option');
        option.value = opt;
        option.textContent = opt || 'Select...';
        input.appendChild(option);
      }});
    }} else if (field.type === 'textarea') {{
      input = document.createElement('textarea');
      input.rows = 3;
    }} else {{
      input = document.createElement('input');
      input.type = field.type;
    }}
    
    input.name = field.name;
    input.required = field.required;
    input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box;';
    wrapper.appendChild(input);
    form.appendChild(wrapper);
  }});
  
  // Hidden fields for tracking
  var hiddenFields = ['utm_source', 'utm_medium', 'utm_campaign', 'landing_page_url', 'referrer_url'];
  hiddenFields.forEach(function(name) {{
    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = name;
    form.appendChild(hidden);
  }});
  
  // Submit button
  var submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Submit Application';
  submitBtn.style.cssText = 'width:100%;padding:12px;background:#ff0000;color:white;border:none;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer;';
  form.appendChild(submitBtn);
  
  // Status message
  var status = document.createElement('div');
  status.id = 'mccare-status';
  status.style.cssText = 'margin-top:12px;padding:10px;border-radius:6px;display:none;';
  form.appendChild(status);
  
  formContainer.appendChild(form);
  
  // Populate UTM params
  var params = new URLSearchParams(window.location.search);
  form.querySelector('[name="utm_source"]').value = params.get('utm_source') || '';
  form.querySelector('[name="utm_medium"]').value = params.get('utm_medium') || '';
  form.querySelector('[name="utm_campaign"]').value = params.get('utm_campaign') || '';
  form.querySelector('[name="landing_page_url"]').value = window.location.href;
  form.querySelector('[name="referrer_url"]').value = document.referrer;
  
  // Form submission
  form.addEventListener('submit', function(e) {{
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    var formData = {{}};
    new FormData(form).forEach(function(value, key) {{
      formData[key] = value;
    }});
    formData.form_id = 'mccare-embed-form';
    
    fetch('{backend_url}/api/public/form-submit', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify(formData)
    }})
    .then(function(r) {{ return r.json(); }})
    .then(function(data) {{
      status.style.display = 'block';
      if (data.status === 'success') {{
        status.style.background = '#d1fae5';
        status.style.color = '#065f46';
        status.textContent = 'Thank you! We will be in touch soon.';
        form.reset();
      }} else {{
        status.style.background = '#fee2e2';
        status.style.color = '#991b1b';
        status.textContent = data.detail || 'Something went wrong. Please try again.';
      }}
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }})
    .catch(function(err) {{
      status.style.display = 'block';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = 'Network error. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }});
  }});
}})();
</script>
<!-- End McCare Global ATS Lead Capture Form -->'''
    
    return {
        "embed_code": embed_html,
        "api_endpoint": f"{backend_url}/api/public/leads",
        "form_endpoint": f"{backend_url}/api/public/form-submit",
        "hubspot_webhook": f"{backend_url}/api/webhooks/hubspot",
        "landing_page_endpoint": f"{backend_url}/api/public/landing-page"
    }

# ==================== LEAD AUDIT LOG ENDPOINTS ====================

@api_router.get("/lead-audit-logs")
async def get_lead_audit_logs(
    lead_id: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    current_user: dict = Depends(get_current_user)
):
    """Get lead intake audit logs"""
    if current_user["role"] not in ["Admin", "Recruiter"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    if source:
        query["source"] = {"$regex": source, "$options": "i"}
    
    logs = await db.lead_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

@api_router.get("/lead-audit-logs/{log_id}")
async def get_audit_log_detail(log_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed audit log entry"""
    if current_user["role"] not in ["Admin", "Recruiter"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    log = await db.lead_audit_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log

@api_router.get("/lead-intake/stats")
async def get_lead_intake_stats(current_user: dict = Depends(get_current_user)):
    """Get lead intake statistics by source"""
    if current_user["role"] not in ["Admin", "Recruiter"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get counts by source
    pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    source_counts = await db.leads.aggregate(pipeline).to_list(100)
    
    # Get recent leads count (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_count = await db.leads.count_documents({"created_at": {"$gte": week_ago}})
    
    # Get auto-converted count
    auto_converted = await db.lead_audit_logs.count_documents({"auto_converted": True})
    
    return {
        "by_source": {item["_id"] or "Unknown": item["count"] for item in source_counts},
        "last_7_days": recent_count,
        "auto_converted_total": auto_converted,
        "total_leads": await db.leads.count_documents({})
    }

# ==================== CANDIDATES ENDPOINTS ====================

@api_router.get("/candidates")
async def get_candidates(
    status: Optional[str] = None,
    specialty: Optional[str] = None,
    province: Optional[str] = None,
    nurse_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if specialty:
        query["primary_specialty"] = specialty
    if province:
        query["province"] = province
    if nurse_type:
        query["nurse_type"] = nurse_type
    
    candidates = await db.candidates.find(query, {"_id": 0}).to_list(1000)
    return candidates

@api_router.post("/candidates")
async def create_candidate(candidate: CandidateCreate, current_user: dict = Depends(get_current_user)):
    candidate_dict = candidate.model_dump()
    candidate_dict["id"] = str(uuid.uuid4())
    candidate_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    candidate_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.candidates.insert_one(candidate_dict)
    return serialize_doc(candidate_dict)

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, current_user: dict = Depends(get_current_user)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@api_router.put("/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, candidate_update: CandidateUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in candidate_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.candidates.update_one({"id": candidate_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    return candidate

@api_router.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.candidates.delete_one({"id": candidate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate deleted successfully"}

# ==================== DOCUMENTS ENDPOINTS ====================

@api_router.get("/documents")
async def get_documents(
    candidate_id: Optional[str] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if candidate_id:
        query["candidate_id"] = candidate_id
    if document_type:
        query["document_type"] = document_type
    if status:
        query["status"] = status
    
    documents = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return documents

@api_router.post("/documents")
async def create_document(document: DocumentCreate, current_user: dict = Depends(get_current_user)):
    document_dict = document.model_dump()
    document_dict["id"] = str(uuid.uuid4())
    document_dict["status"] = "Pending"
    document_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    document_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.documents.insert_one(document_dict)
    return serialize_doc(document_dict)

@api_router.put("/documents/{document_id}")
async def update_document(document_id: str, document_update: DocumentUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in document_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "verified_by" in update_data:
        update_data["verified_by"] = current_user["id"]
        update_data["status"] = "Verified"
    
    result = await db.documents.update_one({"id": document_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    return document

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a document and its associated file.
    
    Uses the configured StorageProvider to delete files.
    """
    # Get document to find file path
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if document:
        # Delete file using storage provider
        file_path = document.get("file_path")
        if file_path:
            await storage_provider.delete(file_path)
    
    result = await db.documents.delete_one({"id": document_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

# ==================== FILE UPLOAD ENDPOINTS ====================

def validate_file(file: UploadFile) -> tuple:
    """Validate file extension and size"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    return ext

@api_router.post("/upload/document")
async def upload_document(
    file: UploadFile = File(...),
    candidate_id: str = Form(...),
    document_type: str = Form(...),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document file for a candidate.
    
    Uses the configured StorageProvider (Local for MVP, S3/GCS when credentials available).
    """
    # Validate file
    ext = validate_file(file)
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Read file content
    content = await file.read()
    
    # Determine content type
    content_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    # Upload using storage provider (Local/S3/GCS based on config)
    try:
        storage_result = await storage_provider.upload(
            content=content,
            filename=file.filename,
            folder=candidate_id,
            content_type=content_type
        )
    except Exception as e:
        logger.error(f"Storage upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Create document record
    doc_id = storage_result.get("file_id", str(uuid.uuid4()))
    now = datetime.now(timezone.utc).isoformat()
    document_dict = {
        "id": doc_id,
        "candidate_id": candidate_id,
        "document_type": document_type,
        "file_url": storage_result["file_url"],
        "file_path": storage_result["file_path"],
        "storage_type": storage_result["storage_type"],
        "file_name": file.filename,
        "file_size": file_size,
        "file_type": ext,
        "issue_date": issue_date,
        "expiry_date": expiry_date,
        "notes": notes,
        "status": "Pending",
        "uploaded_by": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.documents.insert_one(document_dict)
    
    # Log activity
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "document",
        "entity_id": doc_id,
        "activity_type": "uploaded",
        "description": f"Document uploaded: {document_type} ({file.filename}) via {storage_result['storage_type']}",
        "user_id": current_user["id"],
        "created_at": now
    })
    
    return serialize_doc(document_dict)

@api_router.post("/upload/document/{document_id}/replace")
async def replace_document_file(
    document_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Replace an existing document's file.
    
    Uses the configured StorageProvider for file operations.
    """
    # Get existing document
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Validate new file
    ext = validate_file(file)
    
    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Delete old file using storage provider
    old_file_path = document.get("file_path")
    if old_file_path:
        await storage_provider.delete(old_file_path)
    
    # Read new file content
    content = await file.read()
    
    # Determine content type
    content_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    # Upload new file using storage provider
    candidate_id = document["candidate_id"]
    try:
        storage_result = await storage_provider.upload(
            content=content,
            filename=file.filename,
            folder=candidate_id,
            content_type=content_type
        )
    except Exception as e:
        logger.error(f"File replacement error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Update document record
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "file_url": storage_result["file_url"],
        "file_path": storage_result["file_path"],
        "storage_type": storage_result["storage_type"],
        "file_name": file.filename,
        "file_size": file_size,
        "file_type": ext,
        "status": "Pending",  # Reset status when file is replaced
        "updated_at": now
    }
    
    await db.documents.update_one({"id": document_id}, {"$set": update_data})
    
    updated_doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    return updated_doc

@api_router.get("/files/{candidate_id}/{filename}")
async def get_file(candidate_id: str, filename: str, current_user: dict = Depends(get_current_user)):
    """
    Serve uploaded files (requires authentication).
    
    Uses the configured StorageProvider to retrieve files.
    """
    file_path = f"{candidate_id}/{filename}"
    
    # Check if file exists using storage provider
    if not await storage_provider.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = Path(filename).suffix.lower()
    content_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    # For local storage, use FileResponse for efficiency
    if isinstance(storage_provider, LocalStorageProvider):
        full_path = storage_provider.get_full_path(file_path)
        return FileResponse(
            path=full_path,
            media_type=content_type,
            filename=filename
        )
    else:
        # For cloud storage, stream the content
        content = await storage_provider.download(file_path)
        return StreamingResponse(
            BytesIO(content),
            media_type=content_type,
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )

@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str, current_user: dict = Depends(get_current_user)):
    """
    Download a document file.
    
    Uses the configured StorageProvider to retrieve files.
    """
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path_str = document.get("file_path")
    if not file_path_str:
        raise HTTPException(status_code=404, detail="No file associated with this document")
    
    # Check if file exists using storage provider
    if not await storage_provider.exists(file_path_str):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    original_filename = document.get("file_name", Path(file_path_str).name)
    
    # For local storage, use FileResponse for efficiency
    if isinstance(storage_provider, LocalStorageProvider):
        full_path = storage_provider.get_full_path(file_path_str)
        return FileResponse(
            path=full_path,
            filename=original_filename,
            media_type='application/octet-stream'
        )
    else:
        # For cloud storage, stream the content
        content = await storage_provider.download(file_path_str)
        return StreamingResponse(
            BytesIO(content),
            media_type='application/octet-stream',
            headers={"Content-Disposition": f"attachment; filename={original_filename}"}
        )

@api_router.get("/upload/stats")
async def get_upload_stats(current_user: dict = Depends(get_current_user)):
    """Get file upload statistics"""
    if current_user["role"] not in ["Admin", "Compliance Officer"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count documents with files
    total_docs = await db.documents.count_documents({})
    docs_with_files = await db.documents.count_documents({"file_path": {"$exists": True, "$ne": None}})
    
    # Get storage stats from provider
    storage_stats = {}
    if isinstance(storage_provider, LocalStorageProvider):
        storage_stats = storage_provider.get_storage_stats()
    else:
        # For cloud providers, calculate from DB
        total_size = 0
        async for doc in db.documents.find({"file_size": {"$exists": True}}, {"file_size": 1}):
            total_size += doc.get("file_size", 0)
        storage_stats = {
            "storage_type": storage_provider.__class__.__name__,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2)
        }
    
    # Get documents by type
    pipeline = [
        {"$group": {"_id": "$document_type", "count": {"$sum": 1}}}
    ]
    type_counts = await db.documents.aggregate(pipeline).to_list(100)
    
    return {
        "total_documents": total_docs,
        "documents_with_files": docs_with_files,
        **storage_stats,
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "allowed_extensions": list(ALLOWED_EXTENSIONS),
        "by_type": {item["_id"] or "Unknown": item["count"] for item in type_counts}
    }

@api_router.get("/compliance/expiring")
async def get_expiring_documents(
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Get documents expiring within specified days"""
    future_date = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    today = datetime.now(timezone.utc).isoformat()
    
    # Get all documents with expiry dates
    documents = await db.documents.find(
        {"expiry_date": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    expiring = []
    for doc in documents:
        if doc.get("expiry_date"):
            expiry = doc["expiry_date"]
            if expiry <= future_date:
                # Get candidate info
                candidate = await db.candidates.find_one({"id": doc["candidate_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
                doc["candidate_name"] = f"{candidate['first_name']} {candidate['last_name']}" if candidate else "Unknown"
                doc["is_expired"] = expiry < today
                expiring.append(doc)
    
    return sorted(expiring, key=lambda x: x.get("expiry_date", ""))

# ==================== FACILITIES ENDPOINTS ====================

@api_router.get("/facilities")
async def get_facilities(
    province: Optional[str] = None,
    facility_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if province:
        query["province"] = province
    if facility_type:
        query["facility_type"] = facility_type
    
    facilities = await db.facilities.find(query, {"_id": 0}).to_list(1000)
    return facilities

@api_router.post("/facilities")
async def create_facility(facility: FacilityCreate, current_user: dict = Depends(get_current_user)):
    facility_dict = facility.model_dump()
    facility_dict["id"] = str(uuid.uuid4())
    facility_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    facility_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.facilities.insert_one(facility_dict)
    return serialize_doc(facility_dict)

@api_router.get("/facilities/{facility_id}")
async def get_facility(facility_id: str, current_user: dict = Depends(get_current_user)):
    facility = await db.facilities.find_one({"id": facility_id}, {"_id": 0})
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility

@api_router.put("/facilities/{facility_id}")
async def update_facility(facility_id: str, facility_update: FacilityUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in facility_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.facilities.update_one({"id": facility_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    facility = await db.facilities.find_one({"id": facility_id}, {"_id": 0})
    return facility

@api_router.delete("/facilities/{facility_id}")
async def delete_facility(facility_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.facilities.delete_one({"id": facility_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Facility not found")
    return {"message": "Facility deleted successfully"}

# ==================== JOB ORDERS ENDPOINTS ====================

@api_router.get("/job-orders")
async def get_job_orders(
    status: Optional[str] = None,
    facility_id: Optional[str] = None,
    specialty: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if facility_id:
        query["facility_id"] = facility_id
    if specialty:
        query["specialty"] = specialty
    
    job_orders = await db.job_orders.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with facility names
    for jo in job_orders:
        facility = await db.facilities.find_one({"id": jo["facility_id"]}, {"_id": 0, "name": 1})
        jo["facility_name"] = facility["name"] if facility else "Unknown"
    
    return job_orders

@api_router.post("/job-orders")
async def create_job_order(job_order: JobOrderCreate, current_user: dict = Depends(get_current_user)):
    job_order_dict = job_order.model_dump()
    job_order_dict["id"] = str(uuid.uuid4())
    job_order_dict["status"] = "Open"
    job_order_dict["shortlisted_candidates"] = []
    job_order_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    job_order_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.job_orders.insert_one(job_order_dict)
    return serialize_doc(job_order_dict)

@api_router.get("/job-orders/{job_order_id}")
async def get_job_order(job_order_id: str, current_user: dict = Depends(get_current_user)):
    job_order = await db.job_orders.find_one({"id": job_order_id}, {"_id": 0})
    if not job_order:
        raise HTTPException(status_code=404, detail="Job order not found")
    
    facility = await db.facilities.find_one({"id": job_order["facility_id"]}, {"_id": 0, "name": 1})
    job_order["facility_name"] = facility["name"] if facility else "Unknown"
    
    return job_order

@api_router.put("/job-orders/{job_order_id}")
async def update_job_order(job_order_id: str, job_order_update: JobOrderUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in job_order_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.job_orders.update_one({"id": job_order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job order not found")
    
    job_order = await db.job_orders.find_one({"id": job_order_id}, {"_id": 0})
    return job_order

@api_router.delete("/job-orders/{job_order_id}")
async def delete_job_order(job_order_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.job_orders.delete_one({"id": job_order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job order not found")
    return {"message": "Job order deleted successfully"}

@api_router.post("/job-orders/{job_order_id}/candidates/{candidate_id}")
async def add_candidate_to_job_order(job_order_id: str, candidate_id: str, current_user: dict = Depends(get_current_user)):
    """Add a candidate to job order shortlist"""
    result = await db.job_orders.update_one(
        {"id": job_order_id},
        {"$addToSet": {"shortlisted_candidates": candidate_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job order not found")
    return {"message": "Candidate added to shortlist"}

@api_router.delete("/job-orders/{job_order_id}/candidates/{candidate_id}")
async def remove_candidate_from_job_order(job_order_id: str, candidate_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a candidate from job order shortlist"""
    result = await db.job_orders.update_one(
        {"id": job_order_id},
        {"$pull": {"shortlisted_candidates": candidate_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job order not found")
    return {"message": "Candidate removed from shortlist"}

# ==================== ASSIGNMENTS ENDPOINTS ====================

@api_router.get("/assignments")
async def get_assignments(
    status: Optional[str] = None,
    candidate_id: Optional[str] = None,
    facility_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if candidate_id:
        query["candidate_id"] = candidate_id
    if facility_id:
        query["facility_id"] = facility_id
    
    assignments = await db.assignments.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with candidate and facility names
    for a in assignments:
        candidate = await db.candidates.find_one({"id": a["candidate_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        facility = await db.facilities.find_one({"id": a["facility_id"]}, {"_id": 0, "name": 1})
        a["candidate_name"] = f"{candidate['first_name']} {candidate['last_name']}" if candidate else "Unknown"
        a["facility_name"] = facility["name"] if facility else "Unknown"
        
        # Check for credential warnings
        a["credential_warnings"] = await check_credential_warnings(a["candidate_id"], a["end_date"])
    
    return assignments

async def check_credential_warnings(candidate_id: str, assignment_end_date: str):
    """Check if any credentials expire during assignment"""
    documents = await db.documents.find(
        {"candidate_id": candidate_id, "expiry_date": {"$ne": None}},
        {"_id": 0}
    ).to_list(100)
    
    warnings = []
    for doc in documents:
        if doc.get("expiry_date") and doc["expiry_date"] < assignment_end_date:
            warnings.append({
                "document_type": doc["document_type"],
                "expiry_date": doc["expiry_date"]
            })
    return warnings

@api_router.post("/assignments")
async def create_assignment(assignment: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    assignment_dict = assignment.model_dump()
    assignment_dict["id"] = str(uuid.uuid4())
    assignment_dict["status"] = "Scheduled"
    assignment_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    assignment_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.assignments.insert_one(assignment_dict)
    
    # Update candidate status
    await db.candidates.update_one(
        {"id": assignment.candidate_id},
        {"$set": {"status": "On Assignment"}}
    )
    
    return serialize_doc(assignment_dict)

@api_router.get("/assignments/{assignment_id}")
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    candidate = await db.candidates.find_one({"id": assignment["candidate_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
    facility = await db.facilities.find_one({"id": assignment["facility_id"]}, {"_id": 0, "name": 1})
    assignment["candidate_name"] = f"{candidate['first_name']} {candidate['last_name']}" if candidate else "Unknown"
    assignment["facility_name"] = facility["name"] if facility else "Unknown"
    assignment["credential_warnings"] = await check_credential_warnings(assignment["candidate_id"], assignment["end_date"])
    
    return assignment

@api_router.put("/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, assignment_update: AssignmentUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in assignment_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.assignments.update_one({"id": assignment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    return assignment

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.assignments.delete_one({"id": assignment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted successfully"}

# ==================== TIMESHEETS ENDPOINTS ====================

@api_router.get("/timesheets")
async def get_timesheets(
    status: Optional[str] = None,
    candidate_id: Optional[str] = None,
    assignment_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if candidate_id:
        query["candidate_id"] = candidate_id
    if assignment_id:
        query["assignment_id"] = assignment_id
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).to_list(1000)
    
    for ts in timesheets:
        candidate = await db.candidates.find_one({"id": ts["candidate_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        ts["candidate_name"] = f"{candidate['first_name']} {candidate['last_name']}" if candidate else "Unknown"
        
        # Get assignment info for billing
        assignment = await db.assignments.find_one({"id": ts["assignment_id"]}, {"_id": 0})
        if assignment:
            ts["facility_id"] = assignment.get("facility_id")
            facility = await db.facilities.find_one({"id": assignment.get("facility_id")}, {"_id": 0, "name": 1})
            ts["facility_name"] = facility["name"] if facility else "Unknown"
            ts["bill_rate"] = assignment.get("bill_rate", 0)
            ts["pay_rate_regular"] = assignment.get("pay_rate_regular", 0)
            ts["pay_rate_ot"] = assignment.get("pay_rate_ot", 0)
    
    return timesheets

@api_router.post("/timesheets")
async def create_timesheet(timesheet: TimesheetCreate, current_user: dict = Depends(get_current_user)):
    timesheet_dict = timesheet.model_dump()
    timesheet_dict["id"] = str(uuid.uuid4())
    timesheet_dict["status"] = "Draft"
    timesheet_dict["entries"] = [e.model_dump() if hasattr(e, 'model_dump') else e for e in timesheet.entries]
    
    # Calculate totals
    total_regular = sum(e.get("regular_hours", 0) if isinstance(e, dict) else e.regular_hours for e in timesheet_dict["entries"])
    total_ot = sum(e.get("ot_hours", 0) if isinstance(e, dict) else e.ot_hours for e in timesheet_dict["entries"])
    timesheet_dict["total_regular_hours"] = total_regular
    timesheet_dict["total_ot_hours"] = total_ot
    timesheet_dict["total_hours"] = total_regular + total_ot
    
    # Get assignment rates for billing calculation
    assignment = await db.assignments.find_one({"id": timesheet.assignment_id}, {"_id": 0})
    if assignment:
        bill_rate = assignment.get("bill_rate", 0) or 0
        timesheet_dict["total_billable"] = (total_regular * bill_rate) + (total_ot * bill_rate * 1.5)
    else:
        timesheet_dict["total_billable"] = 0
    
    timesheet_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    timesheet_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.timesheets.insert_one(timesheet_dict)
    return serialize_doc(timesheet_dict)

@api_router.get("/timesheets/{timesheet_id}")
async def get_timesheet(timesheet_id: str, current_user: dict = Depends(get_current_user)):
    timesheet = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    return timesheet

@api_router.put("/timesheets/{timesheet_id}")
async def update_timesheet(timesheet_id: str, timesheet_update: TimesheetUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in timesheet_update.model_dump().items() if v is not None}
    
    if "entries" in update_data:
        entries = update_data["entries"]
        total_regular = sum(e.get("regular_hours", 0) if isinstance(e, dict) else e.regular_hours for e in entries)
        total_ot = sum(e.get("ot_hours", 0) if isinstance(e, dict) else e.ot_hours for e in entries)
        update_data["total_regular_hours"] = total_regular
        update_data["total_ot_hours"] = total_ot
        update_data["total_hours"] = total_regular + total_ot
        update_data["entries"] = [e.model_dump() if hasattr(e, 'model_dump') else e for e in entries]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.timesheets.update_one({"id": timesheet_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    timesheet = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    return timesheet

@api_router.post("/timesheets/{timesheet_id}/submit")
async def submit_timesheet(timesheet_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.timesheets.update_one(
        {"id": timesheet_id},
        {"$set": {"status": "Submitted", "submitted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    return {"message": "Timesheet submitted"}

@api_router.post("/timesheets/{timesheet_id}/approve")
async def approve_timesheet(timesheet_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.timesheets.update_one(
        {"id": timesheet_id},
        {"$set": {"status": "Approved", "approved_by": current_user["id"], "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    return {"message": "Timesheet approved"}

# ==================== ACTIVITIES ENDPOINTS ====================

@api_router.get("/activities")
async def get_activities(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    activities = await db.activities.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return activities

@api_router.post("/activities")
async def create_activity(activity: ActivityCreate, current_user: dict = Depends(get_current_user)):
    activity_dict = activity.model_dump()
    activity_dict["id"] = str(uuid.uuid4())
    activity_dict["user_id"] = current_user["id"]
    activity_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.activities.insert_one(activity_dict)
    return serialize_doc(activity_dict)

# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Leads by stage
    pipeline_stages = ["New Lead", "Contacted", "Screening Scheduled", "Application Submitted", "Interview", "Offer", "Hired", "Rejected"]
    leads_by_stage = {}
    for stage in pipeline_stages:
        count = await db.leads.count_documents({"stage": stage})
        leads_by_stage[stage] = count
    
    # Active candidates by specialty
    candidates_pipeline = [
        {"$match": {"status": "Active"}},
        {"$group": {"_id": "$primary_specialty", "count": {"$sum": 1}}}
    ]
    specialty_counts = await db.candidates.aggregate(candidates_pipeline).to_list(100)
    candidates_by_specialty = {item["_id"] or "Unspecified": item["count"] for item in specialty_counts}
    
    # Open job orders
    open_job_orders = await db.job_orders.count_documents({"status": "Open"})
    
    # Assignments starting in next 14-30 days
    today = datetime.now(timezone.utc).isoformat()
    in_14_days = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    in_30_days = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    assignments_next_14 = await db.assignments.count_documents({
        "start_date": {"$gte": today, "$lte": in_14_days}
    })
    assignments_next_30 = await db.assignments.count_documents({
        "start_date": {"$gte": today, "$lte": in_30_days}
    })
    
    # Credentials expiring soon (30 days)
    expiring_30 = await db.documents.count_documents({
        "expiry_date": {"$gte": today, "$lte": in_30_days}
    })
    
    # Total counts
    total_leads = await db.leads.count_documents({})
    total_candidates = await db.candidates.count_documents({})
    active_candidates = await db.candidates.count_documents({"status": "Active"})
    total_facilities = await db.facilities.count_documents({})
    total_job_orders = await db.job_orders.count_documents({})
    active_assignments = await db.assignments.count_documents({"status": "Active"})
    pending_timesheets = await db.timesheets.count_documents({"status": "Submitted"})
    
    return {
        "leads_by_stage": leads_by_stage,
        "candidates_by_specialty": candidates_by_specialty,
        "open_job_orders": open_job_orders,
        "assignments_starting_14_days": assignments_next_14,
        "assignments_starting_30_days": assignments_next_30,
        "credentials_expiring_30_days": expiring_30,
        "total_leads": total_leads,
        "total_candidates": total_candidates,
        "active_candidates": active_candidates,
        "total_facilities": total_facilities,
        "total_job_orders": total_job_orders,
        "active_assignments": active_assignments,
        "pending_timesheets": pending_timesheets
    }

@api_router.get("/dashboard/recent-activities")
async def get_recent_activities(current_user: dict = Depends(get_current_user)):
    activities = await db.activities.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return activities

# ==================== INVOICES ENDPOINTS (Basic) ====================

@api_router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    """Get billing data aggregated by facility and period"""
    timesheets = await db.timesheets.find({"status": "Approved"}, {"_id": 0}).to_list(1000)
    
    # Group by facility and period
    invoice_data = {}
    for ts in timesheets:
        assignment = await db.assignments.find_one({"id": ts["assignment_id"]}, {"_id": 0})
        if not assignment:
            continue
        
        facility_id = assignment.get("facility_id")
        facility = await db.facilities.find_one({"id": facility_id}, {"_id": 0, "name": 1})
        
        key = f"{facility_id}_{ts['week_start'][:7]}"  # facility_YYYY-MM
        if key not in invoice_data:
            invoice_data[key] = {
                "facility_id": facility_id,
                "facility_name": facility["name"] if facility else "Unknown",
                "period": ts["week_start"][:7],
                "total_hours": 0,
                "total_amount": 0,
                "timesheets": []
            }
        
        invoice_data[key]["total_hours"] += ts.get("total_hours", 0)
        invoice_data[key]["total_amount"] += ts.get("total_billable", 0)
        invoice_data[key]["timesheets"].append(ts["id"])
    
    return list(invoice_data.values())

# ==================== DOCUMENT TYPES ====================

@api_router.get("/document-types")
async def get_document_types(current_user: dict = Depends(get_current_user)):
    return [
        {"id": "nursing_license", "name": "Nursing License", "required": True},
        {"id": "crc", "name": "Criminal Record Check", "required": True},
        {"id": "immunization", "name": "Immunization Records", "required": True},
        {"id": "bls_acls", "name": "BLS/ACLS Certification", "required": True},
        {"id": "references", "name": "Professional References", "required": False},
        {"id": "resume", "name": "Resume/CV", "required": False},
        {"id": "employment_contract", "name": "Employment Contract", "required": False},
        {"id": "id_document", "name": "Government ID", "required": True},
        {"id": "work_permit", "name": "Work Permit", "required": False},
        {"id": "other", "name": "Other", "required": False}
    ]

# ==================== SEED DATA ENDPOINT ====================

@api_router.post("/seed")
async def seed_database():
    """Seed the database with demo data"""
    # Clear existing data
    await db.users.delete_many({})
    await db.leads.delete_many({})
    await db.candidates.delete_many({})
    await db.documents.delete_many({})
    await db.facilities.delete_many({})
    await db.job_orders.delete_many({})
    await db.assignments.delete_many({})
    await db.timesheets.delete_many({})
    await db.activities.delete_many({})
    await db.lead_capture_settings.delete_many({})
    await db.lead_audit_logs.delete_many({})
    
    now = datetime.now(timezone.utc)
    
    # Create users with different roles
    users = [
        {"id": str(uuid.uuid4()), "email": "admin@mccareglobal.com", "password": hash_password("admin123"), "first_name": "Sarah", "last_name": "Johnson", "role": "Admin", "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "email": "recruiter@mccareglobal.com", "password": hash_password("recruiter123"), "first_name": "Michael", "last_name": "Chen", "role": "Recruiter", "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "email": "compliance@mccareglobal.com", "password": hash_password("compliance123"), "first_name": "Emily", "last_name": "Williams", "role": "Compliance Officer", "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "email": "scheduler@mccareglobal.com", "password": hash_password("scheduler123"), "first_name": "David", "last_name": "Brown", "role": "Scheduler", "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "email": "finance@mccareglobal.com", "password": hash_password("finance123"), "first_name": "Jennifer", "last_name": "Davis", "role": "Finance", "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "email": "nurse@mccareglobal.com", "password": hash_password("nurse123"), "first_name": "Amanda", "last_name": "Smith", "role": "Nurse", "created_at": now.isoformat()},
    ]
    await db.users.insert_many(users)
    recruiter_id = users[1]["id"]
    
    # Create lead capture settings
    lead_capture_settings = {
        "id": str(uuid.uuid4()),
        "required_fields": ["first_name", "last_name", "email"],
        "optional_fields": ["phone", "specialty", "province_preference", "notes"],
        "default_pipeline_stage": "New Lead",
        "default_recruiter_id": recruiter_id,
        "auto_tag_rules": [
            {"field": "province_preference", "value": "Ontario", "tag": "ontario-lead"},
            {"field": "province_preference", "value": "British Columbia", "tag": "bc-lead"},
            {"field": "province_preference", "value": "Alberta", "tag": "alberta-lead"},
            {"field": "province_preference", "value": "Quebec", "tag": "quebec-lead"},
            {"field": "specialty", "value": "ICU", "tag": "critical-care"},
            {"field": "specialty", "value": "ER", "tag": "emergency"},
        ],
        "auto_convert_to_candidate": False,
        "notify_on_new_lead": True,
        "allowed_sources": ["ATS Form", "API", "HubSpot", "Website", "Landing Page", "Direct", "LinkedIn", "Referral", "Job Board", "Career Fair"],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    await db.lead_capture_settings.insert_one(lead_capture_settings)
    
    # Create leads with diverse sources
    stages = ["New Lead", "Contacted", "Screening Scheduled", "Application Submitted", "Interview", "Offer"]
    specialties = ["ICU", "ER", "Med-Surg", "OR", "Pediatrics", "NICU", "L&D", "Cardiac"]
    provinces = ["Ontario", "British Columbia", "Alberta", "Quebec", "Manitoba", "Saskatchewan"]
    sources = ["HubSpot", "ATS Form", "API", "Landing Page", "LinkedIn", "Referral", "Job Board", "Direct Application", "Website", "Career Fair"]
    
    leads = []
    lead_audit_logs = []
    lead_names = [
        ("Jessica", "Martinez"), ("Ryan", "Thompson"), ("Michelle", "Garcia"), ("Brandon", "Wilson"),
        ("Stephanie", "Anderson"), ("Kevin", "Taylor"), ("Lauren", "Thomas"), ("Justin", "Jackson"),
        ("Nicole", "White"), ("Tyler", "Harris"), ("Megan", "Martin"), ("Andrew", "Robinson"),
        ("Ashley", "Clark"), ("Joshua", "Lewis"), ("Samantha", "Lee"), ("Matthew", "Walker")
    ]
    
    for i, (first, last) in enumerate(lead_names):
        lead_id = str(uuid.uuid4())
        source = sources[i % len(sources)]
        province = provinces[i % len(provinces)]
        specialty = specialties[i % len(specialties)]
        
        # Generate tags based on source and province
        tags = [source.lower().replace(" ", "-")]
        if province == "Ontario":
            tags.append("ontario-lead")
        elif province == "British Columbia":
            tags.append("bc-lead")
        if specialty in ["ICU", "ER"]:
            tags.append("critical-care")
        if i % 2 == 0:
            tags.extend(["travel-nurse", "experienced"])
        else:
            tags.append("new-grad")
        
        lead = {
            "id": lead_id,
            "first_name": first,
            "last_name": last,
            "email": f"{first.lower()}.{last.lower()}@email.com",
            "phone": f"+1-416-555-{1000+i:04d}",
            "source": source,
            "specialty": specialty,
            "province_preference": province,
            "tags": tags,
            "notes": f"Interested in travel nursing opportunities in {province}",
            "stage": stages[i % len(stages)],
            "recruiter_id": recruiter_id,
            # UTM tracking for web sources
            "utm_source": "google" if source in ["Landing Page", "Website"] else None,
            "utm_medium": "cpc" if source == "Landing Page" else "organic" if source == "Website" else None,
            "utm_campaign": f"travel-nurse-{province.lower().replace(' ', '-')}" if source in ["Landing Page", "Website"] else None,
            "form_id": f"form-{source.lower().replace(' ', '-')}" if source in ["ATS Form", "Landing Page", "HubSpot"] else None,
            "hubspot_form_id": f"hs-form-{i}" if source == "HubSpot" else None,
            "created_at": (now - timedelta(days=30-i)).isoformat(),
            "updated_at": now.isoformat()
        }
        leads.append(lead)
        
        # Create audit log for each lead
        lead_audit_logs.append({
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "source": source,
            "timestamp": (now - timedelta(days=30-i)).isoformat(),
            "payload_summary": {
                "email": lead["email"],
                "name": f"{first} {last}",
                "specialty": specialty,
                "province": province,
                "utm_source": lead.get("utm_source"),
                "utm_campaign": lead.get("utm_campaign"),
                "form_id": lead.get("form_id"),
            },
            "auto_populated_fields": ["recruiter_id", "tags"],
            "auto_tags_applied": [t for t in tags if t not in [source.lower().replace(" ", "-")]],
            "recruiter_assigned": recruiter_id,
            "auto_converted": False
        })
    
    await db.leads.insert_many(leads)
    await db.lead_audit_logs.insert_many(lead_audit_logs)
    
    # Create candidates
    candidates = []
    candidate_names = [
        ("Emma", "Johnson", "RN", "ICU", "Ontario"),
        ("Liam", "Williams", "RN", "ER", "British Columbia"),
        ("Olivia", "Brown", "LPN", "Med-Surg", "Alberta"),
        ("Noah", "Jones", "RN", "OR", "Quebec"),
        ("Ava", "Miller", "RN", "Pediatrics", "Ontario"),
        ("William", "Davis", "RN", "NICU", "British Columbia"),
        ("Sophia", "Garcia", "RPN", "L&D", "Alberta"),
        ("James", "Rodriguez", "RN", "Cardiac", "Manitoba"),
        ("Isabella", "Martinez", "RN", "ICU", "Ontario"),
        ("Benjamin", "Hernandez", "LPN", "Med-Surg", "Saskatchewan")
    ]
    
    for i, (first, last, nurse_type, specialty, province) in enumerate(candidate_names):
        candidates.append({
            "id": str(uuid.uuid4()),
            "first_name": first,
            "last_name": last,
            "preferred_name": first,
            "email": f"{first.lower()}.{last.lower()}@email.com",
            "phone": f"+1-416-555-{2000+i:04d}",
            "address": f"{100+i} Healthcare Drive",
            "city": "Toronto" if province == "Ontario" else "Vancouver" if province == "British Columbia" else "Calgary",
            "province": province,
            "postal_code": f"M{i}N {i}A{i}",
            "country": "Canada",
            "work_eligibility": "Canadian Citizen" if i % 2 == 0 else "Permanent Resident",
            "nurse_type": nurse_type,
            "primary_specialty": specialty,
            "years_of_experience": 3 + (i % 10),
            "desired_locations": [province, provinces[(i+1) % len(provinces)]],
            "travel_willingness": True,
            "start_date_availability": (now + timedelta(days=14+i*7)).strftime("%Y-%m-%d"),
            "status": "Active" if i < 7 else "On Assignment" if i < 9 else "Inactive",
            "tags": ["travel-nurse", specialty.lower()],
            "notes": f"Experienced {specialty} nurse with {3+(i%10)} years experience",
            "created_at": (now - timedelta(days=60-i*5)).isoformat(),
            "updated_at": now.isoformat()
        })
    await db.candidates.insert_many(candidates)
    
    # Create documents for candidates
    document_types = ["Nursing License", "Criminal Record Check", "Immunization Records", "BLS/ACLS", "Resume", "References"]
    documents = []
    
    for candidate in candidates:
        for j, doc_type in enumerate(document_types):
            expiry_days = 365 - (j * 60) + (candidates.index(candidate) * 10)  # Vary expiry dates
            documents.append({
                "id": str(uuid.uuid4()),
                "candidate_id": candidate["id"],
                "document_type": doc_type,
                "file_url": f"https://storage.mccareglobal.com/docs/{candidate['id']}/{doc_type.lower().replace(' ', '_')}.pdf",
                "issue_date": (now - timedelta(days=365)).strftime("%Y-%m-%d"),
                "expiry_date": (now + timedelta(days=expiry_days)).strftime("%Y-%m-%d") if j < 4 else None,
                "status": "Verified" if j < 3 else "Pending" if j == 3 else "Expiring Soon" if expiry_days < 30 else "Verified",
                "verified_by": users[2]["id"] if j < 3 else None,
                "notes": None,
                "created_at": (now - timedelta(days=60)).isoformat(),
                "updated_at": now.isoformat()
            })
    await db.documents.insert_many(documents)
    
    # Create facilities
    facilities = [
        {"name": "Toronto General Hospital", "city": "Toronto", "province": "Ontario", "facility_type": "Hospital", "main_contact_name": "Dr. Robert Kim", "main_contact_email": "rkim@tgh.ca", "main_contact_phone": "+1-416-555-3001"},
        {"name": "Vancouver Coastal Health", "city": "Vancouver", "province": "British Columbia", "facility_type": "Hospital", "main_contact_name": "Susan Lee", "main_contact_email": "slee@vch.ca", "main_contact_phone": "+1-604-555-3002"},
        {"name": "Calgary Regional Medical", "city": "Calgary", "province": "Alberta", "facility_type": "Hospital", "main_contact_name": "Mark Thompson", "main_contact_email": "mthompson@crm.ca", "main_contact_phone": "+1-403-555-3003"},
        {"name": "Sunnybrook LTC", "city": "Toronto", "province": "Ontario", "facility_type": "Long-Term Care", "main_contact_name": "Patricia Wong", "main_contact_email": "pwong@sunnybrook.ca", "main_contact_phone": "+1-416-555-3004"},
        {"name": "Montreal Medical Center", "city": "Montreal", "province": "Quebec", "facility_type": "Hospital", "main_contact_name": "Jean-Pierre Bouchard", "main_contact_email": "jpbouchard@mmc.ca", "main_contact_phone": "+1-514-555-3005"},
        {"name": "Prairie Health Clinic", "city": "Winnipeg", "province": "Manitoba", "facility_type": "Clinic", "main_contact_name": "Amanda Green", "main_contact_email": "agreen@phc.ca", "main_contact_phone": "+1-204-555-3006"}
    ]
    
    for i, facility in enumerate(facilities):
        facility["id"] = str(uuid.uuid4())
        facility["address"] = f"{200+i*10} Medical Boulevard"
        facility["billing_notes"] = "Net 30 payment terms"
        facility["created_at"] = now.isoformat()
        facility["updated_at"] = now.isoformat()
    await db.facilities.insert_many(facilities)
    
    # Create job orders
    job_orders = []
    for i, facility in enumerate(facilities[:4]):
        job_orders.append({
            "id": str(uuid.uuid4()),
            "facility_id": facility["id"],
            "role": "Registered Nurse",
            "specialty": specialties[i % len(specialties)],
            "openings": 2 + (i % 3),
            "shift_type": ["Days", "Nights", "Rotation"][i % 3],
            "start_date": (now + timedelta(days=14+i*7)).strftime("%Y-%m-%d"),
            "end_date": (now + timedelta(days=90+i*7)).strftime("%Y-%m-%d"),
            "required_experience": 2 + (i % 3),
            "required_credentials": ["Nursing License", "BLS/ACLS", "Criminal Record Check"],
            "pay_rate": 45.00 + (i * 5),
            "bill_rate": 75.00 + (i * 8),
            "status": "Open" if i < 3 else "In Progress",
            "shortlisted_candidates": [candidates[i]["id"]] if i < len(candidates) else [],
            "notes": f"Urgent need for {specialties[i % len(specialties)]} nurses",
            "created_at": (now - timedelta(days=14-i*3)).isoformat(),
            "updated_at": now.isoformat()
        })
    await db.job_orders.insert_many(job_orders)
    
    # Create assignments
    assignments = []
    for i in range(3):
        assignments.append({
            "id": str(uuid.uuid4()),
            "candidate_id": candidates[i]["id"],
            "job_order_id": job_orders[i]["id"],
            "facility_id": facilities[i]["id"],
            "start_date": (now - timedelta(days=30-i*10)).strftime("%Y-%m-%d"),
            "end_date": (now + timedelta(days=60+i*10)).strftime("%Y-%m-%d"),
            "shift_pattern": "Mon-Fri Days" if i == 0 else "Tues-Sat Nights" if i == 1 else "Rotation",
            "contract_type": "Travel",
            "pay_rate_regular": 50.00 + (i * 5),
            "pay_rate_ot": 75.00 + (i * 7.5),
            "pay_rate_holiday": 100.00 + (i * 10),
            "bill_rate": 80.00 + (i * 10),
            "weekly_hours": 36.0,
            "status": "Active",
            "notes": "13-week travel contract",
            "created_at": (now - timedelta(days=30-i*10)).isoformat(),
            "updated_at": now.isoformat()
        })
    await db.assignments.insert_many(assignments)
    
    # Create timesheets
    timesheets = []
    for i, assignment in enumerate(assignments):
        for week in range(3):
            week_start = (now - timedelta(days=21-week*7)).strftime("%Y-%m-%d")
            week_end = (now - timedelta(days=15-week*7)).strftime("%Y-%m-%d")
            entries = []
            for day in range(5):  # Mon-Fri
                entries.append({
                    "day": (now - timedelta(days=21-week*7-day)).strftime("%Y-%m-%d"),
                    "regular_hours": 8.0 if day < 4 else 4.0,
                    "ot_hours": 0.0 if day < 3 else 2.0
                })
            
            total_regular = sum(e["regular_hours"] for e in entries)
            total_ot = sum(e["ot_hours"] for e in entries)
            
            timesheets.append({
                "id": str(uuid.uuid4()),
                "assignment_id": assignment["id"],
                "candidate_id": assignment["candidate_id"],
                "week_start": week_start,
                "week_end": week_end,
                "entries": entries,
                "total_regular_hours": total_regular,
                "total_ot_hours": total_ot,
                "total_hours": total_regular + total_ot,
                "total_billable": (total_regular * assignment["bill_rate"]) + (total_ot * assignment["bill_rate"] * 1.5),
                "status": "Approved" if week < 2 else "Submitted" if week == 2 else "Draft",
                "notes": None,
                "created_at": (now - timedelta(days=14-week*7)).isoformat(),
                "updated_at": now.isoformat()
            })
    await db.timesheets.insert_many(timesheets)
    
    # Create activities
    activities = [
        {"entity_type": "lead", "entity_id": leads[0]["id"], "activity_type": "created", "description": "New lead added from HubSpot"},
        {"entity_type": "lead", "entity_id": leads[1]["id"], "activity_type": "stage_change", "description": "Stage changed to Contacted"},
        {"entity_type": "candidate", "entity_id": candidates[0]["id"], "activity_type": "document_uploaded", "description": "Nursing license uploaded"},
        {"entity_type": "assignment", "entity_id": assignments[0]["id"], "activity_type": "created", "description": "New assignment created"},
        {"entity_type": "timesheet", "entity_id": timesheets[0]["id"], "activity_type": "approved", "description": "Timesheet approved for processing"},
    ]
    
    for i, activity in enumerate(activities):
        activity["id"] = str(uuid.uuid4())
        activity["user_id"] = users[i % len(users)]["id"]
        activity["created_at"] = (now - timedelta(hours=i*2)).isoformat()
    await db.activities.insert_many(activities)
    
    return {
        "message": "Database seeded successfully",
        "counts": {
            "users": len(users),
            "leads": len(leads),
            "candidates": len(candidates),
            "documents": len(documents),
            "facilities": len(facilities),
            "job_orders": len(job_orders),
            "assignments": len(assignments),
            "timesheets": len(timesheets),
            "activities": len(activities)
        },
        "demo_credentials": {
            "admin": {"email": "admin@mccareglobal.com", "password": "admin123"},
            "recruiter": {"email": "recruiter@mccareglobal.com", "password": "recruiter123"},
            "compliance": {"email": "compliance@mccareglobal.com", "password": "compliance123"},
            "scheduler": {"email": "scheduler@mccareglobal.com", "password": "scheduler123"},
            "finance": {"email": "finance@mccareglobal.com", "password": "finance123"},
            "nurse": {"email": "nurse@mccareglobal.com", "password": "nurse123"}
        }
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "McCare Global ATS API", "version": "1.0.0"}

# Health check endpoint (no auth required)
@api_router.get("/health")
async def health_check():
    """Health check for deployment verification"""
    try:
        # Quick DB check
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "storage_provider": storage_provider.__class__.__name__,
        "version": "1.0.0"
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
