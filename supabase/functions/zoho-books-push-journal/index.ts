import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import { createServiceRoleClient, handleCorsPreflight, jsonResponse } from "../_shared/platform-admin-auth.ts";
import {
  booksFetch,
  getValidBooksAccessToken,
  requireCompanyIntegrationAccess,
} from "../_shared/zoho-books.ts";

const PayloadSchema = z.object({
  companyId: z.string().uuid(),
  payRunId: z.string().uuid(),
});

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const { companyId, payRunId } = parsed.data;
    const supabaseAdmin = createServiceRoleClient();
    const { user } = await requireCompanyIntegrationAccess(supabaseAdmin, req, companyId);

    // Idempotency: check if already pushed
    const { data: existingRef } = await supabaseAdmin
      .from("zoho_books_journal_refs")
      .select("id, status, zoho_journal_id")
      .eq("company_id", companyId)
      .eq("pay_run_id", payRunId)
      .maybeSingle();

    if (existingRef?.status === "pushed" && existingRef.zoho_journal_id) {
      return jsonResponse(
        {
          success: true,
          alreadyPushed: true,
          zohoJournalId: existingRef.zoho_journal_id,
          message: "This pay run was already pushed to Zoho Books.",
        },
        { status: 200 },
      );
    }

    // Fetch the pay run
    const { data: payRun, error: payRunError } = await supabaseAdmin
      .from("pay_runs")
      .select("id, pay_run_date, pay_period_start, pay_period_end, status, total_gross_pay, total_deductions, total_net_pay, pay_group_id, pay_run_id")
      .eq("id", payRunId)
      .maybeSingle();

    if (payRunError || !payRun) {
      return jsonResponse({ success: false, message: "Pay run not found" }, { status: 404 });
    }

    if (!["approved", "processed"].includes(payRun.status)) {
      return jsonResponse(
        { success: false, message: "Only approved or processed pay runs can be pushed to Zoho Books" },
        { status: 400 },
      );
    }

    // Fetch the pay group to get country and name
    const { data: payGroup } = await supabaseAdmin
      .from("pay_groups")
      .select("name, country, currency")
      .eq("id", payRun.pay_group_id)
      .maybeSingle();

    // Aggregate pay items for this pay run
    const { data: payItems, error: itemsError } = await supabaseAdmin
      .from("pay_items")
      .select("gross_pay, tax_deduction, benefit_deductions, net_pay, employer_contributions")
      .eq("pay_run_id", payRunId);

    if (itemsError) throw itemsError;

    const totals = (payItems ?? []).reduce(
      (acc, item) => ({
        grossPay: acc.grossPay + Number(item.gross_pay ?? 0),
        taxDeduction: acc.taxDeduction + Number(item.tax_deduction ?? 0),
        benefitDeductions: acc.benefitDeductions + Number(item.benefit_deductions ?? 0),
        netPay: acc.netPay + Number(item.net_pay ?? 0),
        employerContributions: acc.employerContributions + Number(item.employer_contributions ?? 0),
      }),
      { grossPay: 0, taxDeduction: 0, benefitDeductions: 0, netPay: 0, employerContributions: 0 },
    );

    // Fetch GL mappings for this company
    const { data: glMappings, error: glError } = await supabaseAdmin
      .from("zoho_books_gl_mappings")
      .select("mapping_key, zoho_account_id, zoho_account_name, bank_name")
      .eq("company_id", companyId);

    if (glError) throw glError;

    const mapping = Object.fromEntries(
      (glMappings ?? []).map((m) => [m.mapping_key, m]),
    );

    const requiredKeys = ["gross_pay", "paye_tax", "net_pay"];
    const missingKeys = requiredKeys.filter((k) => !mapping[k]);
    if (missingKeys.length > 0) {
      return jsonResponse(
        {
          success: false,
          message: `GL mapping incomplete. Missing: ${missingKeys.join(", ")}. Please configure GL mappings in Settings.`,
        },
        { status: 400 },
      );
    }

    // Get Zoho Books token
    const { accessToken, booksBaseUrl, zohoBooksOrgId } = await getValidBooksAccessToken(supabaseAdmin, companyId);
    if (!zohoBooksOrgId) {
      return jsonResponse(
        { success: false, message: "Zoho Books organization not found. Please reconnect." },
        { status: 400 },
      );
    }

    // Build journal entry lines
    // Accounting logic:
    //   Dr  Salary & Wages Expense         = gross pay + employer NSSF
    //   Cr  PAYE Tax Payable               = tax_deduction
    //   Cr  NSSF Payable (employee)        = benefit_deductions (NSSF portion)
    //   Cr  NSSF Employer Contribution     = employer_contributions
    //   Cr  Bank / Cash Clearing           = net_pay
    // Note: benefit_deductions in this system covers both NSSF employee + other deductions
    // We use separate mapping keys so finance can split as needed

    const journalDate = payRun.pay_run_date;
    const payGroupLabel = payGroup?.name ?? "Payroll";
    const periodLabel = payRun.pay_period_start && payRun.pay_period_end
      ? ` (${payRun.pay_period_start} – ${payRun.pay_period_end})`
      : "";
    const referenceNote = payRun.pay_run_id ?? payRunId.slice(0, 8).toUpperCase();
    const journalNotes = `${payGroupLabel}${periodLabel} | Ref: ${referenceNote}`;

    const lineItems: Array<{ account_id: string; description: string; debit_or_credit: "debit" | "credit"; amount: number }> = [];

    // Debit: Gross salary expense (gross pay + employer NSSF if mapped)
    const grossTotal = totals.grossPay + (mapping["nssf_employer"] ? totals.employerContributions : 0);
    if (grossTotal > 0) {
      lineItems.push({
        account_id: mapping["gross_pay"].zoho_account_id,
        description: `Gross Salary — ${payGroupLabel}`,
        debit_or_credit: "debit",
        amount: Number(grossTotal.toFixed(2)),
      });
    }

    // Credit: PAYE Tax Payable
    if (totals.taxDeduction > 0 && mapping["paye_tax"]) {
      lineItems.push({
        account_id: mapping["paye_tax"].zoho_account_id,
        description: `PAYE Tax Payable — ${payGroupLabel}`,
        debit_or_credit: "credit",
        amount: Number(totals.taxDeduction.toFixed(2)),
      });
    }

    // Credit: NSSF Employee (benefit_deductions)
    if (totals.benefitDeductions > 0 && mapping["nssf_employee"]) {
      lineItems.push({
        account_id: mapping["nssf_employee"].zoho_account_id,
        description: `NSSF Employee Payable — ${payGroupLabel}`,
        debit_or_credit: "credit",
        amount: Number(totals.benefitDeductions.toFixed(2)),
      });
    } else if (totals.benefitDeductions > 0 && mapping["benefit_deductions"]) {
      // Fallback: generic deductions account
      lineItems.push({
        account_id: mapping["benefit_deductions"].zoho_account_id,
        description: `Benefit Deductions Payable — ${payGroupLabel}`,
        debit_or_credit: "credit",
        amount: Number(totals.benefitDeductions.toFixed(2)),
      });
    }

    // Credit: NSSF Employer Contribution
    if (totals.employerContributions > 0 && mapping["nssf_employer"]) {
      lineItems.push({
        account_id: mapping["nssf_employer"].zoho_account_id,
        description: `NSSF Employer Contribution — ${payGroupLabel}`,
        debit_or_credit: "credit",
        amount: Number(totals.employerContributions.toFixed(2)),
      });
    }

    // Credit: Net Pay to Bank Clearing
    if (totals.netPay > 0) {
      lineItems.push({
        account_id: mapping["net_pay"].zoho_account_id,
        description: `Net Pay — Bank Clearing — ${payGroupLabel}`,
        debit_or_credit: "credit",
        amount: Number(totals.netPay.toFixed(2)),
      });
    }

    if (lineItems.length < 2) {
      return jsonResponse(
        { success: false, message: "Insufficient data to build a journal entry (need at least 2 lines)." },
        { status: 400 },
      );
    }

    const journalPayload = {
      journal_date: journalDate,
      reference_number: referenceNote,
      notes: journalNotes,
      line_items: lineItems,
    };

    // Push to Zoho Books
    const booksResponse = await booksFetch(
      "/journals",
      accessToken,
      zohoBooksOrgId,
      booksBaseUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journalPayload),
      },
    ) as any;

    const zohoJournalId = booksResponse?.journal?.journal_id ?? booksResponse?.journal_id ?? null;

    // Upsert the journal ref
    const refPayload = {
      company_id: companyId,
      pay_run_id: payRunId,
      zoho_journal_id: zohoJournalId,
      status: "pushed",
      error_message: null,
      pushed_at: new Date().toISOString(),
      pushed_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (existingRef) {
      await supabaseAdmin.from("zoho_books_journal_refs").update(refPayload).eq("id", existingRef.id);
    } else {
      await supabaseAdmin.from("zoho_books_journal_refs").insert(refPayload);
    }

    // Write to sync_logs
    await supabaseAdmin.from("sync_logs").insert({
      sync_id: `zoho_books_journal_${payRunId}`,
      type: "zoho_books_journal",
      direction: "outbound",
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      records_processed: 1,
      company_id: companyId,
      metadata: {
        pay_run_id: payRunId,
        zoho_journal_id: zohoJournalId,
        totals,
      },
    });

    return jsonResponse(
      {
        success: true,
        zohoJournalId,
        message: `Journal entry created in Zoho Books. Journal ID: ${zohoJournalId}`,
        totals,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("zoho-books-push-journal error:", error);

    // Record failure in journal refs if we have enough context
    // (best effort — don't throw if this also fails)
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.companyId && body?.payRunId) {
        const supabaseAdmin = createServiceRoleClient();
        await supabaseAdmin.from("zoho_books_journal_refs").upsert(
          {
            company_id: body.companyId,
            pay_run_id: body.payRunId,
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,pay_run_id" },
        );
      }
    } catch {
      // ignore
    }

    return jsonResponse(
      { success: false, message: error instanceof Error ? error.message : "Failed to push journal to Zoho Books" },
      { status: 500 },
    );
  }
});
