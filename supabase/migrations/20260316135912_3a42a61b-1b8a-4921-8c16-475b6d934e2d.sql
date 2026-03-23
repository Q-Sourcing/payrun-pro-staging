-- Ensure APPROVAL_REMINDER exists in email_events before inserting template
INSERT INTO public.email_events (key, description, category)
VALUES ('APPROVAL_REMINDER', 'Payrun approval reminder notification', 'approval')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.email_templates (org_id, event_key, subject_template, body_html_template, is_active)
VALUES (
  NULL,
  'APPROVAL_REMINDER',
  'Reminder: Payrun Approval Pending — {{period}}',
  '<h1>Approval Reminder</h1><p>Hello {{approver_name}},</p><p>A payrun for period <strong>{{period}}</strong> has been awaiting your approval.</p><p>Please review and take action at your earliest convenience.</p><p><a href="{{action_url}}">Review Payrun</a></p>',
  true
) ON CONFLICT (org_id, event_key) DO NOTHING;