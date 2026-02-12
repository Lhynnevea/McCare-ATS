"""
Test suite for McCare Global ATS Document Upload & Storage Provider
Tests file upload, download, list, and deletion endpoints
"""
import pytest
import requests
import os
import uuid
from io import BytesIO

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_CANDIDATE_ID = "d1c353f8-0dd6-4c2f-8a57-5fc0661647c9"


class TestAuthSetup:
    """Authentication tests and fixtures"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@mccare.global", "password": "password"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestDocumentUpload(TestAuthSetup):
    """Test document file upload endpoint"""
    
    def test_upload_document_success(self, auth_headers):
        """Test successful document upload"""
        # Create test file content
        file_content = b"Test PDF content for document upload testing"
        files = {
            'file': ('test_document.pdf', BytesIO(file_content), 'application/pdf')
        }
        data = {
            'candidate_id': TEST_CANDIDATE_ID,
            'document_type': 'Resume',
            'notes': 'Test upload'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/upload/document",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "id" in result
        assert result["candidate_id"] == TEST_CANDIDATE_ID
        assert result["document_type"] == "Resume"
        assert result["file_name"] == "test_document.pdf"
        assert result["storage_type"] == "local"
        assert "file_url" in result
        assert "file_path" in result
        
        # Store document ID for cleanup
        TestDocumentUpload.uploaded_doc_id = result["id"]
        print(f"✅ Document uploaded successfully: {result['id']}")
        return result
    
    def test_upload_document_invalid_extension(self, auth_headers):
        """Test upload with invalid file extension"""
        file_content = b"Invalid file content"
        files = {
            'file': ('test_file.exe', BytesIO(file_content), 'application/octet-stream')
        }
        data = {
            'candidate_id': TEST_CANDIDATE_ID,
            'document_type': 'Resume'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/upload/document",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Should reject invalid extension: {response.status_code}"
        assert "not allowed" in response.json().get("detail", "").lower()
        print("✅ Invalid extension rejected correctly")
    
    def test_upload_document_missing_candidate_id(self, auth_headers):
        """Test upload without candidate_id"""
        file_content = b"Test content"
        files = {
            'file': ('test.pdf', BytesIO(file_content), 'application/pdf')
        }
        data = {
            'document_type': 'Resume'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/upload/document",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 422, f"Should require candidate_id: {response.status_code}"
        print("✅ Missing candidate_id validation working")
    
    def test_upload_image_document(self, auth_headers):
        """Test uploading image document"""
        # Create fake image content
        file_content = b'\x89PNG\r\n\x1a\n' + b'fake png content'
        files = {
            'file': ('id_card.png', BytesIO(file_content), 'image/png')
        }
        data = {
            'candidate_id': TEST_CANDIDATE_ID,
            'document_type': 'Government ID',
            'issue_date': '2025-01-01',
            'expiry_date': '2030-01-01'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/upload/document",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Image upload failed: {response.text}"
        result = response.json()
        assert result["document_type"] == "Government ID"
        assert result["file_type"] == ".png"
        TestDocumentUpload.image_doc_id = result["id"]
        print(f"✅ Image document uploaded: {result['id']}")


class TestDocumentList(TestAuthSetup):
    """Test document listing endpoint"""
    
    def test_list_documents_by_candidate(self, auth_headers):
        """Test listing documents for a candidate"""
        response = requests.get(
            f"{BASE_URL}/api/documents?candidate_id={TEST_CANDIDATE_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"List failed: {response.text}"
        documents = response.json()
        
        assert isinstance(documents, list)
        print(f"✅ Found {len(documents)} documents for candidate")
        
        # Verify document structure if docs exist
        if documents:
            doc = documents[0]
            assert "id" in doc
            assert "candidate_id" in doc
            assert "document_type" in doc
            print(f"  Document types: {[d['document_type'] for d in documents]}")
    
    def test_list_all_documents(self, auth_headers):
        """Test listing all documents (no filter)"""
        response = requests.get(
            f"{BASE_URL}/api/documents",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        documents = response.json()
        assert isinstance(documents, list)
        print(f"✅ Total documents in system: {len(documents)}")


class TestDocumentDownload(TestAuthSetup):
    """Test document download endpoint"""
    
    def test_download_document_success(self, auth_headers):
        """Test downloading an uploaded document"""
        # First get document list
        list_response = requests.get(
            f"{BASE_URL}/api/documents?candidate_id={TEST_CANDIDATE_ID}",
            headers=auth_headers
        )
        
        docs = list_response.json()
        # Filter for documents that have actual files (not URL-only docs)
        docs_with_files = [d for d in docs if d.get("file_path")]
        
        if not docs_with_files:
            pytest.skip("No documents with files available for download test")
        
        doc_id = docs_with_files[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/download",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Download failed: {response.text}"
        assert len(response.content) > 0
        print(f"✅ Document downloaded successfully: {len(response.content)} bytes")
    
    def test_download_nonexistent_document(self, auth_headers):
        """Test downloading non-existent document"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/documents/{fake_id}/download",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        print("✅ Non-existent document returns 404")


class TestFileServing(TestAuthSetup):
    """Test file serving endpoint"""
    
    def test_serve_file_success(self, auth_headers):
        """Test serving file via /files/{candidate_id}/{filename}"""
        # Get a document with a file path
        list_response = requests.get(
            f"{BASE_URL}/api/documents?candidate_id={TEST_CANDIDATE_ID}",
            headers=auth_headers
        )
        
        docs = list_response.json()
        docs_with_files = [d for d in docs if d.get("file_path")]
        
        if not docs_with_files:
            pytest.skip("No documents with files for serving test")
        
        doc = docs_with_files[0]
        file_path = doc["file_path"]
        
        # Extract filename from path
        filename = file_path.split("/")[-1] if "/" in file_path else file_path
        
        response = requests.get(
            f"{BASE_URL}/api/files/{TEST_CANDIDATE_ID}/{filename}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"File serving failed: {response.status_code}"
        print(f"✅ File served successfully: {filename}")
    
    def test_serve_nonexistent_file(self, auth_headers):
        """Test serving non-existent file"""
        response = requests.get(
            f"{BASE_URL}/api/files/{TEST_CANDIDATE_ID}/nonexistent-file.pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        print("✅ Non-existent file returns 404")


class TestDocumentDeletion(TestAuthSetup):
    """Test document deletion endpoint"""
    
    def test_delete_document_and_file(self, auth_headers):
        """Test deleting document and its associated file"""
        # Upload a document first
        file_content = b"Document to be deleted"
        files = {
            'file': ('delete_test.txt', BytesIO(file_content), 'text/plain')
        }
        data = {
            'candidate_id': TEST_CANDIDATE_ID,
            'document_type': 'Other',
            'notes': 'Test document for deletion'
        }
        
        upload_response = requests.post(
            f"{BASE_URL}/api/upload/document",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["id"]
        print(f"  Created document for deletion: {doc_id}")
        
        # Delete the document
        delete_response = requests.delete(
            f"{BASE_URL}/api/documents/{doc_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert "deleted" in delete_response.json().get("message", "").lower()
        print(f"✅ Document deleted successfully: {doc_id}")
        
        # Verify document is gone
        get_response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/download",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        print("  ✅ Document no longer accessible after deletion")
    
    def test_delete_nonexistent_document(self, auth_headers):
        """Test deleting non-existent document"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/documents/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        print("✅ Deleting non-existent document returns 404")


class TestUploadStats(TestAuthSetup):
    """Test upload statistics endpoint"""
    
    def test_get_upload_stats(self, auth_headers):
        """Test getting upload statistics"""
        response = requests.get(
            f"{BASE_URL}/api/upload/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        stats = response.json()
        
        # Verify stats structure
        assert "total_documents" in stats
        assert "documents_with_files" in stats
        assert "storage_type" in stats
        assert stats["storage_type"] == "local"
        assert "max_file_size_mb" in stats
        assert stats["max_file_size_mb"] == 10
        
        print(f"✅ Upload stats: {stats['total_documents']} docs, {stats['documents_with_files']} with files")
        print(f"  Storage: {stats['storage_type']}, allowed extensions: {stats.get('allowed_extensions', [])}")


class TestCleanup(TestAuthSetup):
    """Cleanup test documents"""
    
    def test_cleanup_test_documents(self, auth_headers):
        """Cleanup documents created during tests"""
        # Get all documents for test candidate
        response = requests.get(
            f"{BASE_URL}/api/documents?candidate_id={TEST_CANDIDATE_ID}",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            docs = response.json()
            # Handle None notes safely
            test_docs = [d for d in docs if d.get("notes") and d["notes"].startswith("Test")]
            
            for doc in test_docs:
                requests.delete(
                    f"{BASE_URL}/api/documents/{doc['id']}",
                    headers=auth_headers
                )
            
            if test_docs:
                print(f"✅ Cleaned up {len(test_docs)} test documents")
            else:
                print("✅ No test documents to clean up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
