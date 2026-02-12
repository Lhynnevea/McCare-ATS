"""
Storage Provider Abstraction Layer

This module provides a clean abstraction for file storage operations.
Currently implements LocalStorageProvider for development/MVP.
Ready for S3Provider/GCSProvider implementations when cloud credentials are available.

Usage:
    from storage_provider import get_storage_provider
    
    storage = get_storage_provider()
    url = await storage.upload(file_content, filename, candidate_id)
    content = await storage.download(file_path)
    await storage.delete(file_path)
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, BinaryIO
import os
import uuid
import aiofiles
import logging

logger = logging.getLogger(__name__)


class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    async def upload(
        self, 
        content: bytes, 
        filename: str, 
        folder: str = "",
        content_type: Optional[str] = None
    ) -> dict:
        """
        Upload a file to storage.
        
        Args:
            content: File content as bytes
            filename: Original filename
            folder: Optional folder/prefix (e.g., candidate_id)
            content_type: MIME type of the file
            
        Returns:
            dict with keys:
                - file_path: Relative path to the file
                - file_url: Full URL to access the file
                - storage_type: 'local', 's3', 'gcs', etc.
        """
        pass
    
    @abstractmethod
    async def download(self, file_path: str) -> bytes:
        """
        Download a file from storage.
        
        Args:
            file_path: Relative path to the file
            
        Returns:
            File content as bytes
        """
        pass
    
    @abstractmethod
    async def delete(self, file_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            file_path: Relative path to the file
            
        Returns:
            True if deleted successfully, False otherwise
        """
        pass
    
    @abstractmethod
    async def exists(self, file_path: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            file_path: Relative path to the file
            
        Returns:
            True if file exists, False otherwise
        """
        pass
    
    @abstractmethod
    def get_full_path(self, file_path: str) -> str:
        """
        Get the full path/URL for a file.
        
        Args:
            file_path: Relative path to the file
            
        Returns:
            Full path or URL to the file
        """
        pass


class LocalStorageProvider(StorageProvider):
    """
    Local filesystem storage provider.
    
    Used for development, testing, and MVP deployments.
    Files are stored in the ./uploads directory.
    """
    
    def __init__(self, upload_dir: str = None, base_url: str = None):
        """
        Initialize local storage provider.
        
        Args:
            upload_dir: Directory to store uploads (default: ./uploads)
            base_url: Base URL for file access (default: from BACKEND_URL env)
        """
        self.upload_dir = Path(upload_dir or os.path.join(os.path.dirname(__file__), "uploads"))
        self.upload_dir.mkdir(exist_ok=True)
        
        # Get base URL from environment or use default
        self.base_url = base_url or os.environ.get('BACKEND_URL', '')
        
        logger.info(f"LocalStorageProvider initialized: {self.upload_dir}")
    
    async def upload(
        self, 
        content: bytes, 
        filename: str, 
        folder: str = "",
        content_type: Optional[str] = None
    ) -> dict:
        """Upload file to local filesystem"""
        # Generate unique filename to prevent collisions
        file_id = str(uuid.uuid4())
        ext = Path(filename).suffix.lower()
        safe_filename = f"{file_id}{ext}"
        
        # Create folder if specified (e.g., candidate_id)
        if folder:
            target_dir = self.upload_dir / folder
            target_dir.mkdir(exist_ok=True)
            relative_path = f"{folder}/{safe_filename}"
        else:
            target_dir = self.upload_dir
            relative_path = safe_filename
        
        file_path = target_dir / safe_filename
        
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            file_url = f"{self.base_url}/api/files/{relative_path}"
            
            logger.info(f"File uploaded: {relative_path}")
            
            return {
                "file_path": relative_path,
                "file_url": file_url,
                "storage_type": "local",
                "file_id": file_id
            }
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            raise
    
    async def download(self, file_path: str) -> bytes:
        """Download file from local filesystem"""
        full_path = self.upload_dir / file_path
        
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        async with aiofiles.open(full_path, 'rb') as f:
            return await f.read()
    
    async def delete(self, file_path: str) -> bool:
        """Delete file from local filesystem"""
        full_path = self.upload_dir / file_path
        
        try:
            if full_path.exists():
                full_path.unlink()
                logger.info(f"File deleted: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Delete failed: {e}")
            return False
    
    async def exists(self, file_path: str) -> bool:
        """Check if file exists in local filesystem"""
        full_path = self.upload_dir / file_path
        return full_path.exists()
    
    def get_full_path(self, file_path: str) -> str:
        """Get full filesystem path for a file"""
        return str(self.upload_dir / file_path)
    
    def get_storage_stats(self) -> dict:
        """Get storage statistics for local filesystem"""
        total_size = 0
        file_count = 0
        
        if self.upload_dir.exists():
            for file_path in self.upload_dir.rglob('*'):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
                    file_count += 1
        
        return {
            "storage_type": "local",
            "upload_dir": str(self.upload_dir),
            "total_files": file_count,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2)
        }


class S3StorageProvider(StorageProvider):
    """
    AWS S3 storage provider.
    
    To be implemented when AWS credentials are available.
    Requires: boto3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME
    """
    
    def __init__(self, bucket_name: str = None, region: str = None):
        """
        Initialize S3 storage provider.
        
        Args:
            bucket_name: S3 bucket name (default: from S3_BUCKET_NAME env)
            region: AWS region (default: from AWS_REGION env or 'us-east-1')
        """
        self.bucket_name = bucket_name or os.environ.get('S3_BUCKET_NAME')
        self.region = region or os.environ.get('AWS_REGION', 'us-east-1')
        
        if not self.bucket_name:
            raise ValueError("S3_BUCKET_NAME environment variable is required")
        
        # Import boto3 only when S3 is actually used
        try:
            import boto3
            self.s3_client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
            )
        except ImportError:
            raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")
        
        logger.info(f"S3StorageProvider initialized: bucket={self.bucket_name}, region={self.region}")
    
    async def upload(
        self, 
        content: bytes, 
        filename: str, 
        folder: str = "",
        content_type: Optional[str] = None
    ) -> dict:
        """Upload file to S3"""
        file_id = str(uuid.uuid4())
        ext = Path(filename).suffix.lower()
        safe_filename = f"{file_id}{ext}"
        
        # Build S3 key with optional folder prefix
        s3_key = f"{folder}/{safe_filename}" if folder else safe_filename
        
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                **extra_args
            )
            
            # Generate URL
            file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            logger.info(f"File uploaded to S3: {s3_key}")
            
            return {
                "file_path": s3_key,
                "file_url": file_url,
                "storage_type": "s3",
                "file_id": file_id
            }
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            raise
    
    async def download(self, file_path: str) -> bytes:
        """Download file from S3"""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=file_path)
            return response['Body'].read()
        except self.s3_client.exceptions.NoSuchKey:
            raise FileNotFoundError(f"File not found in S3: {file_path}")
    
    async def delete(self, file_path: str) -> bool:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_path)
            logger.info(f"File deleted from S3: {file_path}")
            return True
        except Exception as e:
            logger.error(f"S3 delete failed: {e}")
            return False
    
    async def exists(self, file_path: str) -> bool:
        """Check if file exists in S3"""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=file_path)
            return True
        except:
            return False
    
    def get_full_path(self, file_path: str) -> str:
        """Get full S3 URL for a file"""
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{file_path}"


class GCSStorageProvider(StorageProvider):
    """
    Google Cloud Storage provider.
    
    To be implemented when GCS credentials are available.
    Requires: google-cloud-storage, GOOGLE_APPLICATION_CREDENTIALS, GCS_BUCKET_NAME
    """
    
    def __init__(self, bucket_name: str = None):
        """
        Initialize GCS storage provider.
        
        Args:
            bucket_name: GCS bucket name (default: from GCS_BUCKET_NAME env)
        """
        self.bucket_name = bucket_name or os.environ.get('GCS_BUCKET_NAME')
        
        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME environment variable is required")
        
        try:
            from google.cloud import storage
            self.client = storage.Client()
            self.bucket = self.client.bucket(self.bucket_name)
        except ImportError:
            raise ImportError("google-cloud-storage is required. Install with: pip install google-cloud-storage")
        
        logger.info(f"GCSStorageProvider initialized: bucket={self.bucket_name}")
    
    async def upload(
        self, 
        content: bytes, 
        filename: str, 
        folder: str = "",
        content_type: Optional[str] = None
    ) -> dict:
        """Upload file to GCS"""
        file_id = str(uuid.uuid4())
        ext = Path(filename).suffix.lower()
        safe_filename = f"{file_id}{ext}"
        
        gcs_path = f"{folder}/{safe_filename}" if folder else safe_filename
        
        try:
            blob = self.bucket.blob(gcs_path)
            blob.upload_from_string(content, content_type=content_type)
            
            file_url = f"https://storage.googleapis.com/{self.bucket_name}/{gcs_path}"
            
            logger.info(f"File uploaded to GCS: {gcs_path}")
            
            return {
                "file_path": gcs_path,
                "file_url": file_url,
                "storage_type": "gcs",
                "file_id": file_id
            }
        except Exception as e:
            logger.error(f"GCS upload failed: {e}")
            raise
    
    async def download(self, file_path: str) -> bytes:
        """Download file from GCS"""
        blob = self.bucket.blob(file_path)
        if not blob.exists():
            raise FileNotFoundError(f"File not found in GCS: {file_path}")
        return blob.download_as_bytes()
    
    async def delete(self, file_path: str) -> bool:
        """Delete file from GCS"""
        try:
            blob = self.bucket.blob(file_path)
            blob.delete()
            logger.info(f"File deleted from GCS: {file_path}")
            return True
        except Exception as e:
            logger.error(f"GCS delete failed: {e}")
            return False
    
    async def exists(self, file_path: str) -> bool:
        """Check if file exists in GCS"""
        blob = self.bucket.blob(file_path)
        return blob.exists()
    
    def get_full_path(self, file_path: str) -> str:
        """Get full GCS URL for a file"""
        return f"https://storage.googleapis.com/{self.bucket_name}/{file_path}"


# Storage provider singleton
_storage_provider: Optional[StorageProvider] = None


def get_storage_provider() -> StorageProvider:
    """
    Get the configured storage provider.
    
    Determines which provider to use based on environment variables:
    - If S3_BUCKET_NAME is set → S3StorageProvider
    - If GCS_BUCKET_NAME is set → GCSStorageProvider
    - Otherwise → LocalStorageProvider (default for MVP)
    
    Returns:
        Configured StorageProvider instance
    """
    global _storage_provider
    
    if _storage_provider is not None:
        return _storage_provider
    
    # Check for cloud storage configuration
    s3_bucket = os.environ.get('S3_BUCKET_NAME')
    gcs_bucket = os.environ.get('GCS_BUCKET_NAME')
    
    if s3_bucket:
        logger.info("Using S3StorageProvider")
        _storage_provider = S3StorageProvider()
    elif gcs_bucket:
        logger.info("Using GCSStorageProvider")
        _storage_provider = GCSStorageProvider()
    else:
        logger.info("Using LocalStorageProvider (default for MVP)")
        _storage_provider = LocalStorageProvider()
    
    return _storage_provider


def reset_storage_provider():
    """Reset the storage provider singleton (useful for testing)"""
    global _storage_provider
    _storage_provider = None
