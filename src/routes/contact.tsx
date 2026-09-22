import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { SHOP_ADDRESS, SHOP_EMAIL, SHOP_PHONE, SHOP_WHATSAPP } from "@/components/site-chrome";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Whitegoose Tires Ltd — Kenya" },
      {
        name: "description",
        content: "Call, email or WhatsApp Whitegoose Tires Ltd for tyre quotes, fleet supply and fitting appointments in Kenya.",
      },
      { property: "og:title", content: "Contact Whitegoose Tires Ltd" },
      { property: "og:description", content: "Get a tyre quote by phone, email or WhatsApp." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });

  const waLink = `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(
    `Hello Whitegoose Tires.\nName: ${form.name}\nPhone: ${form.phone}\n${form.message}`,
  )}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-hairline text-primary">Contact</p>
      <h1 className="mt-3 text-4xl uppercase">Talk to our tyre team</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <a href={`tel:${SHOP_PHONE.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary">
            <Phone className="size-5 text-primary" />
            <div><p className="text-sm font-bold">Call us</p><p className="text-sm text-muted-foreground">{SHOP_PHONE}</p></div>
          </a>
          <a href={`mailto:${SHOP_EMAIL}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary">
            <Mail className="size-5 text-primary" />
            <div><p className="text-sm font-bold">Email</p><p className="text-sm text-muted-foreground">{SHOP_EMAIL}</p></div>
          </a>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-5">
            <MapPin className="size-5 text-primary" />
            <div><p className="text-sm font-bold">Branch</p><p className="text-sm text-muted-foreground">{SHOP_ADDRESS}</p></div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              title="Whitegoose Tires location"
              src="https://www.google.com/maps?q=Nairobi,Kenya&output=embed"
              className="h-64 w-full"
              loading="lazy"
            />
          </div>
        </div>

        <form
          className="h-fit rounded-xl border border-border bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            window.open(waLink, "_blank");
          }}
        >
          <h2 className="text-xl uppercase">Request a quote</h2>
          <div className="mt-5 space-y-4">
            <input
              required
              maxLength={80}
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
            <input
              required
              maxLength={20}
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
            <textarea
              required
              maxLength={600}
              rows={5}
              placeholder="Vehicle, tyre size and quantity"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
            <button type="submit" className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground">
              Send via WhatsApp
            </button>
            <p className="text-xs text-muted-foreground">
              Opens WhatsApp with your details filled in. Email quoting is added once your mail details are set up.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
