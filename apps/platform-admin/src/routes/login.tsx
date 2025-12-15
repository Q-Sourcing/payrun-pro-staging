import { type FormEvent, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getEnv } from "@/lib/env";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await context.supabase.auth.getSession();
    if (!error && data.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, deviceApproved } = useAuth();
  const { VITE_ENFORCE_DEVICE_APPROVAL } = getEnv();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const result = await login(email, password);
    if (result.success) {
      navigate({ to: "/dashboard" });
    } else {
      setFormError(
        VITE_ENFORCE_DEVICE_APPROVAL
          ? "Login failed. Check device approval or credentials."
          : "Login failed. Check credentials.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Platform Admin Login</CardTitle>
          <CardDescription>
            Staging console — device approval {VITE_ENFORCE_DEVICE_APPROVAL ? "enforced" : "disabled"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {VITE_ENFORCE_DEVICE_APPROVAL && deviceApproved === false && (
              <p className="text-sm text-amber-700">
                Device registered but not approved. Contact a super admin.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



