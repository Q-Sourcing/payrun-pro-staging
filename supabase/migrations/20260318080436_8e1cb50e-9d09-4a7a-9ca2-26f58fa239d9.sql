-- Temporary: Set Tabshillah Test as fallback_user on ALL workflow steps for demo
UPDATE public.approval_workflow_steps
SET fallback_user_id = '58d7746d-6879-4fc1-8945-6c5b1eec83fb'
WHERE fallback_user_id IS NULL;