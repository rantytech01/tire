import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ImagePlus,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, ASSIGNABLE_STAFF_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth";
import { formatKES } from "@/lib/catalog";
import { DEFAULT_SITE_SETTINGS, siteSettingsQuery, updateSiteSettings } from "@/lib/site-settings";
import {
  adminSalesQuery,
  stockMovementsQuery,
  buildDailySeries,
  sumRevenue,
  isSameDay,
  uploadProductImage,
  type SalesOrderRow,
} from "@/lib/admin-data";
import {
  adminOrdersQuery,
  adminProductsQuery,
  categoriesQuery,
  type OrderSummaryRow,
  type ProductRow,
} from "@/lib/shop-data";
import { AdminShell, StatCard, statusTone, type AdminTab } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Staff console — Whitegoose Tires Ltd" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type AdminProduct = ProductRow;
type AdminOrder = OrderSummaryRow;

const ORDER_STATUSES = ["pending", "confirmed", "fitting", "ready", "completed", "cancelled"] as const;
const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"] as const;
const STOCK_REASONS = ["received", "sold", "adjustment", "damaged", "return"] as const;
const APP_ROLES = ASSIGNABLE_STAFF_ROLES;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ─── Root page ────────────────────────────────────────────────────────────────

function AdminPage() {
  const { permissions } = useAuth();
  const defaultTab: AdminTab = "dashboard";
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);

  return (
    <AdminShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "dashboard" && <AdminDashboard />}
      {activeTab === "products" && permissions.manageCatalog && <AdminProducts />}
      {activeTab === "orders" && permissions.manageOrders && <AdminOrders />}
      {activeTab === "stock" && permissions.manageStock && <AdminStock />}
      {activeTab === "reports" && permissions.viewReports && <AdminReports />}
      {activeTab === "users" && permissions.manageUsers && <AdminUsers />}
      {activeTab === "settings" && permissions.manageUsers && <AdminSettings />}
    </AdminShell>
  );
}

// ─── Dashboard / Overview ─────────────────────────────────────────────────────

function AdminDashboard() {
  const { data: products, isLoading: lp } = useQuery(adminProductsQuery);
  const { data: orders, isLoading: lo } = useQuery(adminOrdersQuery);
  const { data: sales } = useQuery(adminSalesQuery);

  const series7 = useMemo(() => buildDailySeries(sales ?? [], 7), [sales]);

  if (lp || lo) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const today = new Date();
  const lowStock = (products ?? []).filter((p) => p.stock <= p.reorder_level);
  const pendingOrders = (orders ?? []).filter((o) => o.status === "pending");
  const todayOrders = (orders ?? []).filter((o) => isSameDay(o.created_at, today));
  const revenueToday = todayOrders.reduce((s, o) => s + Number(o.total), 0);
  const revenueThisWeek = sumRevenue(
    (sales ?? []).filter((o) => {
      const d = new Date(o.created_at);
      const wAgo = new Date(today);
      wAgo.setDate(today.getDate() - 7);
      return d >= wAgo;
    })
  );

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={formatKES(revenueToday)}
          hint={`${todayOrders.length} order${todayOrders.length !== 1 ? "s" : ""}`}
          icon={<DollarSign className="size-5" />}
          tone="success"
        />
        <StatCard
          label="Revenue this week"
          value={formatKES(revenueThisWeek)}
          hint="Non-cancelled orders"
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          label="Pending orders"
          value={pendingOrders.length}
          hint="Awaiting confirmation"
          icon={<ClipboardList className="size-5" />}
          tone={pendingOrders.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Low stock items"
          value={lowStock.length}
          hint="At or below reorder level"
          icon={<AlertTriangle className="size-5" />}
          tone={lowStock.length > 0 ? "warning" : "default"}
        />
      </div>

      {/* Mini chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Daily revenue — last 7 days</h2>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series7} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatKES(v)} />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="text-base font-bold uppercase">Recent orders</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders ?? []).slice(0, 10).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell>{o.customer_name}</TableCell>
                  <TableCell><Badge variant={statusTone(o.status)}>{o.status}</Badge></TableCell>
                  <TableCell><Badge variant={statusTone(o.payment_status)}>{o.payment_status}</Badge></TableCell>
                  <TableCell className="text-right">{formatKES(Number(o.total))}</TableCell>
                </TableRow>
              ))}
              {(orders ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No orders yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Low-stock alert list */}
      {lowStock.length > 0 && (
        <div>
          <h2 className="text-base font-bold uppercase text-destructive">Low stock alerts</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-destructive/20 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{p.stock}</TableCell>
                    <TableCell className="text-right">{p.reorder_level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────

type ProductFormState = {
  id?: string;
  name: string; slug: string; sku: string; brand: string;
  category_slug: string; size: string; width: string; aspect: string; rim: string;
  price: string; old_price: string; cost_price: string;
  stock: string; reorder_level: string;
  image: string; description: string; is_active: boolean;
};

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "", slug: "", sku: "", brand: "", category_slug: "", size: "",
  width: "", aspect: "", rim: "", price: "", old_price: "", cost_price: "",
  stock: "0", reorder_level: "4", image: "", description: "", is_active: true,
};

function productToForm(p: AdminProduct): ProductFormState {
  return {
    id: p.id, name: p.name, slug: p.slug, sku: p.sku, brand: p.brand,
    category_slug: p.category_slug, size: p.size,
    width: String(p.width), aspect: String(p.aspect), rim: String(p.rim),
    price: String(p.price), old_price: p.old_price != null ? String(p.old_price) : "",
    cost_price: p.cost_price != null ? String(p.cost_price) : "",
    stock: String(p.stock), reorder_level: String(p.reorder_level),
    image: p.image ?? "", description: p.description ?? "", is_active: p.is_active,
  };
}

function AdminProducts() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery(adminProductsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }, [qc]);

  const openCreate = () => { setForm(EMPTY_PRODUCT_FORM); setOpen(true); };
  const openEdit = (p: AdminProduct) => { setForm(productToForm(p)); setOpen(true); };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image: url }));
      toast.success("Photo uploaded — save the product to apply it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim() || !form.category_slug) {
      toast.error("Name, SKU and category are required.");
      return;
    }
    const slug = form.slug.trim() || slugify(form.name);
    const payload = {
      name: form.name.trim(), slug, sku: form.sku.trim(), brand: form.brand.trim(),
      category_slug: form.category_slug, size: form.size.trim(),
      width: Number(form.width) || 0, aspect: Number(form.aspect) || 0, rim: Number(form.rim) || 0,
      price: Number(form.price) || 0,
      old_price: form.old_price ? Number(form.old_price) : null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      stock: Number(form.stock) || 0, reorder_level: Number(form.reorder_level) || 0,
      image: form.image.trim() || null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Product updated.");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Product created.");
      }
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save product.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: AdminProduct) => {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products?.length ?? 0} products</p>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" /> Add product</Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {(products ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="size-10 rounded-md object-cover" />
                  ) : (
                    <div className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
                      <ImagePlus className="size-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.brand}</TableCell>
                <TableCell>{p.size}</TableCell>
                <TableCell className="text-right">{formatKES(Number(p.price))}</TableCell>
                <TableCell className="text-right">
                  <span className={p.stock <= p.reorder_level ? "font-bold text-destructive" : ""}>{p.stock}</span>
                </TableCell>
                <TableCell><Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} /></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit">
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (products ?? []).length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No products yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Product dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo upload */}
            <div className="space-y-2">
              <Label>Tyre photo</Label>
              <div className="flex items-center gap-4">
                {form.image ? (
                  <img src={form.image} alt="Tyre preview" className="size-20 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="grid size-20 place-items-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                    <ImagePlus className="size-6" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="gap-1.5"
                  >
                    <Upload className="size-3.5" />
                    {uploading ? "Uploading…" : "Upload photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Or paste a URL below</p>
                </div>
              </div>
              <Input
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://… (paste URL or use upload above)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Name *</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-slug">Slug (auto from name)</Label>
                <Input id="p-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">SKU *</Label>
                <Input id="p-sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-brand">Brand *</Label>
                <Input id="p-brand" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category_slug} onValueChange={(v) => setForm((f) => ({ ...f, category_slug: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-size">Size label</Label>
                <Input id="p-size" value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="215/65R16" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-width">Width (mm)</Label>
                <Input id="p-width" type="number" value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-aspect">Aspect ratio</Label>
                <Input id="p-aspect" type="number" value={form.aspect} onChange={(e) => setForm((f) => ({ ...f, aspect: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-rim">Rim (inches)</Label>
                <Input id="p-rim" type="number" value={form.rim} onChange={(e) => setForm((f) => ({ ...f, rim: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Price (KSh) *</Label>
                <Input id="p-price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-old-price">Old / RRP price</Label>
                <Input id="p-old-price" type="number" value={form.old_price} onChange={(e) => setForm((f) => ({ ...f, old_price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-cost">Cost price</Label>
                <Input id="p-cost" type="number" value={form.cost_price} onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Initial stock</Label>
                <Input id="p-stock" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} disabled={Boolean(form.id)} />
                {form.id && <p className="text-xs text-muted-foreground">Use the Stock tab to adjust existing stock.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-reorder">Reorder level</Label>
                <Input id="p-reorder" type="number" value={form.reorder_level} onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Active (visible in public shop)</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save product"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────────

type OrderItemRow = { id: string; name: string; sku: string | null; qty: number; unit_price: number; line_total: number };

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery(adminOrdersQuery);
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [status, setStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    const list = orders ?? [];
    if (filterStatus === "all") return list;
    return list.filter((o) => o.status === filterStatus);
  }, [orders, filterStatus]);

  const openOrder = async (order: AdminOrder) => {
    setActiveOrder(order);
    setStatus(order.status);
    setPaymentStatus(order.payment_status);
    setItemsLoading(true);
    const { data, error } = await supabase
      .from("order_items")
      .select("id,name,sku,qty,unit_price,line_total")
      .eq("order_id", order.id);
    if (error) toast.error(error.message);
    else setItems(data as OrderItemRow[]);
    setItemsLoading(false);
  };

  const saveStatus = async () => {
    if (!activeOrder) return;
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ status, payment_status: paymentStatus })
      .eq("id", activeOrder.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Order updated.");
    setActiveOrder(null);
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} orders</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                <TableCell>{o.customer_name}</TableCell>
                <TableCell>{o.customer_phone}</TableCell>
                <TableCell><Badge variant={statusTone(o.status)}>{o.status}</Badge></TableCell>
                <TableCell><Badge variant={statusTone(o.payment_status)}>{o.payment_status}</Badge></TableCell>
                <TableCell className="text-right">{formatKES(Number(o.total))}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-KE")}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => openOrder(o)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No orders.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(activeOrder)} onOpenChange={(v) => !v && setActiveOrder(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          {activeOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Order {activeOrder.order_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">{activeOrder.customer_name}</p>
                  <p className="text-muted-foreground">{activeOrder.customer_phone}</p>
                </div>
                <div className="rounded-md border border-border">
                  {itemsLoading && <p className="p-3 text-muted-foreground">Loading items…</p>}
                  {!itemsLoading && items.map((i) => (
                    <div key={i.id} className="flex justify-between border-b border-border p-2.5 last:border-0">
                      <span>{i.qty} × {i.name}</span>
                      <span className="font-semibold">{formatKES(i.line_total)}</span>
                    </div>
                  ))}
                  {!itemsLoading && items.length === 0 && <p className="p-3 text-muted-foreground">No items.</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Order status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment status</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveOrder(null)}>Close</Button>
                <Button onClick={saveStatus} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stock ────────────────────────────────────────────────────────────────────

function AdminStock() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: products, isLoading } = useQuery(adminProductsQuery);
  const { data: movements, isLoading: movLoading } = useQuery(stockMovementsQuery);
  const [target, setTarget] = useState<AdminProduct | null>(null);
  const [change, setChange] = useState("0");
  const [reason, setReason] = useState<string>("received");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const lowStock = useMemo(() => (products ?? []).filter((p) => p.stock <= p.reorder_level), [products]);

  const openAdjust = (p: AdminProduct) => {
    setTarget(p);
    setChange("0");
    setReason("received");
    setNote("");
  };

  const submitAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const delta = Number(change);
    if (!delta) { toast.error("Enter a non-zero change."); return; }
    setSaving(true);
    try {
      const { error: moveError } = await supabase.from("stock_movements").insert({
        product_id: target.id,
        change: delta,
        reason,
        note: note.trim() || null,
        created_by: user?.id ?? null,
      });
      if (moveError) throw moveError;
      const newStock = Math.max(0, target.stock + delta);
      const { error: updErr } = await supabase.from("products").update({ stock: newStock }).eq("id", target.id);
      if (updErr) throw updErr;
      toast.success(`Stock updated to ${newStock}.`);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin", "stock-movements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="size-4" /> {lowStock.length} product(s) at or below reorder level
          </p>
        </div>
      )}

      {/* Current levels */}
      <div>
        <h2 className="mb-3 text-base font-bold uppercase">Current stock levels</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Reorder at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {(products ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.stock}</TableCell>
                  <TableCell className="text-right">{p.reorder_level}</TableCell>
                  <TableCell>
                    {p.stock <= p.reorder_level
                      ? <Badge variant="destructive">Low</Badge>
                      : <Badge variant="secondary">OK</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openAdjust(p)}>Adjust</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Movement ledger */}
      <div>
        <h2 className="mb-3 text-base font-bold uppercase">Recent movements</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {(movements ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("en-KE")}
                  </TableCell>
                  <TableCell>{m.products?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{m.products?.sku ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{m.reason}</Badge></TableCell>
                  <TableCell className="text-right">
                    <span className={`flex items-center justify-end gap-1 font-semibold ${m.change > 0 ? "text-primary" : "text-destructive"}`}>
                      {m.change > 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                      {m.change > 0 ? "+" : ""}{m.change}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{m.note ?? ""}</TableCell>
                </TableRow>
              ))}
              {!movLoading && (movements ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No movements yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={Boolean(target)} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="max-w-md">
          {target && (
            <>
              <DialogHeader><DialogTitle>Adjust stock — {target.name}</DialogTitle></DialogHeader>
              <form onSubmit={submitAdjustment} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Current stock: <span className="font-semibold text-foreground">{target.stock}</span>
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="s-change">Change (negative removes stock)</Label>
                  <Input id="s-change" type="number" value={change} onChange={(e) => setChange(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOCK_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-note">Note (optional)</Label>
                  <Textarea id="s-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save adjustment"}</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function AdminReports() {
  const { data: sales, isLoading } = useQuery(adminSalesQuery);
  const { data: products } = useQuery(adminProductsQuery);
  const [period, setPeriod] = useState<"7" | "14" | "30">("30");

  const days = Number(period);
  const series = useMemo(() => buildDailySeries(sales ?? [], days), [sales, days]);

  const totalRevenue = useMemo(() => sumRevenue(sales ?? []), [sales]);
  const totalOrders = (sales ?? []).filter((o) => o.status !== "cancelled").length;
  const cancelled = (sales ?? []).filter((o) => o.status === "cancelled").length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Revenue by payment status breakdown
  const paidRevenue = useMemo(
    () => (sales ?? []).filter((o) => o.payment_status === "paid" && o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0),
    [sales]
  );
  const unpaidRevenue = totalRevenue - paidRevenue;

  // Stock value
  const totalStockValue = useMemo(
    () => (products ?? []).reduce((s, p) => s + Number(p.cost_price ?? p.price) * p.stock, 0),
    [products]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold uppercase">Sales reports — last {period} days</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "14" | "30")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatKES(totalRevenue)} icon={<DollarSign className="size-5" />} tone="success" />
        <StatCard label="Orders completed" value={totalOrders} icon={<CheckCircle2 className="size-5" />} />
        <StatCard label="Avg order value" value={formatKES(avgOrderValue)} icon={<TrendingUp className="size-5" />} />
        <StatCard label="Cancelled" value={cancelled} icon={<XCircle className="size-5" />} tone={cancelled > 0 ? "warning" : "default"} />
      </div>

      {/* Revenue trend chart */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading chart…</p>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Daily revenue & orders</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => name === "Revenue" ? formatKES(v) : v} />
                <Legend />
                <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="ord" type="monotone" dataKey="orders" name="Orders" stroke="#94a3b8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payment breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment collection</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Collected (paid)</span>
              <span className="font-bold text-primary">{formatKES(paidRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Outstanding</span>
              <span className="font-bold text-destructive">{formatKES(unpaidRevenue)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="text-sm font-semibold">Total revenue</span>
              <span className="font-bold">{formatKES(totalRevenue)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Inventory value</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Total stock value (cost)</span>
              <span className="font-bold">{formatKES(totalStockValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total SKUs</span>
              <span className="font-bold">{products?.length ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Low-stock items</span>
              <span className="font-bold text-destructive">
                {(products ?? []).filter((p) => p.stock <= p.reorder_level).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Users (IT Admin / root only) ────────────────────────────────────────────

type StaffRow = {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
};

function AdminUsers() {
  const { user: me } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("cashier");
  const [inviting, setInviting] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    // Fetch from user_roles joined with auth.users via RPC if available,
    // otherwise fall back to user_roles table with user_id visible.
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .in("role", APP_ROLES)
      .order("created_at", { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    // Map to display rows (email not available without admin API, show user_id)
    setStaff((data ?? []).map((r) => ({
      user_id: r.user_id,
      email: r.user_id, // will be replaced when available
      role: r.role,
      created_at: r.created_at,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void loadStaff(); }, [loadStaff]);

  const changeRole = async (userId: string, newRole: AppRole) => {
    setSaving(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as AppRole })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Role updated.");
      await loadStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update role.");
    } finally {
      setSaving(null);
    }
  };

  const revokeAccess = async (userId: string) => {
    if (!confirm("Revoke this user's staff access?")) return;
    setSaving(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .in("role", APP_ROLES);
      if (error) throw error;
      toast.success("Access revoked.");
      await loadStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't revoke access.");
    } finally {
      setSaving(null);
    }
  };

  const grantAccess = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) { toast.error("Enter an email."); return; }
    setInviting(true);
    try {
      // Look up user by email via Supabase admin (fallback: insert by known user_id)
      // This requires the user to have already signed up.
      // We attempt the insert and let RLS/DB validate.
      const { data: authData, error: authErr } = await supabase.auth.admin?.listUsers?.() ?? { data: null, error: null };
      if (authErr) {
        toast.error("Admin API unavailable — ask user to sign up then grant role via Supabase dashboard.");
        setInviting(false);
        return;
      }
      // If admin API not available, show a guide
      toast.info(
        `To grant access: in Supabase > Table Editor > user_roles, insert a row with the user's ID and role '${inviteRole}'.`,
        { duration: 8000 }
      );
      setInviteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setInviting(false);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role as AppRole) {
      case "admin": return "bg-primary/10 text-primary border-primary/20";
      case "manager": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "salesperson": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "store": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "inventory": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ShieldCheck className="size-4" /> IT Administrator access — you have root control over staff roles.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Changes take effect immediately. The user must sign out and back in to see their new permissions.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold uppercase">Staff directory</h2>
        <Button onClick={() => setInviteOpen(true)} className="gap-1.5" size="sm">
          <Plus className="size-4" /> Add staff
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Granted</TableHead>
              <TableHead>Change role</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {staff.map((s) => (
              <TableRow key={s.user_id}>
                <TableCell className="font-mono text-xs max-w-[160px] truncate" title={s.user_id}>
                  {s.user_id.slice(0, 8)}…
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeColor(s.role)}`}>
                    {ROLE_LABELS[s.role as AppRole] ?? s.role}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("en-KE")}
                </TableCell>
                <TableCell>
                  {s.user_id !== me?.id ? (
                    <Select
                      value={s.role}
                      onValueChange={(v) => changeRole(s.user_id, v as AppRole)}
                      disabled={saving === s.user_id}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {APP_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.user_id !== me?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revokeAccess(s.user_id)}
                      disabled={saving === s.user_id}
                    >
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && staff.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No staff yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role permission matrix */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide">Permission matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left font-semibold text-muted-foreground">Permission</th>
                <th className="pb-2 text-center font-semibold text-primary">IT Admin</th>
                <th className="pb-2 text-center font-semibold text-blue-600">Manager</th>
                <th className="pb-2 text-center font-semibold text-emerald-600">Salesperson</th>
                <th className="pb-2 text-center font-semibold text-amber-600">Store</th>
                <th className="pb-2 text-center font-semibold text-purple-600">Inventory</th>
                <th className="pb-2 text-center font-semibold text-muted-foreground">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(
                [
                  ["Manage staff & roles / edit contact info", true, false, false, false, false, false],
                  ["Create / edit products", true, true, false, false, true, false],
                  ["Upload tyre photos", true, true, false, false, true, false],
                  ["Update order status", true, true, true, false, false, false],
                  ["Adjust stock levels", true, true, false, true, true, true],
                  ["View sales reports", true, true, false, false, false, false],
                ] as [string, boolean, boolean, boolean, boolean, boolean, boolean][]
              ).map(([label, admin, manager, salesperson, store, inventory, cashier]) => (
                <tr key={label}>
                  <td className="py-2.5 font-medium">{label}</td>
                  {[admin, manager, salesperson, store, inventory, cashier].map((v, i) => (
                    <td key={i} className="py-2.5 text-center">
                      {v
                        ? <CheckCircle2 className="inline size-4 text-primary" />
                        : <XCircle className="inline size-4 text-muted-foreground/40" />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add staff dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
          </DialogHeader>
          <form onSubmit={grantAccess} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The staff member must have already created an account on the sign-in page.
              Once you know their email, find their User ID in Supabase → Authentication → Users,
              then insert a row in <code className="rounded bg-muted px-1 py-0.5 text-xs">user_roles</code> with their
              UUID and the desired role.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Staff email</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="staff@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                      {r === "admin" ? " (root)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting}>{inviting ? "Processing…" : "Show instructions"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Settings (contact info) — IT Administrator only ──────────────────────────

function AdminSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(siteSettingsQuery);
  const [form, setForm] = useState(DEFAULT_SITE_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  if (data && !hydrated) {
    setForm(data);
    setHydrated(true);
  }

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSiteSettings(form);
      await queryClient.invalidateQueries({ queryKey: siteSettingsQuery.queryKey });
      toast.success("Contact information updated — the site will reflect this immediately.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Settings className="size-4" /> Site contact information
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown in the top bar, footer, WhatsApp button and contact page across the whole site. Only the IT
          Administrator can change this.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="set-phone">Phone number (shown as-is, e.g. in top bar)</Label>
            <Input
              id="set-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+254 700 000 000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-whatsapp">WhatsApp number (digits only, with country code — no + or spaces)</Label>
            <Input
              id="set-whatsapp"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value.replace(/[^0-9]/g, "") }))}
              placeholder="254700000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-email">Email address</Label>
            <Input
              id="set-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="sales@whitegoosetires.co.ke"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-address">Address</Label>
            <Textarea
              id="set-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Nairobi, Kenya"
              rows={2}
            />
          </div>
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}
    </div>
  );
}
