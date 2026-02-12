"""
Notification Service for McCare Global ATS

Handles all notification logic including:
- In-app notifications
- Email notifications (via EmailProvider abstraction)
- New lead alerts
- Expiring credential alerts

Usage:
    from notification_service import NotificationService
    
    service = NotificationService(db)
    await service.notify_new_lead(lead_data)
    await service.check_expiring_credentials()
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import logging
from email_provider import get_email_provider, EmailResult

logger = logging.getLogger(__name__)


# Email templates
NEW_LEAD_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #dc2626; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background: #f9fafb; }}
        .field {{ margin-bottom: 12px; }}
        .label {{ font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }}
        .value {{ font-size: 16px; color: #111827; }}
        .button {{ display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
        .footer {{ padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0;">New Lead Received</h1>
        </div>
        <div class="content">
            <p>A new lead has been submitted to the McCare Global ATS:</p>
            
            <div class="field">
                <div class="label">Name</div>
                <div class="value">{first_name} {last_name}</div>
            </div>
            
            <div class="field">
                <div class="label">Email</div>
                <div class="value">{email}</div>
            </div>
            
            <div class="field">
                <div class="label">Phone</div>
                <div class="value">{phone}</div>
            </div>
            
            <div class="field">
                <div class="label">Specialty</div>
                <div class="value">{specialty}</div>
            </div>
            
            <div class="field">
                <div class="label">Province Preference</div>
                <div class="value">{province}</div>
            </div>
            
            <div class="field">
                <div class="label">Source</div>
                <div class="value">{source}</div>
            </div>
            
            <div class="field">
                <div class="label">Assigned To</div>
                <div class="value">{owner_name}</div>
            </div>
            
            <a href="{lead_url}" class="button">View Lead Details</a>
        </div>
        <div class="footer">
            <p>This is an automated notification from McCare Global ATS.</p>
            <p>© {year} McCare Global Healthcare Services Inc.</p>
        </div>
    </div>
</body>
</html>
"""

EXPIRING_CREDENTIAL_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: {header_color}; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background: #f9fafb; }}
        .alert-box {{ background: {alert_bg}; border-left: 4px solid {alert_border}; padding: 15px; margin-bottom: 20px; }}
        .field {{ margin-bottom: 12px; }}
        .label {{ font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }}
        .value {{ font-size: 16px; color: #111827; }}
        .days-remaining {{ font-size: 24px; font-weight: bold; color: {days_color}; }}
        .button {{ display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
        .footer {{ padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0;">{alert_title}</h1>
        </div>
        <div class="content">
            <div class="alert-box">
                <p style="margin:0;"><strong>{document_type}</strong> for <strong>{candidate_name}</strong></p>
                <p style="margin:5px 0 0 0;">Expires: {expiry_date}</p>
                <p class="days-remaining">{days_text}</p>
            </div>
            
            <div class="field">
                <div class="label">Candidate</div>
                <div class="value">{candidate_name}</div>
            </div>
            
            <div class="field">
                <div class="label">Document Type</div>
                <div class="value">{document_type}</div>
            </div>
            
            <div class="field">
                <div class="label">Expiry Date</div>
                <div class="value">{expiry_date}</div>
            </div>
            
            <div class="field">
                <div class="label">Status</div>
                <div class="value">{current_status}</div>
            </div>
            
            <a href="{candidate_url}" class="button">View Candidate Documents</a>
        </div>
        <div class="footer">
            <p>This is an automated compliance alert from McCare Global ATS.</p>
            <p>© {year} McCare Global Healthcare Services Inc.</p>
        </div>
    </div>
</body>
</html>
"""


class NotificationService:
    """Service for managing notifications and email alerts"""
    
    def __init__(self, db, base_url: str = None):
        """
        Initialize notification service.
        
        Args:
            db: MongoDB database instance
            base_url: Base URL for links in emails (defaults to env or preview URL)
        """
        self.db = db
        self.base_url = base_url or "https://mccare-ats-hub.preview.emergentagent.com"
        self.email_provider = get_email_provider(db)
    
    async def get_settings(self) -> dict:
        """Get notification settings from database"""
        settings = await self.db.notification_settings.find_one({}, {"_id": 0})
        if not settings:
            # Default settings
            settings = {
                "id": str(uuid.uuid4()),
                "enabled": True,
                "sender_name": "McCare Global ATS",
                "sender_email": "noreply@mccareglobal.com",
                # New lead settings
                "new_lead_enabled": True,
                "new_lead_notify_owner": True,
                "new_lead_fallback_emails": [],
                # Expiring credential settings
                "expiring_credential_enabled": True,
                "expiring_thresholds": [60, 30, 14, 7],
                "expired_alert_enabled": True,
                "expiring_notify_compliance": True,
                "expiring_notify_recruiter": True,
                "expiring_notify_candidate": False,
                "compliance_emails": [],
                # Quiet hours (optional)
                "quiet_hours_enabled": False,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "07:00",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await self.db.notification_settings.insert_one(settings)
        return settings
    
    async def update_settings(self, updates: dict) -> dict:
        """Update notification settings"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.notification_settings.update_one({}, {"$set": updates}, upsert=True)
        return await self.get_settings()
    
    async def create_notification(
        self,
        notification_type: str,
        title: str,
        message: str,
        user_ids: List[str],
        entity_type: str = None,
        entity_id: str = None,
        priority: str = "normal",
        metadata: dict = None
    ) -> dict:
        """
        Create an in-app notification.
        
        Args:
            notification_type: Type of notification (new_lead, expiring_credential, etc.)
            title: Notification title
            message: Notification message/body
            user_ids: List of user IDs to notify
            entity_type: Related entity type (lead, candidate, document)
            entity_id: Related entity ID
            priority: Priority level (low, normal, high, urgent)
            metadata: Additional metadata
            
        Returns:
            Created notification document
        """
        notification = {
            "id": str(uuid.uuid4()),
            "type": notification_type,
            "title": title,
            "message": message,
            "user_ids": user_ids,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "priority": priority,
            "metadata": metadata or {},
            "read_by": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.notifications.insert_one(notification)
        logger.info(f"Created notification: {notification['id']} - {title}")
        
        return notification
    
    async def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[dict]:
        """Get notifications for a user"""
        query = {"user_ids": user_id}
        if unread_only:
            query["read_by"] = {"$ne": user_id}
        
        notifications = await self.db.notifications.find(
            query, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Add read status for this user
        for n in notifications:
            n["is_read"] = user_id in n.get("read_by", [])
        
        return notifications
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user"""
        return await self.db.notifications.count_documents({
            "user_ids": user_id,
            "read_by": {"$ne": user_id}
        })
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read by a user"""
        result = await self.db.notifications.update_one(
            {"id": notification_id},
            {"$addToSet": {"read_by": user_id}}
        )
        return result.modified_count > 0
    
    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        result = await self.db.notifications.update_many(
            {"user_ids": user_id, "read_by": {"$ne": user_id}},
            {"$addToSet": {"read_by": user_id}}
        )
        return result.modified_count
    
    async def notify_new_lead(self, lead: dict, created_by_user: dict = None) -> bool:
        """
        Send notifications for a new lead.
        
        Args:
            lead: Lead document
            created_by_user: User who created the lead (if internal)
            
        Returns:
            True if notifications sent successfully
        """
        settings = await self.get_settings()
        
        if not settings.get("enabled") or not settings.get("new_lead_enabled"):
            logger.info("New lead notifications disabled")
            return False
        
        # Determine recipients
        recipients = []
        recipient_emails = []
        owner_name = "Unassigned"
        
        # Get lead owner if assigned
        if lead.get("recruiter_id"):
            owner = await self.db.users.find_one(
                {"id": lead["recruiter_id"]},
                {"_id": 0, "id": 1, "email": 1, "first_name": 1, "last_name": 1}
            )
            if owner:
                recipients.append(owner["id"])
                recipient_emails.append(owner["email"])
                owner_name = f"{owner['first_name']} {owner['last_name']}"
        
        # Add fallback admins if no owner or always include
        if not recipients or settings.get("new_lead_fallback_emails"):
            # Get admin users
            admins = await self.db.users.find(
                {"role": "Admin"},
                {"_id": 0, "id": 1, "email": 1}
            ).to_list(100)
            
            for admin in admins:
                if admin["id"] not in recipients:
                    recipients.append(admin["id"])
                if admin["email"] not in recipient_emails:
                    recipient_emails.append(admin["email"])
            
            # Add configured fallback emails
            for email in settings.get("new_lead_fallback_emails", []):
                if email not in recipient_emails:
                    recipient_emails.append(email)
        
        if not recipients:
            logger.warning("No recipients for new lead notification")
            return False
        
        # Create in-app notification
        await self.create_notification(
            notification_type="new_lead",
            title=f"New Lead: {lead.get('first_name')} {lead.get('last_name')}",
            message=f"A new lead has been submitted from {lead.get('source', 'Unknown')}. Specialty: {lead.get('specialty', 'Not specified')}",
            user_ids=recipients,
            entity_type="lead",
            entity_id=lead.get("id"),
            priority="normal",
            metadata={
                "source": lead.get("source"),
                "specialty": lead.get("specialty"),
                "email": lead.get("email")
            }
        )
        
        # Send email notification
        if recipient_emails:
            lead_url = f"{self.base_url}/leads"
            
            html = NEW_LEAD_EMAIL_TEMPLATE.format(
                first_name=lead.get("first_name", ""),
                last_name=lead.get("last_name", ""),
                email=lead.get("email", "N/A"),
                phone=lead.get("phone", "N/A"),
                specialty=lead.get("specialty", "Not specified"),
                province=lead.get("province_preference", "Not specified"),
                source=lead.get("source", "Direct"),
                owner_name=owner_name,
                lead_url=lead_url,
                year=datetime.now().year
            )
            
            result = await self.email_provider.send_email(
                to=recipient_emails,
                subject=f"New Lead: {lead.get('first_name')} {lead.get('last_name')} – {lead.get('specialty', 'Healthcare')}",
                html=html,
                from_name=settings.get("sender_name"),
                from_email=settings.get("sender_email"),
                metadata={"notification_type": "new_lead", "lead_id": lead.get("id")}
            )
            
            return result.success
        
        return True
    
    async def check_expiring_credentials(self) -> dict:
        """
        Check for expiring credentials and send notifications.
        
        This should be run as a daily scheduled job.
        
        Returns:
            Summary of notifications sent
        """
        settings = await self.get_settings()
        
        if not settings.get("enabled") or not settings.get("expiring_credential_enabled"):
            logger.info("Expiring credential notifications disabled")
            return {"status": "disabled", "notifications_sent": 0}
        
        thresholds = settings.get("expiring_thresholds", [60, 30, 14, 7])
        today = datetime.now(timezone.utc).date()
        
        summary = {
            "status": "completed",
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "documents_checked": 0,
            "notifications_sent": 0,
            "emails_sent": 0,
            "by_threshold": {}
        }
        
        # Get all documents with expiry dates
        documents = await self.db.documents.find(
            {"expiry_date": {"$ne": None}},
            {"_id": 0}
        ).to_list(10000)
        
        summary["documents_checked"] = len(documents)
        
        for doc in documents:
            try:
                expiry_str = doc.get("expiry_date")
                if not expiry_str:
                    continue
                
                # Parse expiry date
                if "T" in expiry_str:
                    expiry_date = datetime.fromisoformat(expiry_str.replace("Z", "+00:00")).date()
                else:
                    expiry_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()
                
                days_until_expiry = (expiry_date - today).days
                
                # Check if already expired
                if days_until_expiry < 0 and settings.get("expired_alert_enabled"):
                    await self._send_credential_alert(doc, days_until_expiry, "expired", settings)
                    summary["notifications_sent"] += 1
                    continue
                
                # Check thresholds
                for threshold in sorted(thresholds, reverse=True):
                    if days_until_expiry <= threshold:
                        # Check if already notified for this threshold
                        last_notified = doc.get("last_notified", {})
                        threshold_key = f"threshold_{threshold}"
                        
                        if threshold_key not in last_notified:
                            # Send notification
                            sent = await self._send_credential_alert(doc, days_until_expiry, threshold, settings)
                            if sent:
                                # Update last notified
                                await self.db.documents.update_one(
                                    {"id": doc["id"]},
                                    {"$set": {f"last_notified.{threshold_key}": datetime.now(timezone.utc).isoformat()}}
                                )
                                summary["notifications_sent"] += 1
                                summary["by_threshold"][str(threshold)] = summary["by_threshold"].get(str(threshold), 0) + 1
                        break  # Only alert for the nearest threshold
                        
            except Exception as e:
                logger.error(f"Error processing document {doc.get('id')}: {e}")
        
        logger.info(f"Credential check complete: {summary}")
        return summary
    
    async def _send_credential_alert(
        self,
        document: dict,
        days_until_expiry: int,
        threshold: int | str,
        settings: dict
    ) -> bool:
        """Send alert for expiring/expired credential"""
        
        # Get candidate info
        candidate = await self.db.candidates.find_one(
            {"id": document.get("candidate_id")},
            {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "email": 1}
        )
        
        if not candidate:
            logger.warning(f"Candidate not found for document {document.get('id')}")
            return False
        
        candidate_name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}"
        
        # Determine recipients
        recipients = []
        recipient_emails = []
        
        # Get compliance users
        if settings.get("expiring_notify_compliance"):
            compliance_users = await self.db.users.find(
                {"role": {"$in": ["Admin", "Compliance Officer"]}},
                {"_id": 0, "id": 1, "email": 1}
            ).to_list(100)
            
            for user in compliance_users:
                recipients.append(user["id"])
                recipient_emails.append(user["email"])
            
            # Add configured compliance emails
            for email in settings.get("compliance_emails", []):
                if email not in recipient_emails:
                    recipient_emails.append(email)
        
        # Optionally notify candidate
        if settings.get("expiring_notify_candidate") and candidate.get("email"):
            if candidate["email"] not in recipient_emails:
                recipient_emails.append(candidate["email"])
        
        if not recipients:
            logger.warning("No recipients for credential alert")
            return False
        
        # Determine alert styling based on urgency
        is_expired = threshold == "expired"
        if is_expired:
            alert_title = "EXPIRED Credential Alert"
            days_text = f"EXPIRED {abs(days_until_expiry)} days ago"
            header_color = "#991b1b"
            alert_bg = "#fef2f2"
            alert_border = "#dc2626"
            days_color = "#dc2626"
            priority = "urgent"
        elif days_until_expiry <= 7:
            alert_title = "URGENT: Credential Expiring Soon"
            days_text = f"{days_until_expiry} days remaining"
            header_color = "#dc2626"
            alert_bg = "#fef2f2"
            alert_border = "#dc2626"
            days_color = "#dc2626"
            priority = "high"
        elif days_until_expiry <= 14:
            alert_title = "Credential Expiring Soon"
            days_text = f"{days_until_expiry} days remaining"
            header_color = "#d97706"
            alert_bg = "#fffbeb"
            alert_border = "#f59e0b"
            days_color = "#d97706"
            priority = "high"
        elif days_until_expiry <= 30:
            alert_title = "Credential Expiring"
            days_text = f"{days_until_expiry} days remaining"
            header_color = "#d97706"
            alert_bg = "#fffbeb"
            alert_border = "#f59e0b"
            days_color = "#d97706"
            priority = "normal"
        else:
            alert_title = "Credential Expiry Notice"
            days_text = f"{days_until_expiry} days remaining"
            header_color = "#0284c7"
            alert_bg = "#f0f9ff"
            alert_border = "#0ea5e9"
            days_color = "#0284c7"
            priority = "low"
        
        # Create in-app notification
        await self.create_notification(
            notification_type="expiring_credential" if not is_expired else "expired_credential",
            title=f"{document.get('document_type')} - {candidate_name}",
            message=f"{alert_title}: {document.get('document_type')} expires on {document.get('expiry_date')}. {days_text}.",
            user_ids=recipients,
            entity_type="document",
            entity_id=document.get("id"),
            priority=priority,
            metadata={
                "candidate_id": candidate.get("id"),
                "candidate_name": candidate_name,
                "document_type": document.get("document_type"),
                "expiry_date": document.get("expiry_date"),
                "days_remaining": days_until_expiry
            }
        )
        
        # Send email
        candidate_url = f"{self.base_url}/candidates/{candidate.get('id')}"
        
        html = EXPIRING_CREDENTIAL_EMAIL_TEMPLATE.format(
            alert_title=alert_title,
            document_type=document.get("document_type", "Document"),
            candidate_name=candidate_name,
            expiry_date=document.get("expiry_date", "N/A"),
            days_text=days_text,
            current_status=document.get("status", "Unknown"),
            candidate_url=candidate_url,
            header_color=header_color,
            alert_bg=alert_bg,
            alert_border=alert_border,
            days_color=days_color,
            year=datetime.now().year
        )
        
        result = await self.email_provider.send_email(
            to=recipient_emails,
            subject=f"{alert_title}: {document.get('document_type')} - {candidate_name}",
            html=html,
            from_name=settings.get("sender_name"),
            from_email=settings.get("sender_email"),
            metadata={
                "notification_type": "expiring_credential",
                "document_id": document.get("id"),
                "candidate_id": candidate.get("id"),
                "threshold": threshold
            }
        )
        
        return result.success
    
    async def get_notification_logs(
        self,
        notification_type: str = None,
        limit: int = 100
    ) -> List[dict]:
        """Get email notification logs"""
        query = {}
        if notification_type:
            query["type"] = notification_type
        
        logs = await self.db.notification_logs.find(
            query, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return logs
