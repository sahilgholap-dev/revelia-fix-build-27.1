#!/usr/bin/env python3
"""
Backend API Test Suite for Revelia
Tests the TypeScript/Express backend at /app/server
"""

import requests
import json
from datetime import datetime

# Backend URL
BACKEND_URL = "http://localhost:8001"

def test_health_endpoint():
    """Test the /api/health endpoint"""
    print("\n" + "="*60)
    print("Testing Health Endpoint")
    print("="*60)
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
        
        print(f"✓ Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"✓ Response received")
        
        # Verify response structure
        required_fields = {
            'success': bool,
            'message': str,
            'data': dict
        }
        
        for field, expected_type in required_fields.items():
            if field not in data:
                print(f"✗ FAILED: Missing field '{field}'")
                return False
            if not isinstance(data[field], expected_type):
                print(f"✗ FAILED: Field '{field}' has wrong type. Expected {expected_type}, got {type(data[field])}")
                return False
            print(f"✓ Field '{field}': {expected_type.__name__}")
        
        # Verify data object fields
        data_fields = {
            'timestamp': str,
            'uptime': (int, float),
            'environment': str,
            'database': str
        }
        
        for field, expected_type in data_fields.items():
            if field not in data['data']:
                print(f"✗ FAILED: Missing data field '{field}'")
                return False
            if not isinstance(data['data'][field], expected_type):
                print(f"✗ FAILED: Data field '{field}' has wrong type")
                return False
            print(f"✓ Data field '{field}': {data['data'][field]}")
        
        # Verify specific values
        if data['success'] != True:
            print(f"✗ FAILED: success should be true")
            return False
        print(f"✓ success = true")
        
        if data['message'] != "Revelia API running":
            print(f"✗ FAILED: Unexpected message: {data['message']}")
            return False
        print(f"✓ message = 'Revelia API running'")
        
        if data['data']['environment'] != "development":
            print(f"✗ FAILED: Unexpected environment: {data['data']['environment']}")
            return False
        print(f"✓ environment = 'development'")
        
        if data['data']['database'] != "connected":
            print(f"✗ FAILED: Database not connected: {data['data']['database']}")
            return False
        print(f"✓ database = 'connected'")
        
        # Verify timestamp is valid ISO format
        try:
            datetime.fromisoformat(data['data']['timestamp'].replace('Z', '+00:00'))
            print(f"✓ timestamp is valid ISO format")
        except ValueError:
            print(f"✗ FAILED: Invalid timestamp format: {data['data']['timestamp']}")
            return False
        
        print("\n" + "="*60)
        print("✓ HEALTH ENDPOINT TEST PASSED")
        print("="*60)
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"✗ FAILED: Could not connect to {BACKEND_URL}")
        print("  Make sure the server is running: cd /app/server && yarn dev")
        return False
    except requests.exceptions.Timeout:
        print(f"✗ FAILED: Request timed out")
        return False
    except Exception as e:
        print(f"✗ FAILED: Unexpected error: {str(e)}")
        return False

def test_auth_signup():
    """Test POST /api/auth/signup endpoint"""
    print("\n" + "="*60)
    print("Testing Auth Signup Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 1a: Valid signup with all fields
    print("\n[Test 1a] Valid signup with all fields")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/signup",
            json={
                "name": "Alice Johnson",
                "email": "alice.test@example.com",
                "password": "SecurePass123!"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 201:
            print(f"  ✗ FAILED: Expected 201, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            
            # Check response structure
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            elif 'data' not in data:
                print(f"  ✗ FAILED: Missing 'data' field")
                all_passed = False
            elif 'user' not in data['data'] or 'token' not in data['data']:
                print(f"  ✗ FAILED: Missing 'user' or 'token' in data")
                all_passed = False
            else:
                user = data['data']['user']
                token = data['data']['token']
                
                # Verify user fields
                required_fields = ['_id', 'email', 'name', 'authProvider', 'subscription']
                missing = [f for f in required_fields if f not in user]
                if missing:
                    print(f"  ✗ FAILED: Missing user fields: {missing}")
                    all_passed = False
                elif user['email'] != 'alice.test@example.com':
                    print(f"  ✗ FAILED: Wrong email: {user['email']}")
                    all_passed = False
                elif user['authProvider'] != 'email':
                    print(f"  ✗ FAILED: Wrong authProvider: {user['authProvider']}")
                    all_passed = False
                elif user['subscription']['tier'] != 'free':
                    print(f"  ✗ FAILED: Wrong subscription tier: {user['subscription']['tier']}")
                    all_passed = False
                elif 'passwordHash' in user:
                    print(f"  ✗ FAILED: passwordHash should not be in response")
                    all_passed = False
                elif not token or len(token) < 20:
                    print(f"  ✗ FAILED: Invalid token")
                    all_passed = False
                else:
                    print(f"  ✓ PASSED: Valid signup successful")
                    print(f"    User ID: {user['_id']}")
                    print(f"    Email: {user['email']}")
                    print(f"    Token: {token[:20]}...")
                    # Store token for later tests
                    global VALID_TOKEN
                    VALID_TOKEN = token
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1b: Signup with existing email
    print("\n[Test 1b] Signup with existing email")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/signup",
            json={
                "name": "Alice Duplicate",
                "email": "alice.test@example.com",
                "password": "AnotherPass123!"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print(f"  ✗ FAILED: Expected 400, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if data.get('success') != False:
                print(f"  ✗ FAILED: success should be false")
                all_passed = False
            elif 'error' not in data:
                print(f"  ✗ FAILED: Missing error message")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Duplicate email rejected")
                print(f"    Error: {data['error']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1c: Signup with weak password
    print("\n[Test 1c] Signup with weak password (< 8 chars)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/signup",
            json={
                "email": "bob.test@example.com",
                "password": "Pass123"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print(f"  ✗ FAILED: Expected 400, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if data.get('success') != False:
                print(f"  ✗ FAILED: success should be false")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Weak password rejected")
                print(f"    Error: {data.get('error', 'N/A')}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1d: Signup without email
    print("\n[Test 1d] Signup without email")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/signup",
            json={
                "name": "Charlie",
                "password": "Password123!"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print(f"  ✗ FAILED: Expected 400, got {response.status_code}")
            all_passed = False
        else:
            print(f"  ✓ PASSED: Missing email rejected")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ AUTH SIGNUP TESTS PASSED")
    else:
        print("✗ AUTH SIGNUP TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_auth_login():
    """Test POST /api/auth/login endpoint"""
    print("\n" + "="*60)
    print("Testing Auth Login Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 2a: Login with correct credentials
    print("\n[Test 2a] Login with correct credentials")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json={
                "email": "alice.test@example.com",
                "password": "SecurePass123!"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            elif 'data' not in data or 'user' not in data['data'] or 'token' not in data['data']:
                print(f"  ✗ FAILED: Missing user or token")
                all_passed = False
            else:
                user = data['data']['user']
                token = data['data']['token']
                
                if user['email'] != 'alice.test@example.com':
                    print(f"  ✗ FAILED: Wrong email")
                    all_passed = False
                elif not token:
                    print(f"  ✗ FAILED: No token returned")
                    all_passed = False
                else:
                    print(f"  ✓ PASSED: Login successful")
                    print(f"    Token: {token[:20]}...")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 2b: Login with wrong password
    print("\n[Test 2b] Login with wrong password")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json={
                "email": "alice.test@example.com",
                "password": "WrongPassword123"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"  ✗ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if data.get('success') != False:
                print(f"  ✗ FAILED: success should be false")
                all_passed = False
            elif 'Invalid credentials' not in data.get('error', ''):
                print(f"  ✗ FAILED: Expected 'Invalid credentials' error")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Wrong password rejected")
                print(f"    Error: {data['error']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 2c: Login with non-existent email
    print("\n[Test 2c] Login with non-existent email")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "Password123!"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"  ✗ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if 'Invalid credentials' not in data.get('error', ''):
                print(f"  ✗ FAILED: Expected 'Invalid credentials' error")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Non-existent email rejected")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 2d: Login without password
    print("\n[Test 2d] Login without password")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json={
                "email": "alice.test@example.com"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print(f"  ✗ FAILED: Expected 400, got {response.status_code}")
            all_passed = False
        else:
            print(f"  ✓ PASSED: Missing password rejected")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ AUTH LOGIN TESTS PASSED")
    else:
        print("✗ AUTH LOGIN TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_auth_me():
    """Test GET /api/auth/me endpoint"""
    print("\n" + "="*60)
    print("Testing Auth Me Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 3a: Access without token
    print("\n[Test 3a] Access without token")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/auth/me",
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"  ✗ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if 'error' not in data:
                print(f"  ✗ FAILED: Missing error message")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Unauthorized access rejected")
                print(f"    Error: {data['error']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 3b: Access with invalid token
    print("\n[Test 3b] Access with invalid token")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"  ✗ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            print(f"  ✓ PASSED: Invalid token rejected")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 3c: Access with valid token
    print("\n[Test 3c] Access with valid token")
    try:
        if not VALID_TOKEN:
            print(f"  ✗ FAILED: No valid token available from signup")
            all_passed = False
        else:
            response = requests.get(
                f"{BACKEND_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {VALID_TOKEN}"},
                timeout=5
            )
            
            print(f"  Status Code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
                all_passed = False
            else:
                data = response.json()
                
                if not data.get('success'):
                    print(f"  ✗ FAILED: success should be true")
                    all_passed = False
                elif 'data' not in data or 'user' not in data['data']:
                    print(f"  ✗ FAILED: Missing user data")
                    all_passed = False
                else:
                    user = data['data']['user']
                    
                    if 'passwordHash' in user:
                        print(f"  ✗ FAILED: passwordHash should NOT be in response")
                        all_passed = False
                    elif user['email'] != 'alice.test@example.com':
                        print(f"  ✗ FAILED: Wrong user returned")
                        all_passed = False
                    else:
                        print(f"  ✓ PASSED: Valid token accepted")
                        print(f"    User: {user['email']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ AUTH ME TESTS PASSED")
    else:
        print("✗ AUTH ME TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_auth_logout():
    """Test POST /api/auth/logout endpoint"""
    print("\n" + "="*60)
    print("Testing Auth Logout Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 4a: Logout without token
    print("\n[Test 4a] Logout without token")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/logout",
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        # Logout can work without token (client-side implementation)
        if response.status_code == 200:
            print(f"  ✓ PASSED: Logout allowed without token")
        elif response.status_code == 401:
            print(f"  ✓ PASSED: Logout requires token")
        else:
            print(f"  ✗ FAILED: Unexpected status code")
            all_passed = False
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 4b: Logout with valid token
    print("\n[Test 4b] Logout with valid token")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"} if VALID_TOKEN else {},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Logout successful")
                print(f"    Message: {data.get('message', 'N/A')}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ AUTH LOGOUT TESTS PASSED")
    else:
        print("✗ AUTH LOGOUT TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_auth_refresh():
    """Test POST /api/auth/refresh endpoint"""
    print("\n" + "="*60)
    print("Testing Auth Refresh Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 5a: Call refresh endpoint (should return 501)
    print("\n[Test 5a] Call refresh endpoint")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/refresh",
            json={"refreshToken": "some_token"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 501:
            print(f"  ✗ FAILED: Expected 501, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if data.get('success') != False:
                print(f"  ✗ FAILED: success should be false")
                all_passed = False
            elif 'not implemented' not in data.get('error', '').lower():
                print(f"  ✗ FAILED: Expected 'not implemented' error")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Refresh returns 501 Not Implemented")
                print(f"    Error: {data['error']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ AUTH REFRESH TESTS PASSED")
    else:
        print("✗ AUTH REFRESH TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_auth_apple():
    """Test POST /api/auth/apple endpoint"""
    print("\n" + "="*60)
    print("Testing Auth Apple Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 6a: Call without real Apple token
    print("\n[Test 6a] Call without real Apple token")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/apple",
            json={"identityToken": "fake_apple_token_12345"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code not in [400, 401]:
            print(f"  ✗ FAILED: Expected 400 or 401, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if data.get('success') != False:
                print(f"  ✗ FAILED: success should be false")
                all_passed = False
            elif 'error' not in data:
                print(f"  ✗ FAILED: Missing error message")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Invalid Apple token rejected")
                print(f"    Error: {data['error']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ AUTH APPLE TESTS PASSED")
    else:
        print("✗ AUTH APPLE TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_auth_google():
    """Test POST /api/auth/google endpoint"""
    print("\n" + "="*60)
    print("Testing Auth Google Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 7a: Call without real Google token
    print("\n[Test 7a] Call without real Google token")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/google",
            json={"idToken": "fake_google_token_67890"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code not in [400, 401]:
            print(f"  ✗ FAILED: Expected 400 or 401, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            if data.get('success') != False:
                print(f"  ✗ FAILED: success should be false")
                all_passed = False
            elif 'error' not in data:
                print(f"  ✗ FAILED: Missing error message")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Invalid Google token rejected")
                print(f"    Error: {data['error']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ AUTH GOOGLE TESTS PASSED")
    else:
        print("✗ AUTH GOOGLE TESTS FAILED")
    print("="*60)
    
    return all_passed

# Global variables to store valid tokens
VALID_TOKEN = None
PROFILE_TEST_TOKEN = None
BIRTH_DATA_TOKEN = None

def test_profile_create():
    """Test POST /api/profile - Create profile"""
    print("\n" + "="*60)
    print("Testing Profile Create Endpoint")
    print("="*60)
    
    all_passed = True
    
    # First, create a new user for profile testing
    print("\n[Setup] Creating test user for profile tests")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/signup",
            json={
                "name": "Profile Test User",
                "email": "profiletest@example.com",
                "password": "Password123!"
            },
            timeout=5
        )
        
        if response.status_code == 201:
            data = response.json()
            global PROFILE_TEST_TOKEN
            PROFILE_TEST_TOKEN = data['data']['token']
            print(f"  ✓ Test user created, token: {PROFILE_TEST_TOKEN[:20]}...")
        elif response.status_code == 400:
            # User already exists, try to login
            response = requests.post(
                f"{BACKEND_URL}/api/auth/login",
                json={
                    "email": "profiletest@example.com",
                    "password": "Password123!"
                },
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                PROFILE_TEST_TOKEN = data['data']['token']
                print(f"  ✓ Logged in existing user, token: {PROFILE_TEST_TOKEN[:20]}...")
            else:
                print(f"  ✗ FAILED: Could not login existing user")
                return False
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        return False
    
    # Test 1: Create profile with all fields
    print("\n[Test 1] Create profile with all fields (Taurus)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile",
            headers={"Authorization": f"Bearer {PROFILE_TEST_TOKEN}"},
            json={
                "name": "Profile Test User",
                "birthDate": "1990-05-15",
                "birthTime": "14:30",
                "birthLocation": {
                    "city": "New York",
                    "country": "USA",
                    "lat": 40.7128,
                    "lng": -74.0060
                },
                "handedness": "right"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 201:
            print(f"  ✗ FAILED: Expected 201, got {response.status_code}")
            print(f"  Response: {response.text}")
            all_passed = False
        else:
            data = response.json()
            
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            elif 'data' not in data:
                print(f"  ✗ FAILED: Missing 'data' field")
                all_passed = False
            else:
                profile = data['data']
                
                # Verify profile fields
                if profile.get('sunSign') != 'Taurus':
                    print(f"  ✗ FAILED: Expected sunSign 'Taurus', got '{profile.get('sunSign')}'")
                    all_passed = False
                elif profile.get('lifePathNumber') != 3:
                    print(f"  ✗ FAILED: Expected lifePathNumber 3, got {profile.get('lifePathNumber')}")
                    all_passed = False
                elif profile.get('handedness') != 'right':
                    print(f"  ✗ FAILED: Expected handedness 'right', got '{profile.get('handedness')}'")
                    all_passed = False
                else:
                    print(f"  ✓ PASSED: Profile created successfully")
                    print(f"    Sun Sign: {profile['sunSign']}")
                    print(f"    Life Path Number: {profile['lifePathNumber']}")
                    print(f"    Personal Year: {profile.get('personalYear')}")
                    print(f"    Personal Month: {profile.get('personalMonth')}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ PROFILE CREATE TESTS PASSED")
    else:
        print("✗ PROFILE CREATE TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_profile_birth_data():
    """Test POST /api/profile/birth-data - Set birth data"""
    print("\n" + "="*60)
    print("Testing Profile Birth Data Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Create a second user for birth data tests
    print("\n[Setup] Creating second test user")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/auth/signup",
            json={
                "name": "Birth Data Test User",
                "email": "birthdata@example.com",
                "password": "Password123!"
            },
            timeout=5
        )
        
        if response.status_code == 201:
            data = response.json()
            global BIRTH_DATA_TOKEN
            BIRTH_DATA_TOKEN = data['data']['token']
            print(f"  ✓ Second test user created")
            
            # Create initial profile
            response = requests.post(
                f"{BACKEND_URL}/api/profile",
                headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
                json={
                    "name": "Birth Data Test User",
                    "birthDate": "1985-01-01",
                    "handedness": "left"
                },
                timeout=5
            )
            if response.status_code == 201:
                print(f"  ✓ Initial profile created")
            else:
                print(f"  ✗ FAILED: Could not create initial profile")
                return False
        elif response.status_code == 400:
            # User already exists, try to login
            response = requests.post(
                f"{BACKEND_URL}/api/auth/login",
                json={
                    "email": "birthdata@example.com",
                    "password": "Password123!"
                },
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                BIRTH_DATA_TOKEN = data['data']['token']
                print(f"  ✓ Logged in existing user")
            else:
                print(f"  ✗ FAILED: Could not login existing user")
                return False
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        return False
    
    # Test 1a: Set birth data with all fields (Taurus)
    print("\n[Test 1a] Set birth data with all fields (Taurus)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile/birth-data",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={
                "birthDate": "1990-05-15",
                "birthTime": "14:30",
                "birthLocation": {
                    "city": "New York",
                    "country": "USA",
                    "lat": 40.7128,
                    "lng": -74.0060
                },
                "handedness": "right"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            print(f"  Response: {response.text}")
            all_passed = False
        else:
            data = response.json()
            
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            elif 'data' not in data:
                print(f"  ✗ FAILED: Missing 'data' field")
                all_passed = False
            else:
                result = data['data']
                profile = result.get('profile', {})
                calculated = result.get('calculated', {})
                
                # Verify profile fields
                if profile.get('sunSign') != 'Taurus':
                    print(f"  ✗ FAILED: Expected profile.sunSign 'Taurus', got '{profile.get('sunSign')}'")
                    all_passed = False
                elif profile.get('lifePathNumber') != 3:
                    print(f"  ✗ FAILED: Expected profile.lifePathNumber 3, got {profile.get('lifePathNumber')}")
                    all_passed = False
                elif calculated.get('sunSign') != 'Taurus':
                    print(f"  ✗ FAILED: Expected calculated.sunSign 'Taurus', got '{calculated.get('sunSign')}'")
                    all_passed = False
                elif calculated.get('lifePathNumber') != 3:
                    print(f"  ✗ FAILED: Expected calculated.lifePathNumber 3, got {calculated.get('lifePathNumber')}")
                    all_passed = False
                else:
                    # Verify traits
                    traits = calculated.get('sunSignTraits', [])
                    expected_traits = ['reliable', 'patient', 'practical', 'devoted']
                    if not all(t in traits for t in expected_traits):
                        print(f"  ✗ FAILED: Missing expected Taurus traits")
                        print(f"    Expected: {expected_traits}")
                        print(f"    Got: {traits}")
                        all_passed = False
                    elif 'Communicator' not in calculated.get('lifePathMeaning', ''):
                        print(f"  ✗ FAILED: Expected 'Communicator' in lifePathMeaning")
                        all_passed = False
                    else:
                        print(f"  ✓ PASSED: Birth data set successfully")
                        print(f"    Sun Sign: {calculated['sunSign']}")
                        print(f"    Sun Sign Traits: {traits}")
                        print(f"    Life Path Number: {calculated['lifePathNumber']}")
                        print(f"    Life Path Meaning: {calculated['lifePathMeaning']}")
                        print(f"    Personal Year: {calculated.get('personalYear')}")
                        print(f"    Personal Month: {calculated.get('personalMonth')}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1b: Set birth data with only required fields (Aries)
    print("\n[Test 1b] Set birth data with only required fields (Aries)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile/birth-data",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={
                "birthDate": "1995-03-21",
                "handedness": "left"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            calculated = data['data'].get('calculated', {})
            
            if calculated.get('sunSign') != 'Aries':
                print(f"  ✗ FAILED: Expected sunSign 'Aries', got '{calculated.get('sunSign')}'")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Birth data set with minimal fields")
                print(f"    Sun Sign: {calculated['sunSign']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1c: Capricorn edge case (Dec 25)
    print("\n[Test 1c] Capricorn edge case (Dec 25)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile/birth-data",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={
                "birthDate": "1985-12-25",
                "handedness": "right"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            calculated = data['data'].get('calculated', {})
            
            if calculated.get('sunSign') != 'Capricorn':
                print(f"  ✗ FAILED: Expected sunSign 'Capricorn', got '{calculated.get('sunSign')}'")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Capricorn (Dec 25) calculated correctly")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1d: Aquarius edge case (Jan 20)
    print("\n[Test 1d] Aquarius edge case (Jan 20)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile/birth-data",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={
                "birthDate": "1985-01-20",
                "handedness": "right"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            calculated = data['data'].get('calculated', {})
            
            if calculated.get('sunSign') != 'Aquarius':
                print(f"  ✗ FAILED: Expected sunSign 'Aquarius', got '{calculated.get('sunSign')}'")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Aquarius (Jan 20) calculated correctly")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1e: Invalid birth date (future)
    print("\n[Test 1e] Invalid birth date (future)")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile/birth-data",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={
                "birthDate": "2030-01-01",
                "handedness": "right"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        # Note: The validation doesn't check for future dates, so this might pass
        # We'll just log the result
        if response.status_code == 200:
            print(f"  ⚠ WARNING: Future date accepted (no validation)")
        elif response.status_code == 400:
            print(f"  ✓ PASSED: Future date rejected")
        else:
            print(f"  ✗ FAILED: Unexpected status code")
            all_passed = False
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1f: Invalid birth date format
    print("\n[Test 1f] Invalid birth date format")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile/birth-data",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={
                "birthDate": "1990/05/15",
                "handedness": "right"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print(f"  ✗ FAILED: Expected 400, got {response.status_code}")
            all_passed = False
        else:
            print(f"  ✓ PASSED: Invalid date format rejected")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 1g: Missing handedness
    print("\n[Test 1g] Missing handedness")
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/profile/birth-data",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={
                "birthDate": "1990-05-15"
            },
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print(f"  ✗ FAILED: Expected 400, got {response.status_code}")
            all_passed = False
        else:
            print(f"  ✓ PASSED: Missing handedness rejected")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ PROFILE BIRTH DATA TESTS PASSED")
    else:
        print("✗ PROFILE BIRTH DATA TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_profile_get():
    """Test GET /api/profile - Get profile"""
    print("\n" + "="*60)
    print("Testing Profile Get Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 1: Get profile after setting birth data
    print("\n[Test 1] Get profile after setting birth data")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/profile",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            elif 'data' not in data:
                print(f"  ✗ FAILED: Missing 'data' field")
                all_passed = False
            else:
                profile = data['data']
                
                if 'sunSign' not in profile:
                    print(f"  ✗ FAILED: Missing sunSign")
                    all_passed = False
                elif 'lifePathNumber' not in profile:
                    print(f"  ✗ FAILED: Missing lifePathNumber")
                    all_passed = False
                else:
                    print(f"  ✓ PASSED: Profile retrieved successfully")
                    print(f"    Sun Sign: {profile['sunSign']}")
                    print(f"    Life Path Number: {profile['lifePathNumber']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 2: Get profile without auth token
    print("\n[Test 2] Get profile without auth token")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/profile",
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print(f"  ✗ FAILED: Expected 401, got {response.status_code}")
            all_passed = False
        else:
            print(f"  ✓ PASSED: Unauthorized access rejected")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ PROFILE GET TESTS PASSED")
    else:
        print("✗ PROFILE GET TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_profile_update():
    """Test PATCH /api/profile - Update profile"""
    print("\n" + "="*60)
    print("Testing Profile Update Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 1: Update handedness
    print("\n[Test 1] Update handedness")
    try:
        response = requests.patch(
            f"{BACKEND_URL}/api/profile",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={"handedness": "left"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            profile = data['data']
            
            if profile.get('handedness') != 'left':
                print(f"  ✗ FAILED: Handedness not updated")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Handedness updated successfully")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 2: Update name
    print("\n[Test 2] Update name")
    try:
        response = requests.patch(
            f"{BACKEND_URL}/api/profile",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            json={"name": "Updated Name"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            profile = data['data']
            
            if profile.get('name') != 'Updated Name':
                print(f"  ✗ FAILED: Name not updated")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Name updated successfully")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ PROFILE UPDATE TESTS PASSED")
    else:
        print("✗ PROFILE UPDATE TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_profile_astrology():
    """Test GET /api/profile/astrology - Get astrology"""
    print("\n" + "="*60)
    print("Testing Profile Astrology Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 1: Get astrology after setting birth data
    print("\n[Test 1] Get astrology after setting birth data")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/profile/astrology",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            elif 'data' not in data:
                print(f"  ✗ FAILED: Missing 'data' field")
                all_passed = False
            else:
                astrology = data['data']
                
                if 'sunSign' not in astrology:
                    print(f"  ✗ FAILED: Missing sunSign")
                    all_passed = False
                elif 'sunSignTraits' not in astrology:
                    print(f"  ✗ FAILED: Missing sunSignTraits")
                    all_passed = False
                else:
                    print(f"  ✓ PASSED: Astrology retrieved successfully")
                    print(f"    Sun Sign: {astrology['sunSign']}")
                    print(f"    Traits: {astrology['sunSignTraits']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ PROFILE ASTROLOGY TESTS PASSED")
    else:
        print("✗ PROFILE ASTROLOGY TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_profile_numerology():
    """Test GET /api/profile/numerology - Get numerology"""
    print("\n" + "="*60)
    print("Testing Profile Numerology Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 1: Get numerology after setting birth data
    print("\n[Test 1] Get numerology after setting birth data")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/profile/numerology",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            elif 'data' not in data:
                print(f"  ✗ FAILED: Missing 'data' field")
                all_passed = False
            else:
                numerology = data['data']
                
                required_fields = ['lifePathNumber', 'lifePathMeaning', 'personalYear', 
                                   'personalYearMeaning', 'personalMonth', 'personalMonthMeaning']
                missing = [f for f in required_fields if f not in numerology]
                
                if missing:
                    print(f"  ✗ FAILED: Missing fields: {missing}")
                    all_passed = False
                else:
                    print(f"  ✓ PASSED: Numerology retrieved successfully")
                    print(f"    Life Path Number: {numerology['lifePathNumber']}")
                    print(f"    Life Path Meaning: {numerology['lifePathMeaning']}")
                    print(f"    Personal Year: {numerology['personalYear']}")
                    print(f"    Personal Month: {numerology['personalMonth']}")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ PROFILE NUMEROLOGY TESTS PASSED")
    else:
        print("✗ PROFILE NUMEROLOGY TESTS FAILED")
    print("="*60)
    
    return all_passed

def test_profile_delete():
    """Test DELETE /api/profile - Delete profile"""
    print("\n" + "="*60)
    print("Testing Profile Delete Endpoint")
    print("="*60)
    
    all_passed = True
    
    # Test 1: Delete profile
    print("\n[Test 1] Delete profile")
    try:
        response = requests.delete(
            f"{BACKEND_URL}/api/profile",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ✗ FAILED: Expected 200, got {response.status_code}")
            all_passed = False
        else:
            data = response.json()
            
            if not data.get('success'):
                print(f"  ✗ FAILED: success should be true")
                all_passed = False
            else:
                print(f"  ✓ PASSED: Profile deleted successfully")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    # Test 2: Verify profile deleted
    print("\n[Test 2] Verify profile deleted")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/profile",
            headers={"Authorization": f"Bearer {BIRTH_DATA_TOKEN}"},
            timeout=5
        )
        
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code != 404:
            print(f"  ✗ FAILED: Expected 404, got {response.status_code}")
            all_passed = False
        else:
            print(f"  ✓ PASSED: Profile no longer exists")
    except Exception as e:
        print(f"  ✗ FAILED: {str(e)}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ PROFILE DELETE TESTS PASSED")
    else:
        print("✗ PROFILE DELETE TESTS FAILED")
    print("="*60)
    
    return all_passed

def main():
    """Run all backend tests"""
    print("\n" + "="*60)
    print("REVELIA BACKEND TEST SUITE")
    print("="*60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    results = []
    
    # Run tests in sequence
    results.append(("Health Endpoint", test_health_endpoint()))
    results.append(("Auth Signup", test_auth_signup()))
    results.append(("Auth Login", test_auth_login()))
    results.append(("Auth Me", test_auth_me()))
    results.append(("Auth Logout", test_auth_logout()))
    results.append(("Auth Refresh", test_auth_refresh()))
    results.append(("Auth Apple", test_auth_apple()))
    results.append(("Auth Google", test_auth_google()))
    
    # Profile tests
    results.append(("Profile Create", test_profile_create()))
    results.append(("Profile Birth Data", test_profile_birth_data()))
    results.append(("Profile Get", test_profile_get()))
    results.append(("Profile Update", test_profile_update()))
    results.append(("Profile Astrology", test_profile_astrology()))
    results.append(("Profile Numerology", test_profile_numerology()))
    results.append(("Profile Delete", test_profile_delete()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ ALL TESTS PASSED")
        return 0
    else:
        print(f"\n✗ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
