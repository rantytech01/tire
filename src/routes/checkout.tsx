import { useState, type FormEvent } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatKES, type Product } from "@/lib/catalog";
import { productsQuery } from "@/lib/shop-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/checkout")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  head: () => ({
    meta: [
      { title: "Checkout — Whitegoose Tires Ltd" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { session, user, loading } = useAuth();
  const { lines, clear } = useCart();
  const { data: products } = useSuspenseQuery(productsQuery);

  const bySlug = new Map<string, Product>(products.map((p) => [p.slug, p]));
  const items = lines
    .map((line) => ({ line, product: bySlug.get(line.slug) }))
    .filter((i): i is { line: (typeof lines)[number]; product: Product } => Boolean(i.product));
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.line.qty, 0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  // Prefill from the signed-in user once we know who they are.
  const prefillName = name || (user?.user_metadata?.["full_name"] as string | undefined) || "";
  const prefillEmail = email || user?.email || "";

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl uppercase">Sign in to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an account or sign in so we can attach this order to you and let you track it.
        </p>
        <Link
          to="/sign-in"
          search={{ redirect: "/checkout" }}
          className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (placedOrderNumber) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <h1 className="mt-4 text-2xl uppercase">Order placed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order <span className="font-bold text-foreground">{placedOrderNumber}</span> has been received.
          Our team will call or WhatsApp you shortly to confirm fitting and payment.
        </p>
        <Link to="/shop" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl uppercase">Your cart is empty</h1>
        <Link to="/shop" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">
          Shop tyres
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prefillName.trim() || !phone.trim()) {
      toast.error("Name and phone number are required.");
      return;
    }
    if (deliveryMethod === "delivery" && !address.trim()) {
      toast.error("Add a delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          customer_name: prefillName.trim(),
          customer_phone: phone.trim(),
          customer_email: prefillEmail.trim() || null,
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === "delivery" ? address.trim() : null,
          channel: "online",
          subtotal,
          total: subtotal,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // The catalog's Product type only carries the slug, not the products.id uuid,
      // so order_items.product_id is left null here — name/sku/price are still recorded.
      const orderItems = items.map((i) => ({
        order_id: order.id,
        name: `${i.product.brand} ${i.product.name}`,
        sku: i.product.sku,
        unit_price: i.product.price,
        qty: i.line.qty,
        line_total: i.product.price * i.line.qty,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      clear();
      setPlacedOrderNumber(order.order_number);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl uppercase">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={prefillName} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="07xx xxx xxx" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" value={prefillEmail} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Delivery method</Label>
            <Select value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as "pickup" | "delivery")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pick up in-store</SelectItem>
                <SelectItem value="delivery">Deliver to me</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deliveryMethod === "delivery" && (
            <div className="space-y-1.5">
              <Label htmlFor="address">Delivery address</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash on {deliveryMethod === "delivery" ? "delivery" : "collection"}</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Vehicle model, preferred fitting time, etc." />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Placing order…" : `Place order — ${formatKES(subtotal)}`}
          </Button>
        </form>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg uppercase">Order summary</h2>
          <div className="mt-4 space-y-3">
            {items.map(({ line, product }) => (
              <div key={line.slug} className="flex justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {line.qty} × {product.brand} {product.name}
                </span>
                <span className="font-semibold">{formatKES(product.price * line.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <span className="font-bold">Total</span>
              <span className="font-bold">{formatKES(subtotal)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
