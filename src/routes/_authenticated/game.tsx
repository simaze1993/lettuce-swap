import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { GAME_MODE_ENABLED } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/game")({
  // Game mode is postponed (see GAME_MODE_ENABLED). Guard the whole /game
  // subtree at the layout route so every child redirects home while disabled.
  beforeLoad: () => {
    if (!GAME_MODE_ENABLED) {
      throw redirect({ to: "/home" });
    }
  },
  component: () => <Outlet />,
});
