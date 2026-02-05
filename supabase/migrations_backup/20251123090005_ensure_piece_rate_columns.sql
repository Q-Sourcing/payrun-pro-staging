-- Migration: Ensure piece_rate columns exist in pay_groups table
-- This migration ensures that all columns needed for piece_rate pay groups exist
-- It's safe to run even if columns already exist (uses IF NOT EXISTS)

-- ============================================================
-- ADD PIECE_RATE COLUMNS TO PAY_GROUPS TABLE
-- ============================================================

-- Add piece_type column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS piece_type text;

-- Add default_piece_rate column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS default_piece_rate numeric(12,2);

-- Add minimum_pieces column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS minimum_pieces integer;

-- Add maximum_pieces column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS maximum_pieces integer;

-- ============================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN public.pay_groups.piece_type IS 'Unit of measurement for piece rate calculations (crates, boxes, units, etc.)';
COMMENT ON COLUMN public.pay_groups.default_piece_rate IS 'Default rate per piece/unit for piece rate pay groups';
COMMENT ON COLUMN public.pay_groups.minimum_pieces IS 'Minimum pieces required per pay period (optional, for validation)';
COMMENT ON COLUMN public.pay_groups.maximum_pieces IS 'Maximum pieces allowed per pay period (optional, for validation)';

-- ============================================================
-- CREATE INDEXES FOR PERFORMANCE (if they don't exist)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pay_groups_piece_type ON public.pay_groups(piece_type) WHERE piece_type IS NOT NULL;



