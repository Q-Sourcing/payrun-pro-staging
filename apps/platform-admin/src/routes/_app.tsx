import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const { data, error } = await context.supabase.auth.getSession();
    if (error || !data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: AppLayout,
});



