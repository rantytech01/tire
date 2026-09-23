-- Migration 0006: Wire up the new roles (salesperson, store, inventory) added in
-- migration 0005, and add an editable `site_settings` table for contact info.
--
-- Role responsibilities:
--   admin        — IT Administrator (root): everything, incl. managing staff/roles
--   manager      — catalog, stock, orders, reports
--   cashier      — stock adjustments only (till/point-of-sale stock corrections)
--   salesperson  — orders only (taking orders, updating order/payment status)
--   store        — stock adjustments only (warehouse receiving/issuing, same as cashier)
--   inventory    — catalog + stock (product records, stock levels, reorder mgmt)

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. is_staff() — every staff role (not just admin/manager/cashier) counts as staff
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','manager','cashier','salesperson','store','inventory')
  )
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. stock_movements — cashier/store/inventory can insert & read; admin/manager too
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_insert_stock_movements" ON public.stock_movements;
CREATE POLICY "staff_insert_stock_movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','cashier','store','inventory')
    )
  );

DROP POLICY IF EXISTS "staff_read_stock_movements" ON public.stock_movements;
CREATE POLICY "staff_read_stock_movements"
  ON public.stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','cashier','store','inventory')
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. products — admin/manager/inventory can mutate
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "managers_mutate_products" ON public.products;
CREATE POLICY "managers_mutate_products"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','inventory')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','inventory')
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. orders — admin/manager/salesperson can mutate
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "managers_mutate_orders" ON public.orders;
CREATE POLICY "managers_mutate_orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','salesperson')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','manager','salesperson')
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. adjust_stock() — callable by cashier/store/inventory (and admin/manager)
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
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','manager','cashier','store','inventory')
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
-- 6. set_staff_role() — IT Administrator only; now accepts the new roles
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
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'permission denied: IT Administrator only';
  END IF;

  IF p_role NOT IN ('admin','manager','cashier','salesperson','store','inventory') THEN
    RAISE EXCEPTION 'invalid role: %', p_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. list_staff() — IT Administrator only; now lists the new roles too
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
  SELECT ur.user_id, ur.role::text, ur.created_at
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','manager','cashier','salesperson','store','inventory')
  ORDER BY ur.created_at;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. site_settings — single-row table of public contact info.
--    Anyone (incl. anonymous shoppers) can read it so the storefront header,
--    footer and WhatsApp links stay in sync; only the IT Administrator can edit it.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  id          integer PRIMARY KEY DEFAULT 1,
  phone       text NOT NULL DEFAULT '+254 700 000 000',
  whatsapp    text NOT NULL DEFAULT '254700000000',
  email       text NOT NULL DEFAULT 'sales@whitegoosetires.co.ke',
  address     text NOT NULL DEFAULT 'Nairobi, Kenya',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

INSERT INTO public.site_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_reads_site_settings" ON public.site_settings;
CREATE POLICY "anyone_reads_site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admin_updates_site_settings" ON public.site_settings;
CREATE POLICY "admin_updates_site_settings"
  ON public.site_settings FOR UPDATE
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

-- Auto-stamp who last changed it
CREATE OR REPLACE FUNCTION public.stamp_site_settings_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_site_settings_update ON public.site_settings;
CREATE TRIGGER on_site_settings_update
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.stamp_site_settings_update();
