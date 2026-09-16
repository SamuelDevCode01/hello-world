import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { SalaoProvider } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: Layout,
});

function Layout() {
  return (
    <SalaoProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </SalaoProvider>
  );
}
