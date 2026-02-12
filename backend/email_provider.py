"""
Email Provider Abstraction Layer

Provides a clean interface for sending emails with multiple provider support.
Currently implements DemoProvider for development/testing.
Ready for SendGrid, AWS SES, Mailgun, Brevo when credentials are available.

Usage:
    from email_provider import get_email_provider
    
    provider = get_email_provider()
    await provider.send_email(
        to=["user@example.com"],
        subject="Test Email",
        html="<p>Hello World</p>",
        text="Hello World"
    )
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import os
import logging
import json

logger = logging.getLogger(__name__)


class EmailResult:
    """Result of an email send operation"""
    def __init__(self, success: bool, message_id: str = None, error: str = None):
        self.success = success
        self.message_id = message_id
        self.error = error
        self.timestamp = datetime.now(timezone.utc).isoformat()


class EmailProvider(ABC):
    """Abstract base class for email providers"""
    
    @abstractmethod
    async def send_email(
        self,
        to: List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EmailResult:
        """
        Send an email.
        
        Args:
            to: List of recipient email addresses
            subject: Email subject line
            html: HTML body content
            text: Plain text body (optional, derived from html if not provided)
            from_email: Sender email (uses default if not provided)
            from_name: Sender display name
            reply_to: Reply-to address
            cc: CC recipients
            bcc: BCC recipients
            attachments: List of attachment dicts with 'filename', 'content', 'type'
            metadata: Additional metadata for tracking
            
        Returns:
            EmailResult with success status and message ID or error
        """
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name for logging"""
        pass


class DemoEmailProvider(EmailProvider):
    """
    Demo email provider for development and testing.
    
    Logs emails to console and stores them in the database notification_logs collection.
    Does NOT actually send emails - use for development/demo mode.
    """
    
    def __init__(self, db=None):
        """
        Initialize demo provider.
        
        Args:
            db: MongoDB database instance for logging (optional)
        """
        self.db = db
        self.default_from_email = "noreply@mccareglobal.com"
        self.default_from_name = "McCare Global ATS"
        logger.info("DemoEmailProvider initialized - emails will be logged, not sent")
    
    @property
    def provider_name(self) -> str:
        return "demo"
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EmailResult:
        """Log email to console and database (demo mode)"""
        import uuid
        
        message_id = f"demo-{uuid.uuid4()}"
        sender_email = from_email or self.default_from_email
        sender_name = from_name or self.default_from_name
        
        # Log to console
        logger.info(f"""
========== DEMO EMAIL ==========
Message ID: {message_id}
From: {sender_name} <{sender_email}>
To: {', '.join(to)}
CC: {', '.join(cc or [])}
Subject: {subject}
--------------------------------
{text or html[:500]}...
================================
""")
        
        # Store in database if available
        if self.db:
            log_entry = {
                "id": message_id,
                "type": metadata.get("notification_type") if metadata else "general",
                "provider": self.provider_name,
                "status": "logged",  # demo mode - logged but not sent
                "from_email": sender_email,
                "from_name": sender_name,
                "to": to,
                "cc": cc or [],
                "bcc": bcc or [],
                "subject": subject,
                "body_preview": (text or html)[:200],
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "sent_at": None,  # Not actually sent
                "error_message": None
            }
            try:
                await self.db.notification_logs.insert_one(log_entry)
            except Exception as e:
                logger.error(f"Failed to log email to database: {e}")
        
        return EmailResult(success=True, message_id=message_id)


class SendGridEmailProvider(EmailProvider):
    """
    SendGrid email provider.
    
    Requires: SENDGRID_API_KEY environment variable
    To enable: pip install sendgrid
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('SENDGRID_API_KEY')
        if not self.api_key:
            raise ValueError("SENDGRID_API_KEY environment variable is required")
        
        try:
            from sendgrid import SendGridAPIClient
            self.client = SendGridAPIClient(self.api_key)
        except ImportError:
            raise ImportError("sendgrid package required. Install with: pip install sendgrid")
        
        self.default_from_email = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@mccareglobal.com')
        self.default_from_name = os.environ.get('SENDGRID_FROM_NAME', 'McCare Global ATS')
        logger.info("SendGridEmailProvider initialized")
    
    @property
    def provider_name(self) -> str:
        return "sendgrid"
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EmailResult:
        """Send email via SendGrid API"""
        from sendgrid.helpers.mail import Mail, Email, To, Content, Cc, Bcc
        
        try:
            message = Mail(
                from_email=Email(from_email or self.default_from_email, from_name or self.default_from_name),
                to_emails=[To(email) for email in to],
                subject=subject,
                html_content=Content("text/html", html)
            )
            
            if text:
                message.add_content(Content("text/plain", text))
            
            if cc:
                for email in cc:
                    message.add_cc(Cc(email))
            
            if bcc:
                for email in bcc:
                    message.add_bcc(Bcc(email))
            
            response = self.client.send(message)
            
            if response.status_code in [200, 201, 202]:
                return EmailResult(success=True, message_id=response.headers.get('X-Message-Id'))
            else:
                return EmailResult(success=False, error=f"SendGrid returned status {response.status_code}")
                
        except Exception as e:
            logger.error(f"SendGrid send failed: {e}")
            return EmailResult(success=False, error=str(e))


class AWSESEmailProvider(EmailProvider):
    """
    AWS SES email provider.
    
    Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SES_REGION
    To enable: pip install boto3
    """
    
    def __init__(self):
        try:
            import boto3
            self.client = boto3.client(
                'ses',
                region_name=os.environ.get('AWS_SES_REGION', 'us-east-1'),
                aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
            )
        except ImportError:
            raise ImportError("boto3 package required. Install with: pip install boto3")
        
        self.default_from_email = os.environ.get('AWS_SES_FROM_EMAIL', 'noreply@mccareglobal.com')
        self.default_from_name = os.environ.get('AWS_SES_FROM_NAME', 'McCare Global ATS')
        logger.info("AWSESEmailProvider initialized")
    
    @property
    def provider_name(self) -> str:
        return "aws_ses"
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EmailResult:
        """Send email via AWS SES"""
        try:
            sender = f"{from_name or self.default_from_name} <{from_email or self.default_from_email}>"
            
            destination = {'ToAddresses': to}
            if cc:
                destination['CcAddresses'] = cc
            if bcc:
                destination['BccAddresses'] = bcc
            
            body = {'Html': {'Data': html, 'Charset': 'UTF-8'}}
            if text:
                body['Text'] = {'Data': text, 'Charset': 'UTF-8'}
            
            response = self.client.send_email(
                Source=sender,
                Destination=destination,
                Message={
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': body
                },
                ReplyToAddresses=[reply_to] if reply_to else []
            )
            
            return EmailResult(success=True, message_id=response['MessageId'])
            
        except Exception as e:
            logger.error(f"AWS SES send failed: {e}")
            return EmailResult(success=False, error=str(e))


# Provider singleton
_email_provider: Optional[EmailProvider] = None


def get_email_provider(db=None) -> EmailProvider:
    """
    Get the configured email provider.
    
    Determines which provider to use based on environment variables:
    - If SENDGRID_API_KEY is set → SendGridEmailProvider
    - If AWS_SES_REGION is set → AWSESEmailProvider
    - Otherwise → DemoEmailProvider (default for development)
    
    Args:
        db: MongoDB database instance for demo provider logging
        
    Returns:
        Configured EmailProvider instance
    """
    global _email_provider
    
    if _email_provider is not None:
        return _email_provider
    
    # Check for production providers
    if os.environ.get('SENDGRID_API_KEY'):
        logger.info("Using SendGridEmailProvider")
        _email_provider = SendGridEmailProvider()
    elif os.environ.get('AWS_SES_REGION') and os.environ.get('AWS_ACCESS_KEY_ID'):
        logger.info("Using AWSESEmailProvider")
        _email_provider = AWSESEmailProvider()
    else:
        logger.info("Using DemoEmailProvider (no email credentials configured)")
        _email_provider = DemoEmailProvider(db=db)
    
    return _email_provider


def reset_email_provider():
    """Reset the email provider singleton (useful for testing)"""
    global _email_provider
    _email_provider = None
