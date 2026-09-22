import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Whitegoose Tires Ltd — Tyre Shop in Kenya" },
      {
        name: "description",
        content:
          "Whitegoose Tires Ltd supplies tyres, alloy wheels, batteries and accessories to retail, wholesale and fleet customers across Kenya and East Africa.",
      },
      { property: "og:title", content: "About Whitegoose Tires Ltd" },
      { property: "og:description", content: "Quality • Service • Reliable — a Kenyan tyre business built on genuine stock." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="text-hairline text-primary">About us</p>
      <h1 className="mt-3 text-4xl uppercase">Quality • Service • Reliable</h1>
      <p className="mt-6 text-base text-muted-foreground">
        Whitegoose Tires Ltd is a Kenyan tyre business supplying passenger, SUV, truck, bus, agricultural and
        industrial tyres, alloy wheels, batteries and accessories. We serve walk-in customers, wholesale buyers
        and fleet operators, and we back every sale with fitting, balancing and honest advice on what your
        vehicle actually needs.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { k: "Genuine stock", v: "Sourced through approved channels with manufacturer warranty." },
          { k: "Fleet ready", v: "Volume pricing, scheduled supply and proper invoicing." },
          { k: "Service first", v: "Fitting, balancing and rotation guidance in branch." },
        ].map((item) => (
          <div key={item.k} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-base font-bold">{item.k}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-ink p-8 text-ink-foreground">
        <h2 className="text-2xl uppercase">Need a bulk or fleet quote?</h2>
        <p className="mt-3 text-sm text-ink-foreground/75">
          Send us your sizes and quantities and we will confirm availability and pricing.
        </p>
        <Link to="/contact" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground">
          Contact our team
        </Link>
      </div>
    </div>
  );
}
