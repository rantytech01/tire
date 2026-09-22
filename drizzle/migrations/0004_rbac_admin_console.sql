-- Migration 0004: RBAC hardening for the admin console
-- Roles: admin (IT Administrator / root), manager (Executive / Manager), cashier

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Ensure the user_roles table exists with role check constraint
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin','manager','cashier','customer')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Row Level Security
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read their own roles (needed by the auth hook)
CREATE POLICY IF NOT EXISTS "users_read_own_roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Only IT Administrators (role = 'admin') can insert / update / delete
CREATE POLICY IF NOT EXISTS "admins_manage_all_roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. stock_movements — cashier can INSERT; admin/manager can do everything
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "staff_insert_stock_movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','cashier')
    )
  );

CREATE POLICY IF NOT EXISTS "staff_read_stock_movements"
  ON public.stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','cashier')
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. products — admin/manager can mutate; cashier (and anon) can only SELECT
-- ──────────────────────────────────────────────────────────────────────────────
-- (public SELECT already handled by existing policies; add staff mutation policy)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'managers_mutate_products'
  ) THEN
    CREATE POLICY "managers_mutate_products"
      ON public.products FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin','manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin','manager')
        )
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. orders — admin/manager can mutate
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'managers_mutate_orders'
  ) THEN
    CREATE POLICY "managers_mutate_orders"
      ON public.orders FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin','manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin','manager')
        )
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Helper function: safely adjust stock (callable by cashier role)
--    Wraps the stock update + movement insert in a single atomic operation.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id uuid,
  p_change      integer,
  p_reason      text DEFAULT 'adjustment',
  p_note        text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current integer;
  v_new     integer;
BEGIN
  -- Only staff may call this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','manager','cashier')
  ) THEN
    RAISE EXCEPTION 'permission denied: staff only';
  END IF;

  SELECT stock INTO v_current FROM public.products WHERE id = p_product_id FOR UPDATE;
  v_new := GREATEST(0, v_current + p_change);

  UPDATE public.products SET stock = v_new WHERE id = p_product_id;

  INSERT INTO public.stock_movements (product_id, change, reason, note, created_by)
  VALUES (p_product_id, p_change, p_reason, p_note, auth.uid());
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Helper function: set a staff role (IT Administrator only)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_staff_role(
  p_target_user_id uuid,
  p_role           text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only IT Administrators may grant/change roles
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'permission denied: IT Administrator only';
  END IF;

  IF p_role NOT IN ('admin','manager','cashier') THEN
    RAISE EXCEPTION 'invalid role: %', p_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. Helper function: list all staff (IT Administrator only)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_staff()
RETURNS TABLE (user_id uuid, role text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'permission denied: IT Administrator only';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, ur.role, ur.created_at
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','manager','cashier')
  ORDER BY ur.created_at;
END;
$$;
