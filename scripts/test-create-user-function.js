#!/usr/bin/env node

/**
 * Test script for the create-user Edge Function
 * This script tests the user creation functionality
 */

const SUPABASE_URL = "https://kctwfgbjmhnfqtxhagib.supabase.co";

async function testCreateUserFunction() {
  console.log("🧪 Testing create-user Edge Function...\n");

  // Test data - replace with actual test credentials
  const testUserData = {
    email: "test.user@example.com",
    password: "TempPassword123!",
    full_name: "Test User",
    role: "employee",
    country: "UG"
  };

  // You'll need to replace this with a valid super_admin token
  const superAdminToken = "YOUR_SUPER_ADMIN_TOKEN_HERE";

  if (superAdminToken === "YOUR_SUPER_ADMIN_TOKEN_HERE") {
    console.log("❌ Please update the superAdminToken in this script with a valid super admin token.");
    console.log("   You can get this by:");
    console.log("   1. Logging in as a super admin user");
    console.log("   2. Opening browser dev tools");
    console.log("   3. Going to Application > Local Storage > your-domain");
    console.log("   4. Copying the access_token value");
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(testUserData),
    });

    const result = await response.json();

    console.log(`📡 Response Status: ${response.status}`);
    console.log(`📄 Response Body:`, JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log("\n✅ Test PASSED - User created successfully!");
      console.log(`   User ID: ${result.user_id}`);
      console.log(`   Email: ${testUserData.email}`);
      console.log(`   Role: ${testUserData.role}`);
    } else {
      console.log("\n❌ Test FAILED - User creation failed");
      console.log(`   Error: ${result.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.log("\n❌ Test FAILED - Network or other error");
    console.log(`   Error: ${error.message}`);
  }
}

// Run the test
testCreateUserFunction().catch(console.error);
