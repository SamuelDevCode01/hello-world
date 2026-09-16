import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CreditCard, DollarSign, Receipt, ShoppingBag, WalletCards } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceiro } from "@/hooks/use-operacao";
import { formatarMoeda } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: PaginaFinanceiro,
  head: () => ({ meta: [{ title: "Financeiro | Agenda do Salão" }] }),
});

const FORMAS: Record<string,{label:string;Icone:typeof Banknote}> = {
  pix:{label:"PIX",Icone:DollarSign}, dinheiro:{label:"Dinheiro",Icone:Banknote}, credito:{label:"Crédito",Icone:CreditCard}, debito:{label:"Débito",Icone:WalletCards}, outro:{label:"Outro",Icone:Receipt},
};

function PaginaFinanceiro(){
  const {data,isLoading}=useFinanceiro();
  if(isLoading||!data)return <div className="space-y-4"><Skeleton className="h-10 w-44 rounded-xl"/><div className="grid grid-cols-2 gap-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div></div>;
  return <div className="space-y-6">
    <header><h1 className="font-display text-2xl">Financeiro</h1><p className="text-sm text-muted-foreground">Uma visão simples do que entrou no salão.</p></header>
    <section className="space-y-3"><h2 className="text-sm font-medium">Hoje</h2><div className="grid grid-cols-2 gap-3"><Card titulo="Faturamento" valor={formatarMoeda(data.faturamentoHoje)}/><Card titulo="Comandas abertas" valor={String(data.comandasAbertas)}/></div></section>
    <section className="space-y-3"><h2 className="text-sm font-medium">Este mês</h2><div className="grid grid-cols-2 gap-3"><Card titulo="Faturamento" valor={formatarMoeda(data.faturamentoMes)}/><Card titulo="Ticket médio" valor={formatarMoeda(data.ticketMedio)}/><Card titulo="Produtos vendidos" valor={String(data.produtosVendidos)} icone={<ShoppingBag className="size-4"/>}/></div></section>
    <section className="space-y-3"><h2 className="text-sm font-medium">Recebimentos por forma</h2><div className="grid gap-2 sm:grid-cols-2">{Object.entries(FORMAS).map(([chave,{label,Icone}])=><div key={chave} className="card-elegante flex items-center gap-3 px-4 py-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icone className="size-4"/></span><span className="flex-1 text-sm">{label}</span><strong>{formatarMoeda(data.porForma[chave]??0)}</strong></div>)}</div></section>
    <p className="text-xs text-muted-foreground">Valores são operacionais e não substituem contabilidade, impostos ou DRE.</p>
  </div>;
}
function Card({titulo,valor,icone}:{titulo:string;valor:string;icone?:React.ReactNode}){return <div className="card-elegante px-4 py-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icone}{titulo}</div><p className="mt-1 text-xl font-semibold tabular-nums">{valor}</p></div>}
