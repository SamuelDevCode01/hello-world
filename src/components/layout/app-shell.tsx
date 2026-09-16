import { Link, useRouterState } from "@tanstack/react-router";
import { Boxes, CalendarDays, Gift, Package, RotateCcw, Scissors, Settings, Users, WalletCards } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { BuscaGlobal } from "@/components/layout/busca-global";
import { OnboardingSalao } from "@/components/salao/onboarding-salao";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalao } from "@/contexts/salao";
import { cn } from "@/lib/utils";

type RotaNav = "/agenda" | "/clientes" | "/servicos" | "/retornos" | "/produtos" | "/estoque" | "/pacotes" | "/financeiro" | "/configuracoes";
type ItemNav = { to: RotaNav; label: string; icone: typeof CalendarDays };

const PRINCIPAIS: ItemNav[] = [
  { to: "/agenda", label: "Agenda", icone: CalendarDays },
  { to: "/clientes", label: "Clientes", icone: Users },
  { to: "/servicos", label: "Serviços", icone: Scissors },
  { to: "/retornos", label: "Retornos", icone: RotateCcw },
];

const GESTAO: ItemNav[] = [
  { to: "/produtos", label: "Produtos", icone: Package },
  { to: "/estoque", label: "Estoque", icone: Boxes },
  { to: "/pacotes", label: "Pacotes", icone: Gift },
  { to: "/financeiro", label: "Financeiro", icone: WalletCards },
  { to: "/configuracoes", label: "Configurações", icone: Settings },
];

const MOBILE: ItemNav[] = [PRINCIPAIS[0]!, PRINCIPAIS[1]!, PRINCIPAIS[2]!, PRINCIPAIS[3]!, GESTAO[4]!];

const COR_PADRAO = "#C1622D";
const HEX = /^#[0-9a-fA-F]{6}$/;

export function AppShell({ children }: { children: ReactNode }) {
  const { salao, carregando } = useSalao();
  const nome = salao?.nome ?? null;
  const cor = salao?.cor_primaria ?? null;

  useEffect(() => { document.title = nome ? `${nome} | Agenda` : "Agenda do Salão"; }, [nome]);
  useEffect(() => {
    const valor = cor && HEX.test(cor) ? cor : COR_PADRAO;
    const raiz = document.documentElement;
    raiz.style.setProperty("--primary", valor);
    raiz.style.setProperty("--ring", valor);
    raiz.style.setProperty("--sidebar-primary", valor);
    return () => { raiz.style.removeProperty("--primary"); raiz.style.removeProperty("--ring"); raiz.style.removeProperty("--sidebar-primary"); };
  }, [cor]);

  if (carregando) return <div className="min-h-screen bg-background p-5"><Skeleton className="h-8 w-48 rounded-xl"/><Skeleton className="mt-4 h-24 w-full rounded-xl"/><Skeleton className="mt-3 h-64 w-full rounded-xl"/></div>;
  if (!salao) return <OnboardingSalao />;

  return <div className="min-h-screen bg-background">
    <Sidebar nome={salao.nome} />
    <div className="md:pl-64">
      <div className="sticky top-0 z-20 flex justify-end bg-background/85 px-4 py-2 backdrop-blur md:hidden"><BuscaGlobal compacta /></div>
      <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-2 md:px-8 md:pb-10 md:pt-4">{children}</main>
    </div>
    <BottomNav />
  </div>;
}

function Item({ item, pathname }: { item: ItemNav; pathname: string }) {
  const Icone = item.icone; const ativo = pathname.startsWith(item.to);
  return <Link to={item.to} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", ativo ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground")}><Icone className="size-[18px]"/>{item.label}</Link>;
}

function Sidebar({ nome }: { nome: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
    <div className="flex items-center gap-3 px-2"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Scissors className="size-5"/></span><span className="truncate font-display text-base font-semibold">{nome}</span></div>
    <div className="mt-5 px-1"><BuscaGlobal /></div>
    <nav className="mt-5 flex flex-col gap-1">{PRINCIPAIS.map(i=><Item key={i.to} item={i} pathname={pathname}/>)}</nav>
    <p className="mt-6 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gestão</p>
    <nav className="mt-2 flex flex-col gap-1">{GESTAO.map(i=><Item key={i.to} item={i} pathname={pathname}/>)}</nav>
  </aside>;
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">{MOBILE.map(({to,label,icone:Icone})=>{const ativo=pathname.startsWith(to);return <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 px-1 pb-1 pt-2.5 text-[10px] font-medium transition-colors",ativo?"text-primary":"text-muted-foreground")}><Icone className={cn("size-5",ativo&&"scale-110 transition-transform")}/>{label}</Link>})}</div></nav>;
}
