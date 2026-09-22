import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignInSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    ...(search["redirect"] ? { redirect: String(search["redirect"]) } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Whitegoose Tires Ltd" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignInPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.1 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1-.1-1.4H12z"
      />
    </svg>
  );
}

function SignInPage() {
  const { session } = useAuth();
  const search = Route.useSearch();
  const redirectTo = search.redirect ?? "/";

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (session) {
      const saved = window.sessionStorage.getItem("wg:post-auth-redirect");
      window.sessionStorage.removeItem("wg:post-auth-redirect");
      const target = saved && saved.startsWith("/") ? saved : redirectTo;
      // Plain navigation avoids the router's static-route typing for an
      // arbitrary redirect target that comes from a search param.
      window.location.assign(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      if (typeof window !== "undefined" && redirectTo.startsWith("/")) {
        window.sessionStorage.setItem("wg:post-auth-redirect", redirectTo);
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in didn't complete. Please try again.");
        setGoogleLoading(false);
        return;
      }
      // If redirected, the browser leaves this page. Otherwise the session is set
      // already and the session effect below performs the redirect.
    } catch {
      toast.error("Google sign-in didn't complete. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || undefined, phone: phone || undefined },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created. You're signed in.");
        } else {
          toast.success("Account created. Check your email to confirm it, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-3xl uppercase">{mode === "sign-in" ? "Sign in" : "Create account"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "sign-in"
          ? "Sign in to check out, track orders and access your account."
          : "Create an account to check out faster next time."}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-6 gap-2"
        onClick={handleGoogle}
        disabled={googleLoading}
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "sign-up" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Wanjiru" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            New here?{" "}
            <button type="button" onClick={() => setMode("sign-up")} className="font-semibold text-primary hover:underline">
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("sign-in")} className="font-semibold text-primary hover:underline">
              Sign in
            </button>
          </>
        )}
      </p>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Back to shop</Link>
      </p>
    </div>
  );
}
