import { Link } from "@tanstack/react-router";
import { LogOut, Menu, Phone, Search, ShoppingCart, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/whitegoose-logo.png";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";

// Deprecated: kept only as static fallbacks. Prefer useSiteSettings() so the
// site reflects whatever the IT Administrator has set in the admin console.
export const SHOP_PHONE = "+254 700 000 000";
export const SHOP_WHATSAPP = "254700000000";
export const SHOP_EMAIL = "sales@whitegoosetires.co.ke";
export const SHOP_ADDRESS = "Nairobi, Kenya";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop Tyres" },
  { to: "/brands", label: "Brands" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function AccountMenu() {
  const { session, signOut } = useAuth();

  if (!session) {
    return (
      <Link
        to="/sign-in"
        className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex"
      >
        <User className="size-4" /> Sign in
      </Link>
    );
  }

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <button
        type="button"
        onClick={() => signOut()}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        aria-label="Sign out"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const { phone } = useSiteSettings();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs">
          <p className="text-hairline text-primary">Quality • Service • Reliable</p>
          <div className="flex items-center gap-4">
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-primary">
              <Phone className="size-3.5" /> {phone}
            </a>
            <span className="hidden sm:inline text-ink-foreground/60">Free fitting & balancing</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src={logo} alt="Whitegoose Tires Ltd" className="h-12 w-auto" width={160} height={48} />
          <span className="hidden text-lg font-bold uppercase tracking-tight text-foreground sm:inline">
            Whitegoose Tires
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-primary" }}
              className="text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/shop"
            className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex"
          >
            <Search className="size-4" /> Find my size
          </Link>
          <AccountMenu />
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-ink-foreground transition-colors hover:bg-primary"
          >
            <ShoppingCart className="size-4" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-md border border-border lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-semibold uppercase tracking-wide"
            >
              {item.label}
            </Link>
          ))}
          <MobileAccountLinks onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </header>
  );
}

function MobileAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { session, signOut } = useAuth();

  if (!session) {
    return (
      <Link to="/sign-in" onClick={onNavigate} className="block py-2 text-sm font-semibold uppercase tracking-wide">
        Sign in
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          signOut();
          onNavigate();
        }}
        className="block py-2 text-left text-sm font-semibold uppercase tracking-wide"
      >
        Sign out
      </button>
    </>
  );
}

export function SiteFooter() {
  const { phone, email, address } = useSiteSettings();
  return (
    <footer className="mt-20 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logo} alt="Whitegoose Tires Ltd" className="h-14 w-auto brightness-0 invert" width={180} height={56} loading="lazy" />
          <p className="mt-4 text-sm text-ink-foreground/70">
            Tyres, wheels and batteries for retail, wholesale and fleet customers across Kenya and East Africa.
          </p>
        </div>
        <div>
          <h3 className="text-hairline text-primary">Shop</h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/70">
            <li><Link to="/shop" className="hover:text-primary">All tyres</Link></li>
            <li><Link to="/brands" className="hover:text-primary">Brands</Link></li>
            <li><Link to="/cart" className="hover:text-primary">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-hairline text-primary">Company</h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/70">
            <li><Link to="/about" className="hover:text-primary">About us</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-hairline text-primary">Get in touch</h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/70">
            <li>{phone}</li>
            <li>{email}</li>
            <li>{address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10 py-5 text-center text-xs text-ink-foreground/50">
        © {new Date().getFullYear()} Whitegoose Tires Ltd. All rights reserved.
      </div>
    </footer>
  );
}

export function WhatsAppButton() {
  const { whatsapp } = useSiteSettings();
  return (
    <a
      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hello Whitegoose Tires, I need a tyre quote.")}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-105"
    >
      WhatsApp us
    </a>
  );
}

export function CookieConsent() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem("wg-cookie-consent") !== null);
    } catch {
      /* ignore */
    }
  }, []);


  const decide = (value: string) => {
    try {
      localStorage.setItem("wg-cookie-consent", value);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          We use cookies to keep your cart, remember your vehicle and improve the shop.
        </p>
        <div className="flex gap-2 sm:ml-auto">
          <button
            onClick={() => decide("essential")}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
          >
            Essential only
          </button>
          <button
            onClick={() => decide("all")}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
