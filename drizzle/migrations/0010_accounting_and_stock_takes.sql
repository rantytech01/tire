-- Migration 0010: Accounting + stock-taking
--
-- 1. order_items.unit_cost — snapshots each line's cost-of-goods at sale time
--    (from products.cost_price), so Reports can compute real profit/loss even
--    after a product's cost_price changes later.
-- 2. stock_takes / stock_take_items — a formal physical stock-count workflow:
--    snapshot the system's expected quantity, record what was actually
--    counted, and apply the variance as an auditable stock_movements entry
--    (reason 'stock_take') when the count is finalised.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. order_items.unit_cost
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2);

CREATE OR REPLACE FUNCTION public.snapshot_order_item_cost()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.unit_cost IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT cost_price INTO NEW.unit_cost FROM public.products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_snapshot_cost ON public.order_items;
CREATE TRIGGER order_items_snapshot_cost
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_item_cost();

-- Best-effort backfill for lines already placed before this migration, using
-- each product's current cost_price (historical cost at the time of those
-- earlier sales isn't recoverable, so this is an approximation).
UPDATE public.order_items oi
SET unit_cost = p.cost_price
FROM public.products p
WHERE oi.product_id = p.id AND oi.unit_cost IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. stock_takes / stock_take_items
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_takes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  note         text,
  started_by   uuid,
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_by uuid,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.stock_take_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id uuid NOT NULL REFERENCES public.stock_takes(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expected_qty  int NOT NULL,
  counted_qty   int,
  note          text,
  UNIQUE (stock_take_id, product_id)
);

GRANT SELECT, INSERT, UPDATE ON public.stock_takes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stock_take_items TO authenticated;
GRANT ALL ON public.stock_takes TO service_role;
GRANT ALL ON public.stock_take_items TO service_role;

ALTER TABLE public.stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_take_items ENABLE ROW LEVEL SECURITY;

-- Same staff set that can adjust stock (admin/manager/cashier/store/inventory)
DROP POLICY IF EXISTS "stock_staff_read_takes" ON public.stock_takes;
CREATE POLICY "stock_staff_read_takes" ON public.stock_takes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','cashier','store','inventory')));

DROP POLICY IF EXISTS "stock_staff_write_takes" ON public.stock_takes;
CREATE POLICY "stock_staff_write_takes" ON public.stock_takes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','cashier','store','inventory')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','cashier','store','inventory')));

DROP POLICY IF EXISTS "stock_staff_read_take_items" ON public.stock_take_items;
CREATE POLICY "stock_staff_read_take_items" ON public.stock_take_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','cashier','store','inventory')));

DROP POLICY IF EXISTS "stock_staff_write_take_items" ON public.stock_take_items;
CREATE POLICY "stock_staff_write_take_items" ON public.stock_take_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','cashier','store','inventory')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','cashier','store','inventory')));

-- Starts a new count: snapshots every active product's current stock as the
-- "expected" quantity for this session.
CREATE OR REPLACE FUNCTION public.start_stock_take(p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','manager','cashier','store','inventory')
  ) THEN
    RAISE EXCEPTION 'permission denied: staff only';
  END IF;

  INSERT INTO public.stock_takes (note, started_by) VALUES (p_note, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.stock_take_items (stock_take_id, product_id, expected_qty)
  SELECT v_id, id, stock FROM public.products WHERE is_active;

  RETURN v_id;
END;
$$;

-- Finalises a count: for every line where a count was entered and differs
-- from the expected quantity, applies the variance to the product's stock
-- and logs it as an auditable stock_movements entry (reason 'stock_take').
CREATE OR REPLACE FUNCTION public.apply_stock_take(p_stock_take_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','manager','cashier','store','inventory')
  ) THEN
    RAISE EXCEPTION 'permission denied: staff only';
  END IF;

  FOR r IN
    SELECT * FROM public.stock_take_items
    WHERE stock_take_id = p_stock_take_id AND counted_qty IS NOT NULL AND counted_qty <> expected_qty
  LOOP
    UPDATE public.products SET stock = r.counted_qty WHERE id = r.product_id;
    INSERT INTO public.stock_movements (product_id, change, reason, note, created_by)
    VALUES (r.product_id, r.counted_qty - r.expected_qty, 'stock_take',
            'Stock take variance' || COALESCE(': ' || r.note, ''), auth.uid());
  END LOOP;

  UPDATE public.stock_takes
  SET status = 'completed', completed_by = auth.uid(), completed_at = now()
  WHERE id = p_stock_take_id;
END;
$$;
