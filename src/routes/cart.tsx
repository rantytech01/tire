import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { SHOP_WHATSAPP } from "@/components/site-chrome";
import { useCart } from "@/lib/cart";
import { formatKES, type Product } from "@/lib/catalog";
import { productsQuery } from "@/lib/shop-data";

export const Route = createFileRoute("/cart")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  head: () => ({
    meta: [
      { title: "Your Cart — Whitegoose Tires Ltd" },
      { name: "description", content: "Review your selected tyres, wheels and batteries before checkout." },
      { property: "og:title", content: "Your Cart — Whitegoose Tires Ltd" },
      { property: "og:description", content: "Review your tyre order and request fitting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const { data: products } = useSuspenseQuery(productsQuery);
  const bySlug = new Map<string, Product>(products.map((p) => [p.slug, p]));

  const items = lines
    .map((line) => ({ line, product: bySlug.get(line.slug) }))
    .filter((i): i is { line: (typeof lines)[number]; product: Product } => Boolean(i.product));

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.line.qty, 0);

  const quoteText = encodeURIComponent(
    `Hello Whitegoose Tires, I'd like to order:\n${items
      .map((i) => `${i.line.qty} x ${i.product.brand} ${i.product.name} ${i.product.size}`)
      .join("\n")}\nTotal: ${formatKES(subtotal)}`,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl uppercase">Your cart</h1>

      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-10 text-center">
          <p className="font-bold">Your cart is empty.</p>
          <Link to="/shop" className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">
            Shop tyres
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map(({ line, product }) => (
              <div key={line.slug} className="flex gap-4 p-4">
                <img src={product.image} alt={product.name} width={120} height={90} loading="lazy" className="size-24 rounded-md object-cover" />
                <div className="flex-1">
                  <p className="text-hairline text-muted-foreground">{product.brand}</p>
                  <p className="font-bold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.size} · {formatKES(product.price)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-border">
                      <button onClick={() => setQty(line.slug, line.qty - 1)} className="px-2.5 py-1">−</button>
                      <span className="w-8 text-center text-sm font-bold">{line.qty}</span>
                      <button onClick={() => setQty(line.slug, Math.min(product.stock || 1, line.qty + 1))} className="px-2.5 py-1">+</button>
                    </div>
                    <button onClick={() => remove(line.slug)} className="text-muted-foreground hover:text-destructive" aria-label="Remove item">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="font-bold">{formatKES(product.price * line.qty)}</p>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg uppercase">Order summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatKES(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fitting</span><span className="font-semibold text-primary">Free</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-bold">Total</span><span className="font-bold">{formatKES(subtotal)}</span></div>
            </div>
            <Link
              to="/checkout"
              className="mt-5 block rounded-md bg-primary py-3 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground"
            >
              Checkout
            </Link>
            <a
              href={`https://wa.me/${SHOP_WHATSAPP}?text=${quoteText}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-md border border-border py-3 text-center text-sm font-bold uppercase tracking-wide hover:border-primary hover:text-primary"
            >
              Order on WhatsApp
            </a>
            <button onClick={clear} className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive">Clear cart</button>
          </aside>
        </div>
      )}
    </div>
  );
}
