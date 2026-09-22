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
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, TEN_YEARS_SECONDS);
  if (signError) throw signError;
  if (!data?.signedUrl) throw new Error("Couldn't create a link for the uploaded photo.");
  return data.signedUrl;
}
