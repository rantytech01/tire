import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, Truck, Wrench } from "lucide-react";
import hero from "@/assets/hero-tyres.jpg";
import { ProductCard } from "@/components/product-card";
import { TyreFinder } from "@/components/tyre-finder";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/shop-data";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productsQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(brandsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Whitegoose Tires Ltd — Tyres, Wheels & Batteries in Kenya" },
      {
        name: "description",
        content:
          "Buy genuine passenger, SUV, truck and bus tyres in Kenya. Bridgestone, Michelin, Yokohama and more, with free fitting and balancing.",
      },
      { property: "og:title", content: "Whitegoose Tires Ltd — Tyre Shop Kenya" },
      {
        property: "og:description",
        content: "Quality • Service • Reliable. Tyres, alloy wheels and batteries for retail, wholesale and fleet.",
      },
    ],
  }),
  component: Home,
});

const PERKS = [
  { icon: Wrench, title: "Free fitting & balancing", text: "In-branch while you wait" },
  { icon: BadgeCheck, title: "Genuine brands only", text: "Manufacturer warranty" },
  { icon: Truck, title: "Countrywide delivery", text: "Nairobi same-day" },
  { icon: Clock, title: "Fleet & wholesale", text: "Priority stock and pricing" },
];

function Home() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { data: CATEGORIES } = useSuspenseQuery(categoriesQuery);
  const { data: BRANDS } = useSuspenseQuery(brandsQuery);
  const bestSellers = products.slice(0, 8);
  const deals = products.filter((p) => p.oldPrice).slice(0, 4);

  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img src={hero} alt="Premium tyres and alloy wheels" width={1600} height={1008} className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="text-hairline text-primary">Tyre shop • Kenya</p>
            <h1 className="mt-4 text-4xl uppercase leading-[1.05] sm:text-6xl">
              The right tyre,<br />
              <span className="text-primary">fitted the same day.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-foreground/80">
              Whitegoose Tires Ltd supplies genuine passenger, SUV, truck, bus and agricultural tyres,
              alloy wheels and batteries across Kenya and East Africa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-105">
                Shop tyres
              </Link>
              <Link to="/contact" className="rounded-md border border-ink-foreground/30 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:border-primary hover:text-primary">
                Request a quote
              </Link>
            </div>
          </div>
          <div className="self-end">
            <TyreFinder dark />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-start gap-3">
              <p.icon className="mt-0.5 size-6 text-primary" />
              <div>
                <p className="text-sm font-bold">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl uppercase sm:text-3xl">Shop by category</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/shop"
              search={{ category: c.slug }}
              className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:border-primary"
            >
              <p className="text-base font-bold group-hover:text-primary">{c.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl uppercase sm:text-3xl">Best sellers</h2>
            <Link to="/shop" className="text-sm font-bold uppercase tracking-wide text-primary">View all</Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl uppercase sm:text-3xl">This month's offers</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl uppercase">Brands we stock</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {BRANDS.map((b) => (
              <Link
                key={b}
                to="/shop"
                search={{ brand: b }}
                className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors hover:border-primary hover:text-primary"
              >
                {b}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl uppercase sm:text-3xl">What customers say</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            { name: "James M.", role: "Toyota Prado owner", text: "Ordered 265/65R17 in the morning, fitted by lunch. Genuine stock and fair pricing." },
            { name: "Fleet Manager, Sunrise Logistics", role: "Truck fleet, 40 units", text: "Consistent supply for our truck tyres and proper invoicing for our accounts team." },
            { name: "Wanjiru K.", role: "Mazda Demio owner", text: "They helped me find the correct size and even checked my alignment. Very reliable." },
          ].map((t) => (
            <figure key={t.name} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <blockquote className="text-sm text-foreground">"{t.text}"</blockquote>
              <figcaption className="mt-4 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{t.name}</span> · {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
