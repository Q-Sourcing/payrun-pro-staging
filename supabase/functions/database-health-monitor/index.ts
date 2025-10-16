/**
 * PayRun Pro Database Health Monitor
 * Runs weekly and emails a comprehensive health report
 */

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface HealthCheck {
  name: string;
  query: string;
  expected?: string;
  critical?: boolean;
}

serve(async () => {
  console.log("🧠 Starting PayRun Pro Database Health Monitor...");
  
  const healthChecks: HealthCheck[] = [
    {
      name: "Core Tables Existence",
      query: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('employees', 'pay_groups', 'paygroup_employees', 'payroll_configurations') ORDER BY table_name;`,
      critical: true
    },
    {
      name: "RLS Enabled on Protected Tables",
      query: `SELECT relname as table_name, relrowsecurity as rls_enabled FROM pg_class WHERE relname IN ('employees', 'pay_groups', 'paygroup_employees') AND relkind = 'r' ORDER BY relname;`,
      critical: true
    },
    {
      name: "Assignment Validation Trigger",
      query: `SELECT tgname as trigger_name, relname as table_name FROM pg_trigger JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid WHERE relname = 'paygroup_employees' AND tgname = 'trg_enforce_unique_paygroup' AND NOT tgisinternal;`,
      critical: true
    },
    {
      name: "Assignment Validation Function",
      query: `SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_name = 'enforce_unique_or_smart_paygroup_assignment';`,
      critical: true
    },
    {
      name: "Employee Identification Fields",
      query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'employees' AND column_name IN ('national_id', 'tin', 'social_security_number', 'passport_number') ORDER BY column_name;`,
      critical: true
    },
    {
      name: "Performance Indexes",
      query: `SELECT indexname, tablename FROM pg_indexes WHERE indexname IN ('idx_employees_national_id', 'idx_pge_group', 'idx_pge_employee') ORDER BY indexname;`,
      critical: false
    },
    {
      name: "Primary Keys on Core Tables",
      query: `SELECT table_name FROM information_schema.table_constraints WHERE constraint_type = 'PRIMARY KEY' AND table_name IN ('employees', 'pay_groups', 'paygroup_employees', 'payroll_configurations') ORDER BY table_name;`,
      critical: true
    },
    {
      name: "Migration History",
      query: `SELECT version, applied_at FROM supabase_migrations.schema_migrations ORDER BY applied_at DESC LIMIT 5;`,
      critical: false
    },
    {
      name: "PayGroup ID Format Check",
      query: `SELECT COUNT(*) as total, COUNT(CASE WHEN paygroup_id LIKE '%-%-%' THEN 1 END) as new_format FROM pay_groups;`,
      critical: false
    },
    {
      name: "Edge Functions Deployment",
      query: `SELECT COUNT(*) as function_count FROM supabase_functions.functions WHERE name IN ('calculate-pay', 'assign-employee-to-paygroup', 'create-user', 'database-health-monitor');`,
      critical: true
    }
  ];

  const results: string[] = [];
  const criticalIssues: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  console.log(`🔍 Running ${healthChecks.length} health checks...`);

  for (const check of healthChecks) {
    totalChecks++;
    
    try {
      const { data, error } = await supabase.rpc('exec_raw_sql', { query: check.query });
      
      if (error) {
        const message = `❌ ${check.name}: Database Error - ${error.message}`;
        results.push(message);
        if (check.critical) criticalIssues.push(message);
        console.error(`❌ ${check.name}:`, error);
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        const message = `⚠️ ${check.name}: No data found`;
        results.push(message);
        if (check.critical) criticalIssues.push(message);
        console.warn(`⚠️ ${check.name}: No data`);
      } else {
        const rowCount = Array.isArray(data) ? data.length : 1;
        const message = `✅ ${check.name}: OK (${rowCount} results)`;
        results.push(message);
        passedChecks++;
        console.log(`✅ ${check.name}: OK`);
      }
    } catch (err) {
      const message = `❌ ${check.name}: Execution Error - ${err.message}`;
      results.push(message);
      if (check.critical) criticalIssues.push(message);
      console.error(`❌ ${check.name}:`, err);
    }
  }

  // Calculate health score
  const healthScore = Math.round((passedChecks / totalChecks) * 100);
  const healthStatus = healthScore >= 90 ? '🟢 EXCELLENT' : 
                      healthScore >= 70 ? '🟡 GOOD' : 
                      healthScore >= 50 ? '🟠 WARNING' : '🔴 CRITICAL';

  // Generate comprehensive report
  const report = `
🧠 **PayRun Pro Database Health Report**
📅 Date: ${new Date().toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}
🎯 Health Score: ${healthScore}% (${healthStatus})
📊 Checks Passed: ${passedChecks}/${totalChecks}

${results.map(r => `• ${r}`).join('\n')}

${criticalIssues.length > 0 ? `
🚨 **CRITICAL ISSUES DETECTED:**
${criticalIssues.map(r => `• ${r}`).join('\n')}

**IMMEDIATE ACTION REQUIRED:**
1. Check Supabase Dashboard for errors
2. Run: supabase db diff --linked
3. Run: supabase db push
4. Test Edge Functions manually
` : `
✅ **ALL SYSTEMS HEALTHY**
Your PayRun Pro database is operating optimally.
`}

📋 **Next Steps:**
• Monitor this report weekly
• Address any ⚠️ warnings proactively  
• Test PayGroups functionality regularly
• Keep Edge Functions updated

---
🤖 Automated by PayRun Pro Health Monitor
`;

  // Log the health check results
  try {
    await supabase.rpc('log_health_check', {
      p_health_score: healthScore,
      p_health_status: healthStatus,
      p_critical_issues_count: criticalIssues.length,
      p_total_checks: totalChecks,
      p_passed_checks: passedChecks,
      p_report_data: {
        results: results,
        critical_issues: criticalIssues,
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ Health check results logged to database');
  } catch (logError) {
    console.warn('⚠️ Failed to log health check results:', logError);
  }

  // Send email using Resend
  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PayRun Pro Monitor <monitor@payrunpro.com>',
        to: ['nalungukevin@gmail.com'],
        subject: `🧠 PayRun Pro Weekly Health Report - ${healthStatus} (${healthScore}%)`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: ${healthScore >= 70 ? '#d4edda' : '#f8d7da'}; border: 1px solid ${healthScore >= 70 ? '#c3e6cb' : '#f5c6cb'}; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: ${healthScore >= 70 ? '#155724' : '#721c24'}; margin: 0 0 10px 0;">🧠 PayRun Pro Database Health Report</h2>
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${new Date().toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}</p>
            <p style="margin: 5px 0;"><strong>🎯 Health Score:</strong> ${healthScore}% (${healthStatus})</p>
            <p style="margin: 5px 0;"><strong>📊 Checks Passed:</strong> ${passedChecks}/${totalChecks}</p>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">📋 Health Check Results:</h3>
            <pre style="font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.4; margin: 0; white-space: pre-wrap;">${results.map(r => `• ${r}`).join('\n')}</pre>
          </div>
          
          ${criticalIssues.length > 0 ? `
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #721c24; margin-top: 0;">🚨 CRITICAL ISSUES DETECTED:</h3>
            <pre style="font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.4; margin: 0; white-space: pre-wrap;">${criticalIssues.map(r => `• ${r}`).join('\n')}</pre>
            <h4 style="color: #721c24;">IMMEDIATE ACTION REQUIRED:</h4>
            <ol style="color: #721c24;">
              <li>Check Supabase Dashboard for errors</li>
              <li>Run: supabase db diff --linked</li>
              <li>Run: supabase db push</li>
              <li>Test Edge Functions manually</li>
            </ol>
          </div>
          ` : `
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-top: 0;">✅ ALL SYSTEMS HEALTHY</h3>
            <p style="color: #155724; margin: 0;">Your PayRun Pro database is operating optimally.</p>
          </div>
          `}
          
          <div style="background: #e2e3e5; border-radius: 8px; padding: 20px;">
            <h4 style="margin-top: 0;">📋 Next Steps:</h4>
            <ul>
              <li>Monitor this report weekly</li>
              <li>Address any ⚠️ warnings proactively</li>
              <li>Test PayGroups functionality regularly</li>
              <li>Keep Edge Functions updated</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; margin: 0; text-align: center;">🤖 Automated by PayRun Pro Health Monitor</p>
          </div>
        </div>`,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Email API error: ${emailResponse.status}`);
    }

    console.log('✅ Health report email sent successfully');
    
    return new Response(JSON.stringify({
      success: true,
      healthScore,
      healthStatus,
      criticalIssues: criticalIssues.length,
      message: 'Health report generated and emailed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (emailError) {
    console.error('❌ Email sending failed:', emailError);
    
    return new Response(JSON.stringify({
      success: false,
      healthScore,
      healthStatus,
      criticalIssues: criticalIssues.length,
      error: 'Failed to send email',
      report // Include report in response for manual review
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
