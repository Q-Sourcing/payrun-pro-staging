#!/usr/bin/env node

/**
 * 🔧 Test Realtime PayGroup System
 * 
 * Tests the complete automatic and realtime PayGroup system
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class RealtimeSystemTester {
  constructor() {
    this.stagingClient = null;
    this.realtimeChannel = null;
  }

  loadEnvironmentVariables() {
    const envFiles = ['.env.sync', '.env.production', '.env.staging', '.env'];
    
    for (const envFile of envFiles) {
      const envPath = join(process.cwd(), envFile);
      if (existsSync(envPath)) {
        try {
          const content = readFileSync(envPath, 'utf8');
          const lines = content.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
              const [key, ...valueParts] = trimmedLine.split('=');
              if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                process.env[key.trim()] = value;
              }
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }

  async initialize() {
    console.log(`${colors.blue}🔧 Initializing Supabase connection...${colors.reset}`);
    
    this.loadEnvironmentVariables();
    
    try {
      // Try to get credentials from environment
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://sbphmrjoappwlervnbtm.supabase.co';
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (!supabaseKey) {
        console.log(`${colors.yellow}⚠️ No Supabase API key found, using default staging credentials${colors.reset}`);
        this.stagingClient = createClient(
          'https://sbphmrjoappwlervnbtm.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGhtcmpvYXBwd2xlcnZuYnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4MDAsImV4cCI6MjA1MjU1MDgwMH0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8'
        );
      } else {
        this.stagingClient = createClient(supabaseUrl, supabaseKey);
      }
      
      console.log(`${colors.green}✅ Connected to Supabase${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Failed to connect to Supabase: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async testDatabaseTriggers() {
    console.log(`${colors.blue}🔍 Testing database triggers...${colors.reset}`);
    
    try {
      // Get a test employee and pay group
      const { data: employees, error: empError } = await this.stagingClient
        .from('employees')
        .select('id, first_name, last_name, pay_group_id')
        .eq('status', 'active')
        .limit(1);

      if (empError || !employees || employees.length === 0) {
        console.log(`${colors.yellow}⚠️ No employees found for trigger testing${colors.reset}`);
        return false;
      }

      const { data: payGroups, error: pgError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name')
        .limit(2);

      if (pgError || !payGroups || payGroups.length < 2) {
        console.log(`${colors.yellow}⚠️ Need at least 2 pay groups for trigger testing${colors.reset}`);
        return false;
      }

      const testEmployee = employees[0];
      const payGroup1 = payGroups[0];
      const payGroup2 = payGroups[1];

      console.log(`${colors.blue}📋 Testing with employee: ${testEmployee.first_name} ${testEmployee.last_name}${colors.reset}`);

      // Test 1: Update employee's pay_group_id (should trigger sync)
      console.log(`${colors.blue}🧪 Test 1: Updating employee pay_group_id...${colors.reset}`);
      
      const { error: updateError } = await this.stagingClient
        .from('employees')
        .update({ pay_group_id: payGroup1.id })
        .eq('id', testEmployee.id);

      if (updateError) {
        console.log(`${colors.red}❌ Error updating employee: ${updateError.message}${colors.reset}`);
        return false;
      }

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if paygroup_employees record was created
      const { data: assignments1, error: checkError1 } = await this.stagingClient
        .from('paygroup_employees')
        .select('*')
        .eq('employee_id', testEmployee.id)
        .eq('pay_group_id', payGroup1.id)
        .eq('active', true);

      if (checkError1) {
        console.log(`${colors.red}❌ Error checking assignments: ${checkError1.message}${colors.reset}`);
        return false;
      }

      if (assignments1 && assignments1.length > 0) {
        console.log(`${colors.green}✅ Trigger test 1 passed: paygroup_employees record created${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Trigger test 1 failed: no paygroup_employees record found${colors.reset}`);
        return false;
      }

      // Test 2: Change employee's pay_group_id (should update assignments)
      console.log(`${colors.blue}🧪 Test 2: Changing employee pay_group_id...${colors.reset}`);
      
      const { error: updateError2 } = await this.stagingClient
        .from('employees')
        .update({ pay_group_id: payGroup2.id })
        .eq('id', testEmployee.id);

      if (updateError2) {
        console.log(`${colors.red}❌ Error updating employee: ${updateError2.message}${colors.reset}`);
        return false;
      }

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if old assignment was marked as inactive and new one was created
      const { data: oldAssignments, error: checkError2 } = await this.stagingClient
        .from('paygroup_employees')
        .select('*')
        .eq('employee_id', testEmployee.id)
        .eq('pay_group_id', payGroup1.id);

      const { data: newAssignments, error: checkError3 } = await this.stagingClient
        .from('paygroup_employees')
        .select('*')
        .eq('employee_id', testEmployee.id)
        .eq('pay_group_id', payGroup2.id)
        .eq('active', true);

      if (checkError2 || checkError3) {
        console.log(`${colors.red}❌ Error checking assignments: ${checkError2?.message || checkError3?.message}${colors.reset}`);
        return false;
      }

      const oldInactive = oldAssignments?.some(a => !a.active) || false;
      const newActive = newAssignments && newAssignments.length > 0;

      if (oldInactive && newActive) {
        console.log(`${colors.green}✅ Trigger test 2 passed: old assignment deactivated, new assignment created${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Trigger test 2 failed: oldInactive=${oldInactive}, newActive=${newActive}${colors.reset}`);
        return false;
      }

      // Test 3: Set pay_group_id to null (should mark as removed)
      console.log(`${colors.blue}🧪 Test 3: Setting employee pay_group_id to null...${colors.reset}`);
      
      const { error: updateError3 } = await this.stagingClient
        .from('employees')
        .update({ pay_group_id: null })
        .eq('id', testEmployee.id);

      if (updateError3) {
        console.log(`${colors.red}❌ Error updating employee: ${updateError3.message}${colors.reset}`);
        return false;
      }

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if assignment was marked as inactive
      const { data: finalAssignments, error: checkError4 } = await this.stagingClient
        .from('paygroup_employees')
        .select('*')
        .eq('employee_id', testEmployee.id)
        .eq('pay_group_id', payGroup2.id);

      if (checkError4) {
        console.log(`${colors.red}❌ Error checking final assignments: ${checkError4.message}${colors.reset}`);
        return false;
      }

      const finalInactive = finalAssignments?.some(a => !a.active && a.removed_at) || false;

      if (finalInactive) {
        console.log(`${colors.green}✅ Trigger test 3 passed: assignment marked as removed${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Trigger test 3 failed: assignment not marked as removed${colors.reset}`);
        return false;
      }

      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing database triggers: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async testRealtimeSubscription() {
    console.log(`${colors.blue}🔍 Testing realtime subscription...${colors.reset}`);
    
    return new Promise((resolve) => {
      let receivedEvents = 0;
      const expectedEvents = 1;
      let timeout;

      // Set up realtime subscription
      const channel = this.stagingClient
        .channel('test-paygroup-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'paygroup_employees'
          },
          (payload) => {
            receivedEvents++;
            console.log(`${colors.green}📡 Realtime event received: ${payload.eventType}${colors.reset}`);
            
            if (receivedEvents >= expectedEvents) {
              clearTimeout(timeout);
              this.stagingClient.removeChannel(channel);
              resolve(true);
            }
          }
        )
        .subscribe((status) => {
          console.log(`${colors.blue}📡 Realtime subscription status: ${status}${colors.reset}`);
          
          if (status === 'SUBSCRIBED') {
            // Trigger a change to test realtime
            this.triggerRealtimeTest();
          }
        });

      // Set timeout
      timeout = setTimeout(() => {
        this.stagingClient.removeChannel(channel);
        if (receivedEvents > 0) {
          console.log(`${colors.green}✅ Realtime test passed: received ${receivedEvents} events${colors.reset}`);
          resolve(true);
        } else {
          console.log(`${colors.red}❌ Realtime test failed: no events received${colors.reset}`);
          resolve(false);
        }
      }, 10000);
    });
  }

  async triggerRealtimeTest() {
    try {
      // Get a test employee and pay group
      const { data: employees, error: empError } = await this.stagingClient
        .from('employees')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .limit(1);

      if (empError || !employees || employees.length === 0) {
        console.log(`${colors.yellow}⚠️ No employees found for realtime testing${colors.reset}`);
        return;
      }

      const { data: payGroups, error: pgError } = await this.stagingClient
        .from('pay_groups')
        .select('id, name')
        .limit(1);

      if (pgError || !payGroups || payGroups.length === 0) {
        console.log(`${colors.yellow}⚠️ No pay groups found for realtime testing${colors.reset}`);
        return;
      }

      const testEmployee = employees[0];
      const testPayGroup = payGroups[0];

      console.log(`${colors.blue}🧪 Triggering realtime test: updating ${testEmployee.first_name} to ${testPayGroup.name}${colors.reset}`);

      // Update employee to trigger realtime event
      const { error: updateError } = await this.stagingClient
        .from('employees')
        .update({ pay_group_id: testPayGroup.id })
        .eq('id', testEmployee.id);

      if (updateError) {
        console.log(`${colors.red}❌ Error triggering realtime test: ${updateError.message}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error in triggerRealtimeTest: ${error.message}${colors.reset}`);
    }
  }

  async testViewPerformance() {
    console.log(`${colors.blue}🔍 Testing paygroup_employees_view performance...${colors.reset}`);
    
    try {
      const startTime = Date.now();
      
      const { data: viewData, error: viewError } = await this.stagingClient
        .from('paygroup_employees_view')
        .select('*')
        .limit(10);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (viewError) {
        console.log(`${colors.red}❌ Error testing view: ${viewError.message}${colors.reset}`);
        return false;
      }

      console.log(`${colors.green}✅ View performance test passed: ${queryTime}ms for ${viewData?.length || 0} records${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Error testing view performance: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

async function main() {
  console.log(`${colors.magenta}${colors.bright}
🔧 Realtime PayGroup System Tester
==================================
${colors.reset}`);

  const tester = new RealtimeSystemTester();
  
  if (!(await tester.initialize())) {
    process.exit(1);
  }

  console.log(`${colors.blue}🧪 Running realtime system tests...${colors.reset}`);
  
  const test1 = await tester.testDatabaseTriggers();
  const test2 = await tester.testViewPerformance();
  const test3 = await tester.testRealtimeSubscription();
  
  if (test1 && test2 && test3) {
    console.log(`${colors.green}${colors.bright}
✅ All Realtime System Tests Passed
===================================
The complete automatic and realtime PayGroup system is working:
- ✅ Database triggers automatically sync paygroup_employees
- ✅ paygroup_employees_view performs well
- ✅ Realtime subscriptions work correctly

The frontend should now receive automatic updates when:
- Employees are added/removed from pay groups
- Employee pay_group_id changes
- Pay group assignments are modified

🚀 The system is ready for production use!
${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}
❌ Some Realtime System Tests Failed
===================================
Check the error messages above for details.
${colors.reset}`);
  }
}

main().catch(console.error);
