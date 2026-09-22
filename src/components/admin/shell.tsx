import { useState, type FormEvent, type ReactNode } from "react";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldAlert,
  Users,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Permissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AdminTab = "dashboard" | "products" | "orders" | "stock" | "reports" | "users";

type NavItem = {
  tab: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
  requires?: keyof Permissions;
};

const NAV: NavItem[] = [
  { tab: "dashboard", label: "Overview", icon: LayoutDashboard },
  { tab: "products", label: "Products", icon: Package, requires: "manageCatalog" },
  { tab: "orders", label: "Orders", icon: ClipboardList, requires: "manageOrders" },
  { tab: "stock", label: "Stock", icon: Warehouse, requires: "manageStock" },
  { tab: "reports", label: "Reports", icon: BarChart3, requires: "viewReports" },
  { tab: "users", label: "Users", icon: Users, requires: "manageUsers" },
];

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-background p-7 shadow-card">
        <p className="text-hairline text-primary">Whitegoose Tires</p>
        <h1 className="mt-1 text-2xl uppercase">Staff console</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with your staff account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-password">Password</Label>
            <Input
              id="staff-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function NoAccess({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-background p-7 text-center shadow-card">
        <ShieldAlert className="mx-auto size-8 text-destructive" />
        <h1 className="mt-3 text-xl uppercase">No staff access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account isn't set up as staff yet. Ask an IT Administrator to grant you access.
        </p>
        <Button variant="outline" className="mt-6" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

type AdminShellProps = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: ReactNode;
};

export function AdminShell({ activeTab, onTabChange, children }: AdminShellProps) {
  const { session, isStaff, loading, signOut, user, label, permissions } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-ink text-sm text-white/60">Loading console…</div>;
  }
  if (!session) return <StaffLogin />;
  if (!isStaff) return <NoAccess onSignOut={() => void signOut()} />;

  const visibleNav = NAV.filter((item) => {
    if (!item.requires) return true;
    return permissions[item.requires];
  });

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Sidebar — desktop only */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-ink text-ink-foreground lg:flex">
        <div className="px-5 py-6">
          <p className="text-hairline text-primary">Whitegoose</p>
          <p className="text-lg font-bold uppercase">Staff console</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {visibleNav.map((item) => {
            const active = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onTabChange(item.tab)}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-ink-foreground/70 hover:bg-white/5"
                }`}
              >
                <item.icon className="size-4" /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-ink-foreground/60">
          <p className="truncate font-semibold text-ink-foreground">{user?.email}</p>
          <p className="mt-0.5 uppercase tracking-wide">{label}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 inline-flex items-center gap-1.5 text-ink-foreground/70 hover:text-primary"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="border-b border-border bg-background">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-primary">Whitegoose Tires</p>
              <h1 className="truncate text-xl font-bold uppercase">
                {visibleNav.find((n) => n.tab === activeTab)?.label ?? "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:inline">
                {label}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-md border border-border p-2 text-muted-foreground hover:border-primary hover:text-primary"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
          {/* Mobile nav tabs */}
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 lg:hidden">
            {visibleNav.map((item) => {
              const active = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => onTabChange(item.tab)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-destructive/10 text-destructive"
      : tone === "success"
        ? "bg-primary/10 text-primary"
        : "bg-ink/10 text-ink";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
}

export function statusTone(status: string) {
  switch (status) {
    case "completed":
    case "paid":
      return "default" as const;
    case "cancelled":
    case "refunded":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}
