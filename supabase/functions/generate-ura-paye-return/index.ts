import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * URA P10 Monthly PAYE Return Generator
 *
 * Generates a CSV in the format expected by Uganda Revenue Authority (URA)
 * for filing the monthly PAYE return (P10 form).
 *
 * Required input: { pay_run_id: string }
 * The pay run must belong to a Uganda expatriate project (tax_country = 'Uganda')
 * and must have status = 'processed' or 'approved'.
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(",");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { pay_run_id } = body;

    if (!pay_run_id) {
      return new Response(
        JSON.stringify({ error: "pay_run_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch pay run ──────────────────────────────────────────────────────
    const { data: payRun, error: prError } = await supabase
      .from("pay_runs")
      .select("id, organization_id, pay_period_start, pay_period_end, status, payroll_type")
      .eq("id", pay_run_id)
      .maybeSingle();

    if (prError || !payRun) {
      return new Response(
        JSON.stringify({ error: "Pay run not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["processed", "approved"].includes(payRun.status)) {
      return new Response(
        JSON.stringify({ error: `Pay run must be approved or processed (current: ${payRun.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch expatriate pay run items ────────────────────────────────────
    const { data: payItems, error: itemsError } = await supabase
      .from("expatriate_pay_run_items")
      .select(`
        id,
        employee_id,
        gross_local,
        net_local,
        tax_country,
        exchange_rate,
        currency,
        employee:employees(
          id,
          first_name,
          last_name,
          tin,
          nssf_number,
          tax_residency_status,
          lst_exempt
        )
      `)
      .eq("pay_run_id", pay_run_id)
      .eq("tax_country", "Uganda");

    if (itemsError) throw itemsError;

    if (!payItems || payItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Uganda expatriate pay items found for this pay run" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch Uganda expatriate policy for tax calculation ────────────────
    const { data: policy } = await supabase
      .from("expatriate_policies")
      .select("flat_tax_rate, apply_flat_tax, nssf_non_resident_employer_rate, exempt_lst")
      .eq("country", "Uganda")
      .maybeSingle();

    const flatTaxRate = policy?.flat_tax_rate ?? 15;

    // ── Build CSV ─────────────────────────────────────────────────────────
    const periodYear = payRun.pay_period_start
      ? new Date(payRun.pay_period_start).getFullYear()
      : new Date().getFullYear();
    const periodMonth = payRun.pay_period_start
      ? String(new Date(payRun.pay_period_start).getMonth() + 1).padStart(2, "0")
      : String(new Date().getMonth() + 1).padStart(2, "0");

    const csvRows: string[] = [];

    // P10 header comment (URA format guidance)
    csvRows.push(buildCsvRow([
      "URA P10 Monthly PAYE Return",
      `Period: ${periodYear}-${periodMonth}`,
      `Generated: ${new Date().toISOString().split("T")[0]}`,
    ]));
    csvRows.push(""); // blank separator

    // Column headers matching URA P10 format
    csvRows.push(buildCsvRow([
      "S/No",
      "Employee TIN",
      "Employee Name",
      "Gross Income (UGX)",
      "Taxable Income (UGX)",
      "PAYE Withheld (UGX)",
      "NSSF Employee (UGX)",
      "NSSF Employer Special (UGX)",
      "LST (UGX)",
      "Net Pay (UGX)",
      "Currency",
      "Exchange Rate",
      "Tax Treatment",
      "NSSF Number",
    ]));

    let totalGross = 0;
    let totalTaxable = 0;
    let totalPaye = 0;
    let totalNssfEmployee = 0;
    let totalNssfEmployer = 0;
    let totalLst = 0;
    let totalNet = 0;

    payItems.forEach((item: any, idx: number) => {
      const emp = item.employee || {};
      const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || `Employee ${item.employee_id.slice(0, 8)}`;
      const isNonResident = !emp.tax_residency_status || emp.tax_residency_status !== "resident";
      const grossLocal = Number(item.gross_local) || 0;

      // Recalculate PAYE for the return (matches edge function logic)
      const paye = grossLocal * (flatTaxRate / 100);
      const nssfEmployee = isNonResident ? 0 : grossLocal * 0.05;
      const nssfEmployerSpecial = isNonResident ? grossLocal * ((policy?.nssf_non_resident_employer_rate ?? 10) / 100) : grossLocal * 0.10;
      const lst = (!policy?.exempt_lst && !emp.lst_exempt) ? 4000 : 0;
      const totalDeductions = paye + nssfEmployee + lst;
      const netPay = grossLocal - totalDeductions;

      totalGross += grossLocal;
      totalTaxable += grossLocal;
      totalPaye += paye;
      totalNssfEmployee += nssfEmployee;
      totalNssfEmployer += nssfEmployerSpecial;
      totalLst += lst;
      totalNet += netPay;

      csvRows.push(buildCsvRow([
        idx + 1,
        emp.tin || "",
        fullName,
        grossLocal.toFixed(2),
        grossLocal.toFixed(2), // taxable = gross for non-residents (flat rate on full gross)
        paye.toFixed(2),
        nssfEmployee.toFixed(2),
        nssfEmployerSpecial.toFixed(2),
        lst.toFixed(2),
        netPay.toFixed(2),
        item.currency || "USD",
        Number(item.exchange_rate).toFixed(4),
        isNonResident ? `Non-Resident (${flatTaxRate}% flat)` : "Resident (progressive)",
        emp.nssf_number || "",
      ]));
    });

    // Totals row
    csvRows.push(""); // separator
    csvRows.push(buildCsvRow([
      "TOTALS",
      "",
      `${payItems.length} employees`,
      totalGross.toFixed(2),
      totalTaxable.toFixed(2),
      totalPaye.toFixed(2),
      totalNssfEmployee.toFixed(2),
      totalNssfEmployer.toFixed(2),
      totalLst.toFixed(2),
      totalNet.toFixed(2),
      "",
      "",
      "",
      "",
    ]));

    const csvContent = csvRows.join("\n");
    const filename = `URA_P10_${periodYear}${periodMonth}_${pay_run_id.slice(0, 8)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("generate-ura-paye-return error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
