import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { formatKES, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const off = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-primary/50">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block bg-surface">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={800}
          height={600}
          className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
            -{off}%
          </span>
        )}
        <span className="absolute right-3 top-3 rounded bg-ink/85 px-2 py-1 text-[11px] font-semibold text-ink-foreground">
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-hairline text-muted-foreground">{product.brand}</p>
        <h3 className="mt-1 text-base leading-snug">
          <Link to="/product/$slug" params={{ slug: product.slug }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm font-semibold text-foreground">{product.size}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-primary text-primary" />
          {product.rating.toFixed(1)}
        </div>

        <div className="mt-4 flex items-end gap-2">
          <span className="text-lg font-bold text-foreground">{formatKES(product.price)}</span>
          {product.oldPrice && (
            <span className="text-sm text-muted-foreground line-through">{formatKES(product.oldPrice)}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => add(product.slug)}
          disabled={product.stock === 0}
          className="mt-4 w-full rounded-md bg-ink py-2.5 text-sm font-bold uppercase tracking-wide text-ink-foreground transition-colors hover:bg-primary disabled:opacity-40"
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
