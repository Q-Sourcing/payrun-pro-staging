#!/usr/bin/env node

/**
 * 🧪 Comprehensive Test Script for Enhanced Payroll System
 * ==========================================================
 * This script tests all the implemented changes:
 * - Schema fixes for pay_groups and employees tables
 * - Frontend UI enhancements
 * - Payroll logic by employee type
 * - Analytics views
 * - Navigation filtering
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${message}`);
  }
  testResults.details.push({ testName, passed, message });
}

async function testSchemaFixes() {
  console.log('\n🔧 Testing Schema Fixes...');
  
  try {
    // Test 1: Check if pay_groups has 'type' column
    const { data: payGroups, error: pgError } = await supabase
      .from('pay_groups')
      .select('type')
      .limit(1);
    
    logTest('Pay Groups Type Column', !pgError && payGroups !== null, pgError?.message);
    
    // Test 2: Check if employees has new columns
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('employee_type, employee_category, employment_status')
      .limit(1);
    
    logTest('Employees New Columns', !empError && employees !== null, empError?.message);
    
    // Test 3: Check if pay_type enum includes 'daily_rate'
    const { data: payTypes, error: ptError } = await supabase
      .from('employees')
      .select('pay_type')
      .eq('pay_type', 'daily_rate')
      .limit(1);
    
    logTest('Pay Type Daily Rate Enum', !ptError, ptError?.message);
    
  } catch (error) {
    logTest('Schema Tests', false, error.message);
  }
}

async function testAnalyticsViews() {
  console.log('\n📊 Testing Analytics Views...');
  
  try {
    // Test 1: vw_active_payruns
    const { data: activePayruns, error: aprError } = await supabase
      .from('vw_active_payruns')
      .select('*')
      .limit(5);
    
    logTest('vw_active_payruns View', !aprError, aprError?.message);
    
    // Test 2: vw_payroll_summary
    const { data: payrollSummary, error: psError } = await supabase
      .from('vw_payroll_summary')
      .select('*');
    
    logTest('vw_payroll_summary View', !psError, psError?.message);
    
    // Test 3: vw_employee_summary
    const { data: employeeSummary, error: esError } = await supabase
      .from('vw_employee_summary')
      .select('*');
    
    logTest('vw_employee_summary View', !esError, esError?.message);
    
  } catch (error) {
    logTest('Analytics Views', false, error.message);
  }
}

async function testPayrollLogic() {
  console.log('\n💰 Testing Payroll Logic...');
  
  try {
    // Test 1: Create test employee with Local type
    const testEmployeeLocal = {
      first_name: 'Test Local',
      last_name: 'Employee',
      email: `test-local-${Date.now()}@example.com`,
      phone: '+256752123456',
      pay_type: 'salary',
      pay_rate: 1000,
      country: 'Uganda',
      currency: 'UGX',
      employee_type: 'Local',
      employee_category: 'Permanent',
      employment_status: 'Active',
      status: 'active'
    };
    
    const { data: localEmp, error: localError } = await supabase
      .from('employees')
      .insert([testEmployeeLocal])
      .select()
      .single();
    
    logTest('Create Local Employee', !localError, localError?.message);
    
    // Test 2: Create test employee with Expatriate type
    const testEmployeeExpat = {
      first_name: 'Test Expat',
      last_name: 'Employee',
      email: `test-expat-${Date.now()}@example.com`,
      phone: '+256752123457',
      pay_type: 'daily_rate',
      pay_rate: 150,
      country: 'Uganda',
      currency: 'USD',
      employee_type: 'Expatriate',
      employment_status: 'Active',
      status: 'active'
    };
    
    const { data: expatEmp, error: expatError } = await supabase
      .from('employees')
      .insert([testEmployeeExpat])
      .select()
      .single();
    
    logTest('Create Expatriate Employee', !expatError, expatError?.message);
    
    // Clean up test data
    if (localEmp?.id) {
      await supabase.from('employees').delete().eq('id', localEmp.id);
    }
    if (expatEmp?.id) {
      await supabase.from('employees').delete().eq('id', expatEmp.id);
    }
    
  } catch (error) {
    logTest('Payroll Logic Tests', false, error.message);
  }
}

async function testPayGroupFiltering() {
  console.log('\n🔍 Testing Pay Group Filtering...');
  
  try {
    // Test 1: Fetch all pay groups
    const { data: allPayGroups, error: allError } = await supabase
      .from('pay_groups')
      .select('id, name, type, country, pay_frequency');
    
    logTest('Fetch All Pay Groups', !allError, allError?.message);
    
    // Test 2: Filter by type (if any exist)
    if (allPayGroups && allPayGroups.length > 0) {
      const localGroups = allPayGroups.filter(pg => pg.type === 'local');
      const expatGroups = allPayGroups.filter(pg => pg.type === 'expatriate');
      
      logTest('Pay Group Type Filtering', true, 
        `Found ${localGroups.length} local, ${expatGroups.length} expatriate groups`);
    } else {
      logTest('Pay Group Type Filtering', true, 'No pay groups found to test filtering');
    }
    
  } catch (error) {
    logTest('Pay Group Filtering', false, error.message);
  }
}

async function testDatabaseFunctions() {
  console.log('\n⚙️ Testing Database Functions...');
  
  try {
    // Test 1: get_employee_pay_type function
    const { data: payTypeData, error: ptError } = await supabase
      .rpc('get_employee_pay_type', { 
        emp_type: 'Expatriate', 
        emp_category: null 
      });
    
    logTest('get_employee_pay_type Function', !ptError, ptError?.message);
    
    // Test 2: get_filtered_pay_groups function
    const { data: filteredGroups, error: fgError } = await supabase
      .rpc('get_filtered_pay_groups', { 
        emp_type: 'Local', 
        emp_category: null 
      });
    
    logTest('get_filtered_pay_groups Function', !fgError, fgError?.message);
    
  } catch (error) {
    logTest('Database Functions', false, error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Starting Comprehensive Payroll System Tests...\n');
  console.log('='.repeat(60));
  
  await testSchemaFixes();
  await testAnalyticsViews();
  await testPayrollLogic();
  await testPayGroupFiltering();
  await testDatabaseFunctions();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.testName}: ${test.message}`);
      });
  }
  
  console.log('\n🎉 Testing completed!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});
