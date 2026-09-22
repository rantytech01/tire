import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/catalog";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  category_slug: string;
  size: string;
  width: number;
  aspect: number;
  rim: number;
  price: number;
  old_price: number | null;
  cost_price: number | null;
  stock: number;
  reorder_level: number;
  rating: number;
  image: string | null;
  description: string | null;
  is_active: boolean;
};

const FIELDS =
  "id,slug,name,sku,brand,category_slug,size,width,aspect,rim,price,old_price,cost_price,stock,reorder_level,rating,image,description,is_active";

export function mapProduct(r: ProductRow): Product {
  return {
    slug: r.slug,
    name: r.name,
    sku: r.sku,
    brand: r.brand,
    category: r.category_slug,
    size: r.size,
    width: r.width,
    aspect: r.aspect,
    rim: r.rim,
    price: Number(r.price),
    ...(r.old_price ? { oldPrice: Number(r.old_price) } : {}),
    stock: r.stock,
    rating: Number(r.rating),
    image: r.image ?? "",
    description: r.description ?? "",
    specs: [
      { label: "Size", value: r.size },
      { label: "Brand", value: r.brand },
      { label: "SKU", value: r.sku },
      { label: "Warranty", value: "Manufacturer warranty" },
      { label: "Fitting", value: "Free fitting & balancing" },
    ],
  };
}

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(FIELDS)
      .eq("is_active", true)
      .order("sku", { ascending: true });
    if (error) throw error;
    return (data as ProductRow[]).map(mapProduct);
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("slug,name,blurb,sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data.map((c) => ({ slug: c.slug, name: c.name, blurb: c.blurb ?? "" }));
  },
});

export const brandsQuery = queryOptions({
  queryKey: ["brands"],
  queryFn: async () => {
    const { data, error } = await supabase.from("brands").select("name").order("name");
    if (error) throw error;
    return data.map((b) => b.name);
  },
});

/** Staff view: includes inactive products and cost prices. */
export const adminProductsQuery = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select(FIELDS)
      .order("sku", { ascending: true });
    if (error) throw error;
    return data as ProductRow[];
  },
});

export type OrderSummaryRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  channel: string;
};

export const adminOrdersQuery = queryOptions({
  queryKey: ["admin", "orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_number,customer_name,customer_phone,status,payment_status,total,created_at,channel")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
});
