import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "cashier" | "salesperson" | "store" | "inventory" | "customer";

/** Staff roles — anything other than a plain customer. */
export const STAFF_ROLES: AppRole[] = ["admin", "manager", "cashier", "salesperson", "store", "inventory"];

/** All assignable staff roles, in the order they should appear in role pickers. */
export const ASSIGNABLE_STAFF_ROLES: AppRole[] = ["admin", "manager", "salesperson", "store", "inventory", "cashier"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "IT Administrator",
  manager: "Manager",
  cashier: "Cashier",
  salesperson: "Salesperson",
  store: "Store",
  inventory: "Inventory",
  customer: "Customer",
};

/** Highest-precedence role first — used when a user carries more than one role. */
const ROLE_PRIORITY: AppRole[] = ["admin", "manager", "inventory", "store", "salesperson", "cashier", "customer"];

/** Flat permission flags derived from the user's role set */
export type Permissions = {
  /** Root-only: IT Administrator — can manage users / grant roles and edit site contact info */
  manageUsers: boolean;
  /** Admin + Manager + Inventory: can create/edit/delete products and upload photos */
  manageCatalog: boolean;
  /** Admin + Manager + Cashier + Store + Inventory: can adjust stock levels */
  manageStock: boolean;
  /** Admin + Manager + Salesperson: can update order and payment status */
  manageOrders: boolean;
  /** Admin + Manager: can view revenue / sales reports */
  viewReports: boolean;
};

export type RoleLabel = (typeof ROLE_LABELS)[AppRole];

export function roleLabel(roles: AppRole[]): RoleLabel {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return ROLE_LABELS[r];
  }
  return ROLE_LABELS.customer;
}

function derivePermissions(roles: AppRole[]): Permissions {
  const has = (r: AppRole) => roles.includes(r);
  const isAdmin = has("admin");
  const isManager = has("manager");
  return {
    manageUsers: isAdmin,
    manageCatalog: isAdmin || isManager || has("inventory"),
    manageStock: isAdmin || isManager || has("cashier") || has("store") || has("inventory"),
    manageOrders: isAdmin || isManager || has("salesperson"),
    viewReports: isAdmin || isManager,
  };
}

type AuthValue = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isStaff: boolean;
  permissions: Permissions;
  label: RoleLabel;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setRoles([]);
      return;
    }
    let active = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (active) setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    roles,
    isStaff: roles.some((r) => STAFF_ROLES.includes(r)),
    permissions: derivePermissions(roles),
    label: roleLabel(roles),
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
