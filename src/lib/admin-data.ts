import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SalesOrderRow = {
  id: string;
  total: number;
  created_at: string;
  status: string;
  payment_status: string;
  channel: string;
};

/** Orders from the last 30 days, used for the sales charts. */
export const adminSalesQuery = queryOptions({
  queryKey: ["admin", "sales"],
  queryFn: async (): Promise<SalesOrderRow[]> => {
    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("orders")
      .select("id,total,created_at,status,payment_status,channel")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as SalesOrderRow[];
  },
});

export type StockMovementRow = {
  id: string;
  change: number;
  reason: string;
  note: string | null;
  created_at: string;
  product_id: string;
  products: { name: string; sku: string } | null;
};

export const stockMovementsQuery = queryOptions({
  queryKey: ["admin", "stock-movements"],
  queryFn: async (): Promise<StockMovementRow[]> => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("id,change,reason,note,created_at,product_id,products(name,sku)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []) as unknown as StockMovementRow[];
  },
});

export type DayPoint = { day: string; label: string; revenue: number; orders: number };

/** Builds a continuous per-day series (oldest → newest) covering `days` days. */
export function buildDailySeries(orders: SalesOrderRow[], days: number): DayPoint[] {
  const buckets = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      day: key,
      label: d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
      revenue: 0,
      orders: 0,
    });
  }
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(o.total);
    bucket.orders += 1;
  }
  return [...buckets.values()];
}

export function sumRevenue(orders: SalesOrderRow[]) {
  return orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total), 0);
}

export function isSameDay(iso: string, ref = new Date()) {
  return new Date(iso).toDateString() === ref.toDateString();
}

const IMAGE_BUCKET = "product-images";
/** Signed URLs are long-lived so they can be stored on the product row. */
const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10;

export async function uploadProductImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
  const uploadOptions = {
    cacheControl: "31536000",
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  };
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, uploadOptions);
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, TEN_YEARS_SECONDS);
  if (signError) throw signError;
  if (!data?.signedUrl) throw new Error("Couldn't create a link for the uploaded photo.");
  return data.signedUrl;
}

// ─── Profit & loss ──────────────────────────────────────────────────────────

export type ProfitLineRow = {
  qty: number;
  unit_price: number;
  unit_cost: number | null;
  line_total: number;
  orders: { created_at: string; status: string } | null;
};

/** Sold order lines from the last 90 days, with each line's cost snapshot — used to compute profit/loss. */
export const adminProfitQuery = queryOptions({
  queryKey: ["admin", "profit-lines"],
  queryFn: async (): Promise<ProfitLineRow[]> => {
    const since = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("order_items")
      .select("qty,unit_price,unit_cost,line_total,orders!inner(created_at,status)")
      .gte("orders.created_at", since.toISOString());
    if (error) throw error;
    return (data ?? []) as unknown as ProfitLineRow[];
  },
});

export type ProfitDayPoint = { day: string; label: string; revenue: number; cost: number; profit: number };

/** Per-day revenue / cost-of-goods / gross-profit series, oldest → newest, cancelled orders excluded. */
export function buildProfitSeries(lines: ProfitLineRow[], days: number): ProfitDayPoint[] {
  const buckets = new Map<string, ProfitDayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { day: key, label: d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" }), revenue: 0, cost: 0, profit: 0 });
  }
  for (const line of lines) {
    if (!line.orders || line.orders.status === "cancelled") continue;
    const key = new Date(line.orders.created_at).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const revenue = Number(line.line_total);
    const cost = Number(line.unit_cost ?? 0) * line.qty;
    bucket.revenue += revenue;
    bucket.cost += cost;
    bucket.profit += revenue - cost;
  }
  return [...buckets.values()];
}

export type ProfitTotals = { revenue: number; cost: number; profit: number; margin: number };

export function sumProfit(lines: ProfitLineRow[]): ProfitTotals {
  let revenue = 0;
  let cost = 0;
  for (const line of lines) {
    if (!line.orders || line.orders.status === "cancelled") continue;
    revenue += Number(line.line_total);
    cost += Number(line.unit_cost ?? 0) * line.qty;
  }
  const profit = revenue - cost;
  return { revenue, cost, profit, margin: revenue > 0 ? (profit / revenue) * 100 : 0 };
}

// ─── Stock taking (physical stock counts) ───────────────────────────────────

export type StockTakeRow = {
  id: string;
  status: "open" | "completed";
  note: string | null;
  started_at: string;
  completed_at: string | null;
};

export const stockTakesQuery = queryOptions({
  queryKey: ["admin", "stock-takes"],
  queryFn: async (): Promise<StockTakeRow[]> => {
    const { data, error } = await supabase
      .from("stock_takes")
      .select("id,status,note,started_at,completed_at")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as StockTakeRow[];
  },
});

export type StockTakeItemRow = {
  id: string;
  product_id: string;
  expected_qty: number;
  counted_qty: number | null;
  note: string | null;
  products: { name: string; sku: string } | null;
};

export async function fetchStockTakeItems(stockTakeId: string): Promise<StockTakeItemRow[]> {
  const { data, error } = await supabase
    .from("stock_take_items")
    .select("id,product_id,expected_qty,counted_qty,note,products(name,sku)")
    .eq("stock_take_id", stockTakeId);
  if (error) throw error;
  return (data ?? []) as unknown as StockTakeItemRow[];
}

export async function startStockTake(note?: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_stock_take", { p_note: note ?? null });
  if (error) throw error;
  return data as string;
}

export async function setCountedQty(itemId: string, counted: number | null) {
  const { error } = await supabase.from("stock_take_items").update({ counted_qty: counted }).eq("id", itemId);
  if (error) throw error;
}

export async function applyStockTake(stockTakeId: string) {
  const { error } = await supabase.rpc("apply_stock_take", { p_stock_take_id: stockTakeId });
  if (error) throw error;
}
