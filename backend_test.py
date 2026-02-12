import requests
import sys
from datetime import datetime
import uuid

class LeadCaptureAPITester:
    def __init__(self, base_url="https://mccare-ats-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_credentials = {
            "email": "admin@mccareglobal.com",
            "password": "admin123"
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, require_auth=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if require_auth and self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    if response_data:
                        print(f"   Response: {str(response_data)[:200]}{'...' if len(str(response_data)) > 200 else ''}")
                except:
                    print(f"   Response: {response.text[:200]}{'...' if len(response.text) > 200 else ''}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")

            return success, response.json() if response.content and 'json' in response.headers.get('content-type', '') else response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def login_admin(self):
        """Login as admin user"""
        print("\n🔐 Logging in as admin...")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_credentials,
            require_auth=False
        )
        if success and isinstance(response, dict) and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Admin login successful, token obtained")
            return True
        print("❌ Admin login failed")
        return False

    def test_public_lead_api(self):
        """Test public lead submission endpoint"""
        lead_data = {
            "first_name": "Jane",
            "last_name": "Doe",
            "email": f"jane.doe.{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+1-416-555-1234",
            "specialty": "ICU",
            "province_preference": "Ontario",
            "notes": "Interested in travel nursing opportunities",
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "travel-nurse-ontario",
            "utm_term": "icu-travel-nurse",
            "utm_content": "ad-variant-a",
            "form_id": "test-form-001",
            "landing_page_url": "https://example.com/icu-nurses",
            "referrer_url": "https://google.com"
        }
        
        return self.run_test(
            "Public Lead API",
            "POST",
            "public/leads",
            200,
            data=lead_data,
            require_auth=False
        )

    def test_ats_form_submit(self):
        """Test ATS form submission endpoint"""
        form_data = {
            "first_name": "John",
            "last_name": "Smith",
            "email": f"john.smith.{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+1-647-555-9876",
            "specialty": "ER",
            "province_preference": "British Columbia",
            "notes": "Looking for ER positions in Vancouver area",
            "utm_source": "website",
            "utm_medium": "organic",
            "form_id": "ats-default-form",
            "landing_page_url": "https://mccare.com/apply",
            "referrer_url": "https://mccare.com/careers"
        }
        
        return self.run_test(
            "ATS Form Submit",
            "POST",
            "public/form-submit",
            200,
            data=form_data,
            require_auth=False
        )

    def test_hubspot_webhook(self):
        """Test HubSpot webhook endpoint"""
        hubspot_payload = {
            "properties": {
                "firstname": "Sarah",
                "lastname": "Johnson", 
                "email": f"sarah.johnson.{uuid.uuid4().hex[:8]}@example.com",
                "phone": "+1-905-555-4321",
                "specialty": "Med-Surg",
                "province": "Ontario",
                "message": "Interested in med-surg travel positions",
                "utm_source": "hubspot",
                "utm_medium": "email",
                "utm_campaign": "nurse-recruitment-q1"
            },
            "formGuid": "hubspot-form-123",
            "portalId": "12345",
            "campaign": "Q1 Nurse Recruitment"
        }
        
        return self.run_test(
            "HubSpot Webhook",
            "POST",
            "webhooks/hubspot",
            200,
            data=hubspot_payload,
            require_auth=False
        )

    def test_landing_page_submit(self):
        """Test landing page submission endpoint"""
        landing_data = {
            "first_name": "Michael",
            "last_name": "Brown",
            "email": f"michael.brown.{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+1-778-555-8765",
            "specialty": "OR",
            "province": "Alberta",
            "notes": "Experienced OR nurse seeking travel opportunities",
            "utm_source": "facebook",
            "utm_medium": "social",
            "utm_campaign": "or-nurse-alberta",
            "form_id": "landing-page-001",
            "landing_page_url": "https://landing.mccare.com/or-nurses",
            "referrer_url": "https://facebook.com"
        }
        
        return self.run_test(
            "Landing Page Submit",
            "POST", 
            "public/landing-page",
            200,
            data=landing_data,
            require_auth=False
        )

    def test_lead_capture_settings(self):
        """Test lead capture settings endpoint (requires auth)"""
        if not self.token:
            print("❌ Skipping settings test - no auth token")
            return False, {}
        
        return self.run_test(
            "Lead Capture Settings",
            "GET",
            "lead-capture/settings",
            200,
            require_auth=True
        )

    def test_embed_code_generation(self):
        """Test embed code generation endpoint (requires auth)"""
        if not self.token:
            print("❌ Skipping embed code test - no auth token")
            return False, {}
        
        return self.run_test(
            "Embed Code Generation",
            "GET",
            "lead-capture/embed-code",
            200,
            require_auth=True
        )

    def test_audit_logs(self):
        """Test audit logs endpoint (requires auth)"""
        if not self.token:
            print("❌ Skipping audit logs test - no auth token")
            return False, {}
        
        return self.run_test(
            "Lead Audit Logs",
            "GET",
            "lead-audit-logs?limit=10",
            200,
            require_auth=True
        )

    def test_intake_stats(self):
        """Test lead intake statistics endpoint (requires auth)"""
        if not self.token:
            print("❌ Skipping intake stats test - no auth token")
            return False, {}
        
        return self.run_test(
            "Lead Intake Stats",
            "GET",
            "lead-intake/stats",
            200,
            require_auth=True
        )

    def test_leads_list(self):
        """Test leads listing endpoint to verify leads are created"""
        if not self.token:
            print("❌ Skipping leads list test - no auth token")
            return False, {}
        
        return self.run_test(
            "Leads List",
            "GET",
            "leads",
            200,
            require_auth=True
        )

def main():
    print("🚀 Starting Lead Capture API Testing...")
    print("=" * 60)
    
    tester = LeadCaptureAPITester()
    
    # Test public endpoints (no auth required)
    print("\n📡 Testing Public Endpoints (No Auth Required)")
    print("-" * 50)
    
    public_tests = [
        tester.test_public_lead_api,
        tester.test_ats_form_submit,
        tester.test_hubspot_webhook,
        tester.test_landing_page_submit
    ]
    
    for test in public_tests:
        test()
    
    # Login as admin for protected endpoints
    print("\n🔒 Testing Protected Endpoints (Auth Required)")
    print("-" * 50)
    
    if not tester.login_admin():
        print("❌ Cannot proceed with protected endpoint tests - admin login failed")
    else:
        protected_tests = [
            tester.test_lead_capture_settings,
            tester.test_embed_code_generation,
            tester.test_audit_logs,
            tester.test_intake_stats,
            tester.test_leads_list
        ]
        
        for test in protected_tests:
            test()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 TEST RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All backend API tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())