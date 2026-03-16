
## Answer: Yes, Resend is Already the Email Delivery Layer — and It's Already Wired In

The email pipeline for the approval notifications is **already built around Resend**. Here's the full picture of how it connects:

```
trigger-approval-email (edge fn)
        ↓
   queue-email (edge fn)
        ↓  resolves template from email_templates
        ↓  inserts into email_outbox
        ↓
   send-email (edge fn)
        ↓  uses RESEND_API_KEY
        ↓  calls resend.emails.send()
        ↓
      Resend API → recipient's inbox
```

So Resend **is** the actual delivery engine. `send-email/index.ts` already imports the Resend SDK and uses `RESEND_API_KEY`. The `queue-email` function renders templates and writes to the outbox, then fires `send-email` to dispatch via Resend.

### What this means for the plan

The **3-phase plan remains unchanged**. Resend doesn't need to be added — it's already the backbone. The work in Phase 2 is:

1. **Fix `trigger-approval-email`** — it currently reads from `profiles` (wrong table, should be `user_profiles`) and uses `period_start`/`period_end` (wrong field names, should be `pay_period_start`/`pay_period_end`). Once fixed, it correctly calls `queue-email` → `send-email` → Resend.

2. **Wire the trigger** — `trigger-approval-email` currently waits to be called by a database webhook that was never set up. The plan calls `supabase.functions.invoke('trigger-approval-email', ...)` directly from `PayrunsService` after each submit/approve/reject action. No webhook needed.

3. **Confirm `RESEND_API_KEY` secret is set** — the `send-email` function checks for it on every call and throws if missing. The `test_resend_direct.cjs` file in the repo confirms the key was tested, but we should verify it's in Supabase function secrets before Phase 2 goes live.

### Nothing new to add
- No new email provider needed
- No new SDK imports needed
- The full Resend path (`queue-email` → `send-email` → Resend) is already working infrastructure

The only thing between the approval actions and emails landing in inboxes is the bug fixes in `trigger-approval-email` and the missing invoke calls in the service layer — both covered in Phase 2.
