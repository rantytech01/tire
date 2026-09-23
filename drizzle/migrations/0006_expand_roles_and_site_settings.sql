-- Migration 0005: Expand staff roles + add an editable site-settings table
-- New roles added to the app_role enum: salesperson, store, inventory
-- (existing roles: admin (IT Administrator / root), manager, cashier, customer)

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Extend the app_role enum with the new staff roles
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'salesperson';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inventory';
