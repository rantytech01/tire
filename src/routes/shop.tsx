import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductCard } from "@/components/product-card";
import { TyreFinder } from "@/components/tyre-finder";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/shop-data";

type ShopSearch = {
  q?: string | undefined;
  brand?: string | undefined;
  category?: string | undefined;
  width?: number | undefined;
  aspect?: number | undefined;
  rim?: number | undefined;
  max?: number | undefined;
  sort?: string | undefined;
};

export const Route = createFileRoute("/shop")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productsQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(brandsQuery),
    ]);
  },
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    ...(search["q"] ? { q: String(search["q"]) } : {}),
    ...(search["brand"] ? { brand: String(search["brand"]) } : {}),
    ...(search["category"] ? { category: String(search["category"]) } : {}),
    ...(search["width"] ? { width: Number(search["width"]) } : {}),
    ...(search["aspect"] ? { aspect: Number(search["aspect"]) } : {}),
    ...(search["rim"] ? { rim: Number(search["rim"]) } : {}),
    ...(search["max"] ? { max: Number(search["max"]) } : {}),
    ...(search["sort"] ? { sort: String(search["sort"]) } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Shop Tyres, Wheels & Batteries — Whitegoose Tires Ltd" },
      {
        name: "description",
        content:
          "Browse tyres by size, brand, vehicle or category. Live stock levels, Kenyan pricing and free fitting at Whitegoose Tires Ltd.",
      },
      { property: "og:title", content: "Shop Tyres — Whitegoose Tires Ltd" },
      { property: "og:description", content: "Filter by width, aspect ratio, rim size, brand and price." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { data: products } = useSuspenseQuery(productsQuery);
  const { data: CATEGORIES } = useSuspenseQuery(categoriesQuery);
  const { data: BRANDS } = useSuspenseQuery(brandsQuery);
  const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

  const setSearch = (patch: Partial<ShopSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  let results = products.filter((p) => {
    if (search.category && p.category !== search.category) return false;
    if (search.brand && p.brand !== search.brand) return false;
    if (search.width && p.width !== search.width) return false;
    if (search.aspect && p.aspect !== search.aspect) return false;
    if (search.rim && p.rim !== search.rim) return false;
    if (search.max && p.price > search.max) return false;
    if (search.q) {
      const hay = `${p.name} ${p.brand} ${p.size} ${p.category}`.toLowerCase();
      if (!hay.includes(search.q.toLowerCase())) return false;
    }
    return true;
  });

  if (search.sort === "price-asc") results = [...results].sort((a, b) => a.price - b.price);
  if (search.sort === "price-desc") results = [...results].sort((a, b) => b.price - a.price);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl uppercase">
        {search.category ? categoryName(search.category) : "All products"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{results.length} products found</p>

      <div className="mt-6">
        <TyreFinder />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="text-hairline text-muted-foreground">Search</h2>
            <input
              value={search.q ?? ""}
              onChange={(e) => setSearch({ q: e.target.value || undefined })}
              placeholder="e.g. 205/55R16 or Prado"
              className="mt-3 w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <h2 className="text-hairline text-muted-foreground">Category</h2>
            <div className="mt-3 space-y-1.5">
              <button onClick={() => setSearch({ category: undefined })} className={`block text-sm ${!search.category ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                All categories
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setSearch({ category: c.slug })}
                  className={`block text-left text-sm ${search.category === c.slug ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-hairline text-muted-foreground">Brand</h2>
            <div className="mt-3 space-y-1.5">
              <button onClick={() => setSearch({ brand: undefined })} className={`block text-sm ${!search.brand ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                All brands
              </button>
              {BRANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setSearch({ brand: b })}
                  className={`block text-left text-sm ${search.brand === b ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-hairline text-muted-foreground">Max price</h2>
            <input
              type="range"
              min={5000}
              max={80000}
              step={1000}
              value={search.max ?? 80000}
              onChange={(e) => setSearch({ max: Number(e.target.value) })}
              className="mt-3 w-full accent-[var(--primary)]"
            />
            <p className="mt-1 text-xs text-muted-foreground">Up to KSh {(search.max ?? 80000).toLocaleString()}</p>
          </div>
          <button
            onClick={() => navigate({ search: {} })}
            className="w-full rounded-md border border-border py-2 text-sm font-semibold hover:border-primary hover:text-primary"
          >
            Clear filters
          </button>
        </aside>

        <div>
          <div className="mb-5 flex justify-end">
            <select
              aria-label="Sort products"
              value={search.sort ?? ""}
              onChange={(e) => setSearch({ sort: e.target.value || undefined })}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Sort: featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <p className="font-bold">No products match those filters.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Talk to us on WhatsApp — we can source most sizes within 48 hours.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
