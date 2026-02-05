-- Migration: Add 'rejected' to pay_run_status enum
-- Timestamp: 20251230100000
-- Description: Adds 'rejected' status to support payrun rejection and resubmission workflows.

ALTER TYPE public.pay_run_status ADD VALUE IF NOT EXISTS 'rejected';
