#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sbphmrjoappwlervnbtm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDExNDksImV4cCI6MjA3NjAxNzE0OX0.oxMnsgPnPNGKX8ekvoyN7Xe7J1IRcim4qR_i2_grLYo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAssignmentError() {
  console.log('🧪 Testing Assignment Error');
  console.log('===========================');
  
  try {
    // Get an expatriate employee and group for testing
    const { data: expatEmployee, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_type')
      .eq('employee_type', 'expatriate')
      .single();
    
    if (empError) {
      console.error('❌ Error fetching expatriate employee:', empError);
      return;
    }
    
    const { data: expatGroup, error: groupError } = await supabase
      .from('pay_groups')
      .select('id, name, type')
      .eq('type', 'expatriate')
      .single();
    
    if (groupError) {
      console.error('❌ Error fetching expatriate group:', groupError);
      return;
    }
    
    console.log('📋 Test data:');
    console.log('  Employee ID:', expatEmployee.id);
    console.log('  Employee Name:', expatEmployee.first_name, expatEmployee.last_name);
    console.log('  PayGroup ID:', expatGroup.id);
    console.log('  PayGroup Name:', expatGroup.name);
    
    // Test the edge function with the actual data
    const response = await fetch(`${supabaseUrl}/functions/v1/assign-employee-to-paygroup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        employee_id: expatEmployee.id,
        pay_group_id: expatGroup.id,
        notes: 'Test assignment from script'
      })
    });
    
    const result = await response.json();
    
    console.log('\n📊 Response:');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    console.log('  Result:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.log('\n❌ Error details:');
      console.log('  Error message:', result?.error);
      
      // Check if it's a UUID validation error
      if (result?.error?.includes('invalid input syntax for type uuid')) {
        console.log('  This is a UUID validation error - check the IDs being passed');
      }
      
      // Check if it's a constraint error
      if (result?.error?.includes('unique_employee_in_paygroup')) {
        console.log('  This is a duplicate assignment error');
      }
      
    } else {
      console.log('\n✅ Assignment succeeded!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAssignmentError().catch(console.error);
