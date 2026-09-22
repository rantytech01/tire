import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "cashier" | "customer";
export const STAFF_ROLES: AppRole[] = ["admin", "manager", "cashier"];

/** Flat permission flags derived from the user's role set */
export type Permissions = {
  /** Root-only: IT Administrator — can manage users / grant roles */
  manageUsers: boolean;
  /** Admin + Manager: can create/edit/delete products and upload photos */
  manageCatalog: boolean;
  /** Admin + Manager + Cashier: can adjust stock levels */
  manageStock: boolean;
  /** Admin + Manager: can update order and payment status */
  manageOrders: boolean;
  /** Admin + Manager: can view revenue / sales reports */
  viewReports: boolean;
};

export type RoleLabel = "IT Administrator" | "Manager" | "Cashier" | "Customer";

export function roleLabel(roles: AppRole[]): RoleLabel {
  if (roles.includes("admin")) return "IT Administrator";
  if (roles.includes("manager")) return "Manager";
  if (roles.includes("cashier")) return "Cashier";
  return "Customer";
}

function derivePermissions(roles: AppRole[]): Permissions {
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");
  const isCashier = roles.includes("cashier");
  return {
    manageUsers: isAdmin,
    manageCatalog: isAdmin || isManager,
    manageStock: isAdmin || isManager || isCashier,
    manageOrders: isAdmin || isManager,
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
