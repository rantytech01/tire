import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { brandsQuery, productsQuery } from "@/lib/shop-data";

export const Route = createFileRoute("/brands")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(brandsQuery),
      context.queryClient.ensureQueryData(productsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Tyre Brands We Stock — Whitegoose Tires Ltd" },
      {
        name: "description",
        content:
          "Bridgestone, Michelin, Yokohama, Goodyear, Dunlop, Continental, Pirelli, BFGoodrich and Hankook tyres in Kenya.",
      },
      { property: "og:title", content: "Tyre Brands — Whitegoose Tires Ltd" },
      { property: "og:description", content: "Genuine tyre brands stocked for retail, wholesale and fleet customers." },
    ],
  }),
  component: Brands,
});

function Brands() {
  const { data: brands } = useSuspenseQuery(brandsQuery);
  const { data: products } = useSuspenseQuery(productsQuery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl uppercase">Brands we stock</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        We supply genuine tyres sourced through approved channels, each with its manufacturer warranty.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => {
          const count = products.filter((p) => p.brand === brand).length;
          return (
            <Link
              key={brand}
              to="/shop"
              search={{ brand }}
              className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary"
            >
              <h2 className="text-xl uppercase group-hover:text-primary">{brand}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{count} products in stock</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
