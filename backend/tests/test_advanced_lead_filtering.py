"""
Test Advanced Lead Filtering Feature
Tests for the multi-filter support in /api/leads endpoint including:
- Multi-select stage filtering (stages parameter)
- Multi-select source filtering (sources parameter)
- Multi-select specialty filtering (specialties parameter)
- Multi-select province filtering (provinces parameter)
- Multi-select recruiter filtering (recruiters parameter)
- Date range filtering (date_from, date_to parameters)
- Text search filtering (search parameter)
- Combined filter scenarios
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@mccareglobal.com"
TEST_PASSWORD = "admin123"


class TestAdvancedLeadFiltering:
    """Test suite for Advanced Lead Filtering feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user_id = login_response.json().get("user", {}).get("id")
        
        yield
        
        # Cleanup test leads
        self._cleanup_test_leads()
    
    def _cleanup_test_leads(self):
        """Remove test-created leads"""
        try:
            leads = self.session.get(f"{BASE_URL}/api/leads").json()
            for lead in leads:
                if lead.get("email", "").startswith("testfilter"):
                    self.session.delete(f"{BASE_URL}/api/leads/{lead['id']}")
        except Exception:
            pass
    
    def _create_test_lead(self, data_overrides=None):
        """Helper to create test lead with optional overrides"""
        base_data = {
            "first_name": "TestFilter",
            "last_name": "Lead",
            "email": f"testfilter{datetime.now().timestamp()}@test.com",
            "phone": "555-0100",
            "source": "Direct Application",
            "specialty": "ICU",
            "province_preference": "Ontario",
            "notes": "Test lead for filtering"
        }
        if data_overrides:
            base_data.update(data_overrides)
        
        response = self.session.post(f"{BASE_URL}/api/leads", json=base_data)
        assert response.status_code == 200, f"Failed to create lead: {response.text}"
        return response.json()
    
    # ==============================================================================
    # STAGE FILTERING TESTS
    # ==============================================================================
    
    def test_filter_by_single_stage(self):
        """Test filtering leads by a single stage parameter"""
        # Create lead in New Lead stage
        lead = self._create_test_lead()
        assert lead["stage"] == "New Lead"
        
        # Filter by single stage
        response = self.session.get(f"{BASE_URL}/api/leads?stage=New Lead")
        assert response.status_code == 200
        
        leads = response.json()
        # All returned leads should be in New Lead stage
        for lead in leads:
            assert lead["stage"] == "New Lead", f"Expected stage 'New Lead', got '{lead['stage']}'"
        
        print(f"✓ Single stage filter returned {len(leads)} leads in 'New Lead' stage")
    
    def test_filter_by_multiple_stages(self):
        """Test filtering leads by multiple stages (comma-separated)"""
        # Create leads in different stages
        lead1 = self._create_test_lead({"email": f"testfilter_stage1_{datetime.now().timestamp()}@test.com"})
        lead2 = self._create_test_lead({"email": f"testfilter_stage2_{datetime.now().timestamp()}@test.com"})
        
        # Move lead2 to Contacted stage
        update_response = self.session.put(f"{BASE_URL}/api/leads/{lead2['id']}", json={"stage": "Contacted"})
        assert update_response.status_code == 200
        
        # Filter by multiple stages
        response = self.session.get(f"{BASE_URL}/api/leads?stages=New Lead,Contacted")
        assert response.status_code == 200
        
        leads = response.json()
        stages_found = set(lead["stage"] for lead in leads)
        
        # Verify we get leads from both stages
        assert "New Lead" in stages_found or "Contacted" in stages_found
        
        # Verify no other stages are returned
        for lead in leads:
            assert lead["stage"] in ["New Lead", "Contacted"], f"Unexpected stage: {lead['stage']}"
        
        print(f"✓ Multi-stage filter returned {len(leads)} leads from stages: {stages_found}")
    
    def test_filter_by_three_stages(self):
        """Test filtering by three stages"""
        response = self.session.get(f"{BASE_URL}/api/leads?stages=New Lead,Contacted,Interview")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            assert lead["stage"] in ["New Lead", "Contacted", "Interview"]
        
        print(f"✓ Three-stage filter returned {len(leads)} leads")
    
    # ==============================================================================
    # SOURCE FILTERING TESTS
    # ==============================================================================
    
    def test_filter_by_single_source(self):
        """Test filtering leads by a single source"""
        lead = self._create_test_lead({"source": "HubSpot", "email": f"testfilter_hubspot_{datetime.now().timestamp()}@test.com"})
        
        response = self.session.get(f"{BASE_URL}/api/leads?source=HubSpot")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            assert lead["source"] == "HubSpot"
        
        print(f"✓ Single source filter returned {len(leads)} HubSpot leads")
    
    def test_filter_by_multiple_sources(self):
        """Test filtering leads by multiple sources (comma-separated)"""
        # Create leads with different sources
        self._create_test_lead({"source": "HubSpot", "email": f"testfilter_hubspot2_{datetime.now().timestamp()}@test.com"})
        self._create_test_lead({"source": "Website", "email": f"testfilter_website_{datetime.now().timestamp()}@test.com"})
        self._create_test_lead({"source": "LinkedIn", "email": f"testfilter_linkedin_{datetime.now().timestamp()}@test.com"})
        
        response = self.session.get(f"{BASE_URL}/api/leads?sources=HubSpot,Website,LinkedIn")
        assert response.status_code == 200
        
        leads = response.json()
        sources_found = set(lead["source"] for lead in leads if lead.get("source"))
        
        for lead in leads:
            if lead.get("source"):
                assert lead["source"] in ["HubSpot", "Website", "LinkedIn"], f"Unexpected source: {lead['source']}"
        
        print(f"✓ Multi-source filter returned {len(leads)} leads from sources: {sources_found}")
    
    # ==============================================================================
    # SPECIALTY FILTERING TESTS
    # ==============================================================================
    
    def test_filter_by_single_specialty(self):
        """Test filtering leads by a single specialty"""
        lead = self._create_test_lead({"specialty": "ICU", "email": f"testfilter_icu_{datetime.now().timestamp()}@test.com"})
        
        response = self.session.get(f"{BASE_URL}/api/leads?specialty=ICU")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            if lead.get("specialty"):
                assert lead["specialty"] == "ICU"
        
        print(f"✓ Single specialty filter returned {len(leads)} ICU leads")
    
    def test_filter_by_multiple_specialties(self):
        """Test filtering leads by multiple specialties (comma-separated)"""
        self._create_test_lead({"specialty": "ICU", "email": f"testfilter_spec_icu_{datetime.now().timestamp()}@test.com"})
        self._create_test_lead({"specialty": "ER", "email": f"testfilter_spec_er_{datetime.now().timestamp()}@test.com"})
        self._create_test_lead({"specialty": "Pediatrics", "email": f"testfilter_spec_peds_{datetime.now().timestamp()}@test.com"})
        
        response = self.session.get(f"{BASE_URL}/api/leads?specialties=ICU,ER,Pediatrics")
        assert response.status_code == 200
        
        leads = response.json()
        specialties_found = set(lead.get("specialty") for lead in leads if lead.get("specialty"))
        
        for lead in leads:
            if lead.get("specialty"):
                assert lead["specialty"] in ["ICU", "ER", "Pediatrics"]
        
        print(f"✓ Multi-specialty filter returned {len(leads)} leads with specialties: {specialties_found}")
    
    # ==============================================================================
    # PROVINCE FILTERING TESTS
    # ==============================================================================
    
    def test_filter_by_single_province(self):
        """Test filtering leads by a single province"""
        lead = self._create_test_lead({"province_preference": "Ontario", "email": f"testfilter_ont_{datetime.now().timestamp()}@test.com"})
        
        response = self.session.get(f"{BASE_URL}/api/leads?province=Ontario")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            if lead.get("province_preference"):
                assert lead["province_preference"] == "Ontario"
        
        print(f"✓ Single province filter returned {len(leads)} Ontario leads")
    
    def test_filter_by_multiple_provinces(self):
        """Test filtering leads by multiple provinces (comma-separated)"""
        self._create_test_lead({"province_preference": "Ontario", "email": f"testfilter_prov_ont_{datetime.now().timestamp()}@test.com"})
        self._create_test_lead({"province_preference": "British Columbia", "email": f"testfilter_prov_bc_{datetime.now().timestamp()}@test.com"})
        self._create_test_lead({"province_preference": "Alberta", "email": f"testfilter_prov_ab_{datetime.now().timestamp()}@test.com"})
        
        response = self.session.get(f"{BASE_URL}/api/leads?provinces=Ontario,British Columbia,Alberta")
        assert response.status_code == 200
        
        leads = response.json()
        provinces_found = set(lead.get("province_preference") for lead in leads if lead.get("province_preference"))
        
        for lead in leads:
            if lead.get("province_preference"):
                assert lead["province_preference"] in ["Ontario", "British Columbia", "Alberta"]
        
        print(f"✓ Multi-province filter returned {len(leads)} leads with provinces: {provinces_found}")
    
    # ==============================================================================
    # RECRUITER FILTERING TESTS
    # ==============================================================================
    
    def test_filter_by_single_recruiter(self):
        """Test filtering leads by a single recruiter"""
        # First get list of recruiters
        recruiters_response = self.session.get(f"{BASE_URL}/api/recruiters")
        assert recruiters_response.status_code == 200
        recruiters = recruiters_response.json()
        
        if recruiters:
            recruiter_id = recruiters[0]["id"]
            
            # Create lead and assign recruiter
            lead = self._create_test_lead({"email": f"testfilter_rec_{datetime.now().timestamp()}@test.com"})
            
            # Filter by recruiter
            response = self.session.get(f"{BASE_URL}/api/leads?recruiter_id={recruiter_id}")
            assert response.status_code == 200
            
            leads = response.json()
            for lead in leads:
                assert lead["recruiter_id"] == recruiter_id
            
            print(f"✓ Single recruiter filter returned {len(leads)} leads for recruiter {recruiter_id[:8]}...")
    
    def test_filter_by_multiple_recruiters(self):
        """Test filtering leads by multiple recruiters (comma-separated)"""
        recruiters_response = self.session.get(f"{BASE_URL}/api/recruiters")
        assert recruiters_response.status_code == 200
        recruiters = recruiters_response.json()
        
        if len(recruiters) >= 2:
            recruiter_ids = [r["id"] for r in recruiters[:2]]
            
            response = self.session.get(f"{BASE_URL}/api/leads?recruiters={','.join(recruiter_ids)}")
            assert response.status_code == 200
            
            leads = response.json()
            for lead in leads:
                if lead.get("recruiter_id"):
                    assert lead["recruiter_id"] in recruiter_ids
            
            print(f"✓ Multi-recruiter filter returned {len(leads)} leads")
    
    # ==============================================================================
    # DATE RANGE FILTERING TESTS
    # ==============================================================================
    
    def test_filter_by_date_from(self):
        """Test filtering leads by date_from (created after date)"""
        # Use today's date
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.get(f"{BASE_URL}/api/leads?date_from={today}")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            created_at = lead.get("created_at", "")
            if created_at:
                # Verify lead was created on or after today
                created_date = created_at[:10]
                assert created_date >= today, f"Lead created_at {created_date} is before {today}"
        
        print(f"✓ Date from filter returned {len(leads)} leads created from {today}")
    
    def test_filter_by_date_to(self):
        """Test filtering leads by date_to (created before date)"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = self.session.get(f"{BASE_URL}/api/leads?date_to={tomorrow}")
        assert response.status_code == 200
        
        leads = response.json()
        print(f"✓ Date to filter returned {len(leads)} leads created up to {tomorrow}")
    
    def test_filter_by_date_range(self):
        """Test filtering leads by full date range (date_from and date_to)"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = self.session.get(f"{BASE_URL}/api/leads?date_from={yesterday}&date_to={tomorrow}")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            created_at = lead.get("created_at", "")
            if created_at:
                created_date = created_at[:10]
                assert yesterday <= created_date <= tomorrow
        
        print(f"✓ Date range filter returned {len(leads)} leads from {yesterday} to {tomorrow}")
    
    # ==============================================================================
    # TEXT SEARCH FILTERING TESTS
    # ==============================================================================
    
    def test_filter_by_search_name(self):
        """Test filtering leads by text search (name match)"""
        unique_name = f"UniqueSearchName{datetime.now().timestamp()}"
        lead = self._create_test_lead({
            "first_name": unique_name,
            "email": f"testfilter_search_{datetime.now().timestamp()}@test.com"
        })
        
        response = self.session.get(f"{BASE_URL}/api/leads?search={unique_name[:10]}")
        assert response.status_code == 200
        
        leads = response.json()
        assert len(leads) >= 1, "Search should return at least one lead"
        
        # Verify the search result contains our unique name
        found = any(unique_name in lead["first_name"] for lead in leads)
        assert found, f"Expected to find lead with name containing '{unique_name[:10]}'"
        
        print(f"✓ Text search filter returned {len(leads)} leads matching name search")
    
    def test_filter_by_search_email(self):
        """Test filtering leads by text search (email match)"""
        unique_email = f"uniquesearch{datetime.now().timestamp()}@test.com"
        lead = self._create_test_lead({"email": unique_email})
        
        response = self.session.get(f"{BASE_URL}/api/leads?search=uniquesearch")
        assert response.status_code == 200
        
        leads = response.json()
        assert len(leads) >= 1
        
        print(f"✓ Email search filter returned {len(leads)} leads")
    
    # ==============================================================================
    # COMBINED FILTER TESTS
    # ==============================================================================
    
    def test_combined_stage_and_specialty(self):
        """Test combining stage and specialty filters"""
        lead = self._create_test_lead({
            "specialty": "ICU",
            "email": f"testfilter_combined1_{datetime.now().timestamp()}@test.com"
        })
        
        response = self.session.get(f"{BASE_URL}/api/leads?stages=New Lead,Contacted&specialty=ICU")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            assert lead["stage"] in ["New Lead", "Contacted"]
            if lead.get("specialty"):
                assert lead["specialty"] == "ICU"
        
        print(f"✓ Combined stage+specialty filter returned {len(leads)} leads")
    
    def test_combined_source_and_province(self):
        """Test combining source and province filters"""
        lead = self._create_test_lead({
            "source": "HubSpot",
            "province_preference": "Ontario",
            "email": f"testfilter_combined2_{datetime.now().timestamp()}@test.com"
        })
        
        response = self.session.get(f"{BASE_URL}/api/leads?sources=HubSpot,Website&provinces=Ontario,Alberta")
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            if lead.get("source"):
                assert lead["source"] in ["HubSpot", "Website"]
            if lead.get("province_preference"):
                assert lead["province_preference"] in ["Ontario", "Alberta"]
        
        print(f"✓ Combined source+province filter returned {len(leads)} leads")
    
    def test_combined_all_filters(self):
        """Test combining all filter types"""
        today = datetime.now().strftime("%Y-%m-%d")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Create a test lead that matches all criteria
        lead = self._create_test_lead({
            "source": "Website",
            "specialty": "ER",
            "province_preference": "Ontario",
            "email": f"testfilter_allfilters_{datetime.now().timestamp()}@test.com"
        })
        
        # Apply all filters
        params = (
            f"stages=New Lead"
            f"&sources=Website"
            f"&specialties=ER"
            f"&provinces=Ontario"
            f"&date_from={today}"
            f"&date_to={tomorrow}"
        )
        
        response = self.session.get(f"{BASE_URL}/api/leads?{params}")
        assert response.status_code == 200
        
        leads = response.json()
        print(f"✓ Combined all filters returned {len(leads)} leads")
        
        # Verify each lead matches all criteria
        for lead in leads:
            assert lead["stage"] == "New Lead"
            assert lead["source"] == "Website"
            assert lead["specialty"] == "ER"
            assert lead["province_preference"] == "Ontario"
    
    # ==============================================================================
    # EDGE CASE TESTS
    # ==============================================================================
    
    def test_empty_filter_returns_all(self):
        """Test that no filters returns all leads"""
        response = self.session.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        
        leads = response.json()
        print(f"✓ No filters returned {len(leads)} leads (all leads)")
    
    def test_invalid_stage_filter(self):
        """Test that invalid stage filter returns empty results"""
        response = self.session.get(f"{BASE_URL}/api/leads?stages=InvalidStage")
        assert response.status_code == 200
        
        leads = response.json()
        assert len(leads) == 0, "Invalid stage should return no results"
        
        print("✓ Invalid stage filter correctly returns empty results")
    
    def test_empty_stages_parameter(self):
        """Test that empty stages parameter returns all leads"""
        response = self.session.get(f"{BASE_URL}/api/leads?stages=")
        assert response.status_code == 200
        
        leads = response.json()
        print(f"✓ Empty stages parameter returned {len(leads)} leads")
    
    def test_whitespace_handling_in_filters(self):
        """Test that whitespace in filter values is handled correctly"""
        response = self.session.get(f"{BASE_URL}/api/leads?stages=New Lead, Contacted")
        assert response.status_code == 200
        
        leads = response.json()
        # Backend should trim whitespace
        for lead in leads:
            assert lead["stage"] in ["New Lead", "Contacted"]
        
        print(f"✓ Whitespace handling in filters works correctly, returned {len(leads)} leads")


class TestRecruiterEndpoint:
    """Test the /api/recruiters endpoint for filter dropdown"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_recruiters_returns_list(self):
        """Test that /api/recruiters returns a list of recruiter users"""
        response = self.session.get(f"{BASE_URL}/api/recruiters")
        assert response.status_code == 200
        
        recruiters = response.json()
        assert isinstance(recruiters, list)
        
        # Verify each recruiter has required fields
        for recruiter in recruiters:
            assert "id" in recruiter
            assert "first_name" in recruiter
            assert "last_name" in recruiter
            assert "email" in recruiter
            assert "role" in recruiter
            assert recruiter["role"] in ["Admin", "Recruiter"]
        
        print(f"✓ /api/recruiters returned {len(recruiters)} recruiters")
    
    def test_recruiters_no_password_in_response(self):
        """Test that recruiter response doesn't include password"""
        response = self.session.get(f"{BASE_URL}/api/recruiters")
        assert response.status_code == 200
        
        recruiters = response.json()
        for recruiter in recruiters:
            assert "password" not in recruiter, "Password should not be in response"
        
        print("✓ Recruiter response correctly excludes password")


class TestPipelineStagesEndpoint:
    """Test the /api/pipeline/stages endpoint for filter options"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_pipeline_stages(self):
        """Test that /api/pipeline/stages returns all valid stages"""
        response = self.session.get(f"{BASE_URL}/api/pipeline/stages")
        assert response.status_code == 200
        
        data = response.json()
        assert "stages" in data
        assert "stage_config" in data
        
        expected_stages = [
            "New Lead",
            "Contacted",
            "Screening Scheduled",
            "Application Submitted",
            "Interview",
            "Offer",
            "Hired",
            "Converted",
            "Rejected"
        ]
        
        for stage in expected_stages:
            assert stage in data["stages"], f"Expected stage '{stage}' not found"
        
        # Verify stage_config has color info
        for config in data["stage_config"]:
            assert "id" in config
            assert "label" in config
            assert "color" in config
        
        print(f"✓ /api/pipeline/stages returned {len(data['stages'])} stages with config")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
