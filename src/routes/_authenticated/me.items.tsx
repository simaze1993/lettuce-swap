import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/me/items")({
  component: () => <Outlet />,
});
