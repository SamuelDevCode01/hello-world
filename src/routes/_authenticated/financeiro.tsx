import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, CalendarCheck2, CreditCard, DollarSign, Receipt, RefreshCw, Scissors, ShoppingBag, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceiroDetalhado } from "@/hooks/use-financeiro-detalhado";
import { formatarMoeda } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: PaginaFinanceiro,
  head: () => ({ meta: [{ title: "Financeiro | Agenda do Salão" }] }),
});

const FORMAS: Record<string,{label:string;Icone:typeof Banknote}> = {
  pix:{label:"PIX",Icone:DollarSign}, dinheiro:{label:"Dinheiro",Icone:Banknote}, credito:{label:"Crédito",Icone:CreditCard}, debito:{label:"Débito",Icone:WalletCards}, outro:{label:"Outro",Icone:Receipt},
};

function PaginaFinanceiro(){
  const {data,isLoading,isError,refetch}=useFinanceiroDetalhado();
  if(isLoading)return <div className="space-y-4"><Skeleton className="h-10 w-44 rounded-xl"/><div className="grid grid-cols-2 gap-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div></div>;
  if(isError||!data)return <div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><Receipt className="size-8 text-muted-foreground"/><div><p className="font-medium">Não foi possível carregar o financeiro.</p><p className="mt-1 text-sm text-muted-foreground">Os dados continuam no banco. Tente carregar novamente.</p></div><Button variant="outline" className="rounded-xl" onClick={()=>void refetch()}><RefreshCw className="size-4"/> Tentar novamente</Button></div>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-display text-2xl">Financeiro</h1><p className="text-sm text-muted-foreground">Uma visão simples do que entrou no salão.</p></div><Button asChild variant="outline" className="rounded-xl"><Link to="/comandas"><Receipt className="size-4"/> Atendimentos e pagamentos</Link></Button></header>
    <section className="space-y-3"><h2 className="text-sm font-medium">Hoje</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Card titulo="Atendimentos" valor={String(data.atendimentosHoje)} icone={<CalendarCheck2 className="size-4"/>}/><Card titulo="Faturamento" valor={formatarMoeda(data.faturamentoHoje)}/><Card titulo="Recebido" valor={formatarMoeda(data.recebidoHoje)}/><Card titulo="Atendimentos abertos" valor={String(data.comandasAbertas)} icone={<Receipt className="size-4"/>}/></div></section>
    <section className="space-y-3"><h2 className="text-sm font-medium">Este mês</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Card titulo="Faturamento" valor={formatarMoeda(data.faturamentoMes)}/><Card titulo="Serviços realizados" valor={String(data.servicosRealizadosMes)} icone={<Scissors className="size-4"/>}/><Card titulo="Produtos vendidos" valor={String(data.produtosVendidosMes)} icone={<ShoppingBag className="size-4"/>}/><Card titulo="Ticket médio" valor={formatarMoeda(data.ticketMedio)}/></div></section>
    <section className="space-y-3"><h2 className="text-sm font-medium">Recebimentos por forma — mês</h2><div className="grid gap-2 sm:grid-cols-2">{Object.entries(FORMAS).map(([chave,{label,Icone}])=><div key={chave} className="card-elegante flex items-center gap-3 px-4 py-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icone className="size-4"/></span><span className="flex-1 text-sm">{label}</span><strong>{formatarMoeda(data.porForma[chave]??0)}</strong></div>)}</div></section>
    <p className="text-xs text-muted-foreground">Valores são operacionais e não substituem contabilidade, impostos ou DRE.</p>
  </div>;
}
function Card({titulo,valor,icone}:{titulo:string;valor:string;icone?:ReactNode}){return <div className="card-elegante px-4 py-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icone}{titulo}</div><p className="mt-1 text-xl font-semibold tabular-nums">{valor}</p></div>}
