#!/usr/bin/env node

/**
 * Test script for the calculate-pay Edge Function
 * Run this after deploying the Edge Function to verify it works correctly
 */

const testCalculations = async () => {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your-anon-key') {
    console.error('❌ Please set VITE_SUPABASE_ANON_KEY environment variable');
    process.exit(1);
  }

  const testCases = [
    {
      name: 'Uganda Employee - Salary',
      input: {
        employee_id: 'test-employee-1',
        pay_rate: 1000000, // 1M UGX
        pay_type: 'salary',
        employee_type: 'local',
        country: 'Uganda',
        custom_deductions: [],
        benefit_deductions: 0
      },
      expected: {
        gross_pay: 1000000,
        paye_tax: 76500, // Should be around 7.65% for 1M UGX
        nssf_employee: 50000, // 5% of 1M
        total_deductions: 126500 // PAYE + NSSF
      }
    },
    {
      name: 'Kenya Employee - Salary',
      input: {
        employee_id: 'test-employee-2',
        pay_rate: 50000, // 50K KSH
        pay_type: 'salary',
        employee_type: 'local',
        country: 'Kenya',
        custom_deductions: [],
        benefit_deductions: 0
      },
      expected: {
        gross_pay: 50000,
        paye_tax: 6500, // Should be around 13% for 50K KSH
        nssf_employee: 3000, // 6% of 50K
        total_deductions: 9500 // PAYE + NSSF
      }
    },
    {
      name: 'Expatriate Employee',
      input: {
        employee_id: 'test-employee-3',
        pay_rate: 2000000, // 2M UGX
        pay_type: 'salary',
        employee_type: 'expatriate',
        country: 'Uganda',
        custom_deductions: [],
        benefit_deductions: 0
      },
      expected: {
        gross_pay: 2000000,
        paye_tax: 300000, // 15% flat tax
        nssf_employee: 0, // Expatriates exempt
        total_deductions: 300000
      }
    }
  ];

  console.log('🧪 Testing Edge Function: calculate-pay');
  console.log('=====================================\n');

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.input)
      });

      if (!response.ok) {
        const error = await response.text();
        console.log(`❌ HTTP ${response.status}: ${error}`);
        continue;
      }

      const result = await response.json();
      
      if (!result.success) {
        console.log(`❌ Function returned error: ${result.error}`);
        continue;
      }

      const data = result.data;
      
      // Check if calculations are reasonable (within 10% of expected)
      const checks = [
        { name: 'Gross Pay', actual: data.gross_pay, expected: testCase.expected.gross_pay },
        { name: 'PAYE Tax', actual: data.paye_tax, expected: testCase.expected.paye_tax, tolerance: 0.1 },
        { name: 'NSSF Employee', actual: data.nssf_employee, expected: testCase.expected.nssf_employee, tolerance: 0.1 },
        { name: 'Total Deductions', actual: data.total_deductions, expected: testCase.expected.total_deductions, tolerance: 0.1 }
      ];

      let allPassed = true;
      
      for (const check of checks) {
        const tolerance = check.tolerance || 0.05; // 5% default tolerance
        const diff = Math.abs(check.actual - check.expected) / check.expected;
        
        if (diff <= tolerance) {
          console.log(`  ✅ ${check.name}: ${check.actual} (expected ~${check.expected})`);
        } else {
          console.log(`  ❌ ${check.name}: ${check.actual} (expected ~${check.expected}) - Diff: ${(diff * 100).toFixed(1)}%`);
          allPassed = false;
        }
      }

      console.log(`  📊 Net Pay: ${data.net_pay}`);
      console.log(`  🏢 Employer Contributions: ${data.employer_contributions}`);
      
      if (allPassed) {
        console.log(`  ✅ Test PASSED\n`);
      } else {
        console.log(`  ❌ Test FAILED\n`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }

  console.log('🏁 Testing completed!');
  console.log('\n📝 Note: These tests use mock employee IDs. For production testing,');
  console.log('   use actual employee IDs from your database.');
};

// Run the tests
testCalculations().catch(console.error);
