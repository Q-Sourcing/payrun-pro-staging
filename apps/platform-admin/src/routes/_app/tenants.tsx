import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/tenants")({
  component: TenantsLayout,
});

function TenantsLayout() {
  return <Outlet />;
}



