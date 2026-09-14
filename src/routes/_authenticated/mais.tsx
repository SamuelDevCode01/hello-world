import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogOut, Scissors, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSalao } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/mais")({
  component: PaginaMais,
  head: () => ({
    meta: [
      { title: "Mais opções | Serviços e configurações do salão" },
      {
        name: "description",
        content: "Acesse serviços, configurações do salão e saia da sua conta.",
      },
      { property: "og:title", content: "Mais opções | Serviços e configurações do salão" },
      {
        property: "og:description",
        content: "Acesse serviços, configurações do salão e saia da sua conta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ATALHOS = [
  { to: "/servicos", label: "Serviços", descricao: "Duração, preço e cores", icone: Scissors },
  {
    to: "/configuracoes",
    label: "Configurações do salão",
    descricao: "Horários, contato e identidade",
    icone: Settings,
  },
] as const;

function PaginaMais() {
  const { salao } = useSalao();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl">Mais</h1>
        {salao && <p className="text-sm text-muted-foreground">{salao.nome}</p>}
      </header>

      <ul className="space-y-2">
        {ATALHOS.map(({ to, label, descricao, icone: Icone }) => (
          <li key={to}>
            <Link
              to={to}
              className="card-elegante flex items-center gap-3 px-4 py-4 transition-shadow hover:shadow-[0_6px_20px_rgba(41,37,36,0.08)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icone className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{descricao}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => void sair()}>
        <LogOut className="size-4" /> Sair da conta
      </Button>
    </div>
  );
}
