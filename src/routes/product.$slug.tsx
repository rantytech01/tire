import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, Star } from "lucide-react";
import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/lib/cart";
import { formatKES } from "@/lib/catalog";
import { productsQuery } from "@/lib/shop-data";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const products = await context.queryClient.ensureQueryData(productsQuery);
    const product = products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product unavailable — Whitegoose Tires Ltd" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { product } = loaderData;
    const title = `${product.brand} ${product.name} ${product.size} — Whitegoose Tires Ltd`;
    return {
      meta: [
        { title },
        { name: "description", content: product.description },
        { property: "og:title", content: title },
        { property: "og:description", content: product.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(product.image.startsWith("https://")
          ? [
              { property: "og:image", content: product.image },
              { name: "twitter:image", content: product.image },
            ]
          : []),
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { data: products } = useSuspenseQuery(productsQuery);
  const { add } = useCart();
  const { whatsapp: SHOP_WHATSAPP } = useSiteSettings();
  const [qty, setQty] = useState(1);
  const related = products
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> ·{" "}
        <Link to="/shop" className="hover:text-primary">Shop</Link> · <span>{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <img src={product.image} alt={product.name} width={800} height={600} className="aspect-4/3 w-full object-cover" />
        </div>

        <div>
          <p className="text-hairline text-primary">{product.brand}</p>
          <h1 className="mt-2 text-3xl uppercase">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="size-4 fill-primary text-primary" />{product.rating.toFixed(1)}</span>
            <span>SKU {product.sku}</span>
            <span>{product.size}</span>
          </div>

          <div className="mt-6 flex items-end gap-3">
            <span className="text-3xl font-bold">{formatKES(product.price)}</span>
            {product.oldPrice && <span className="text-lg text-muted-foreground line-through">{formatKES(product.oldPrice)}</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Price per tyre, VAT inclusive.</p>
          <p className="mt-2 text-sm font-semibold">
            {product.stock > 0 ? (
              <span className="text-primary">{product.stock} in stock</span>
            ) : (
              <span className="text-destructive">Out of stock — ask us to source it</span>
            )}
          </p>

          <p className="mt-5 text-sm text-foreground">{product.description}</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-md border border-border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-lg">−</button>
              <span className="w-10 text-center text-sm font-bold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))} className="px-3 py-2 text-lg">+</button>
            </div>
            <button
              onClick={() => add(product.slug, qty)}
              disabled={product.stock === 0}
              className="flex-1 rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-40"
            >
              Add to cart
            </button>
          </div>

          <a
            href={`https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(`Hi Whitegoose Tires, I want a quote for ${product.brand} ${product.name} ${product.size}.`)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block rounded-md border border-border py-3 text-center text-sm font-bold uppercase tracking-wide hover:border-primary hover:text-primary"
          >
            Ask on WhatsApp
          </a>

          <dl className="mt-8 divide-y divide-border rounded-xl border border-border">
            {product.specs.map((s) => (
              <div key={s.label} className="flex justify-between px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {["Free fitting and balancing in branch", "Genuine stock with warranty", "Countrywide delivery available"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="size-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl uppercase">Similar products</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
