import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  Ellipsis,
  ReceiptText,
  Scissors,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { OnboardingSalao } from "@/components/salao/onboarding-salao";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalao } from "@/contexts/salao";
import { cn } from "@/lib/utils";

type ItemNav = {
  to: "/agenda" | "/clientes" | "/comandas" | "/mais";
  label: string;
  icone: typeof CalendarDays;
};

const ITENS: ItemNav[] = [
  { to: "/agenda", label: "Agenda", icone: CalendarDays },
  { to: "/clientes", label: "Clientes", icone: Users },
  { to: "/comandas", label: "Comandas", icone: ReceiptText },
  { to: "/mais", label: "Mais", icone: Ellipsis },
];

const COR_PADRAO = "#C1622D";
const HEX = /^#[0-9a-fA-F]{6}$/;

export function AppShell({ children }: { children: ReactNode }) {
  const { salao, carregando } = useSalao();
  const nome = salao?.nome ?? null;
  const cor = salao?.cor_primaria ?? null;

  useEffect(() => {
    document.title = nome ? `${nome} | Agenda` : "Agenda do Salão";
  }, [nome]);

  useEffect(() => {
    const valor = cor && HEX.test(cor) ? cor : COR_PADRAO;
    const raiz = document.documentElement;
    raiz.style.setProperty("--primary", valor);
    raiz.style.setProperty("--ring", valor);
    raiz.style.setProperty("--sidebar-primary", valor);
    return () => {
      raiz.style.removeProperty("--primary");
      raiz.style.removeProperty("--ring");
      raiz.style.removeProperty("--sidebar-primary");
    };
  }, [cor]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-background p-5">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        <Skeleton className="mt-3 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!salao) return <OnboardingSalao />;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar nome={salao.nome} />
      <div className="md:pl-64">
        <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-4 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function Sidebar({ nome }: { nome: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <div className="flex items-center gap-3 px-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Scissors className="size-5" />
        </span>
        <span className="truncate font-display text-base font-semibold">{nome}</span>
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {ITENS.map(({ to, label, icone: Icone }) => {
          const ativo = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                ativo
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <Icone className="size-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {ITENS.map(({ to, label, icone: Icone }) => {
          const ativo = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 px-2 pb-1 pt-2.5 text-[11px] font-medium transition-colors",
                ativo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icone className={cn("size-5", ativo && "scale-110 transition-transform")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
