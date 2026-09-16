import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownToLine, Boxes, History } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMovimentarEstoque, useMovimentosEstoque, useProdutos, type Produto } from "@/hooks/use-operacao";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: PaginaEstoque,
  head: () => ({ meta: [{ title: "Estoque | Agenda do Salão" }] }),
});

function estado(p: Produto) {
  const atual = Number(p.quantidade_atual), minimo = Number(p.estoque_minimo);
  if (atual <= 0) return { label: "Sem estoque", classe: "bg-destructive/10 text-destructive" };
  if (atual <= minimo) return { label: "Estoque baixo", classe: "bg-warning/10 text-warning" };
  return { label: "Normal", classe: "bg-success/10 text-success" };
}

function PaginaEstoque() {
  const { data: produtos = [], isLoading } = useProdutos();
  const { data: movimentos = [] } = useMovimentosEstoque();
  const [produto,setProduto] = useState<Produto|null>(null);
  const [historico,setHistorico] = useState(false);
  const baixos = useMemo(()=>produtos.filter(p=>Number(p.quantidade_atual)<=Number(p.estoque_minimo)),[produtos]);
  return <div className="space-y-6">
    <header><h1 className="font-display text-2xl">Estoque</h1><p className="text-sm text-muted-foreground">Entradas, saídas e alertas de estoque baixo.</p></header>
    {baixos.length>0&&<div className="rounded-xl border border-warning/30 bg-warning/10 p-4"><div className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-warning"/> Estoque baixo</div><p className="mt-1 text-sm text-muted-foreground">{baixos.length} produto{baixos.length===1?"":"s"} precisa{baixos.length===1?"":"m"} de atenção.</p></div>}
    <div className="flex justify-end"><Button variant="outline" className="rounded-xl" onClick={()=>setHistorico(true)}><History className="size-4"/> Histórico</Button></div>
    {isLoading?<div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-20 rounded-xl"/>)}</div>:produtos.length===0?<div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><Boxes className="size-8 text-muted-foreground"/><p className="text-sm text-muted-foreground">Nenhum produto cadastrado. Cadastre produtos primeiro.</p></div>:<div className="space-y-2">{produtos.map(p=>{const e=estado(p);return <button key={p.id} onClick={()=>setProduto(p)} className="card-elegante flex w-full items-center gap-3 px-4 py-3 text-left"><span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.nome}</span><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${e.classe}`}>{e.label}</span></span><span className="text-right"><span className="block text-lg font-semibold tabular-nums">{Number(p.quantidade_atual)}</span><span className="block text-xs text-muted-foreground">mín. {Number(p.estoque_minimo)} {p.unidade}</span></span></button>})}</div>}
    <SheetMovimento produto={produto} onOpenChange={(v)=>!v&&setProduto(null)}/>
    <Sheet open={historico} onOpenChange={setHistorico}><SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none sm:max-w-lg"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>Movimentações</SheetTitle><SheetDescription>Últimas alterações de estoque.</SheetDescription></SheetHeader><div className="space-y-2 px-5 pb-8 pt-3">{movimentos.length===0?<p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>:movimentos.map((m:any)=><div key={m.id} className="rounded-xl border px-3 py-3"><div className="flex justify-between gap-3"><span className="font-medium">{m.produtos?.nome}</span><span className={Number(m.quantidade)>=0?"text-success":"text-destructive"}>{Number(m.quantidade)>0?"+":""}{Number(m.quantidade)} {m.produtos?.unidade}</span></div><p className="text-xs text-muted-foreground">{String(m.tipo).replace("_"," ")} · {new Date(m.created_at).toLocaleString("pt-BR")}</p>{m.motivo&&<p className="mt-1 text-xs">{m.motivo}</p>}</div>)}</div></SheetContent></Sheet>
  </div>;
}

function SheetMovimento({produto,onOpenChange}:{produto:Produto|null;onOpenChange:(v:boolean)=>void}) {
  const mover=useMovimentarEstoque(); const [tipo,setTipo]=useState("entrada"); const [quantidade,setQuantidade]=useState("1"); const [motivo,setMotivo]=useState("");
  async function salvar(){if(!produto)return;const q=Number(quantidade);if(!Number.isFinite(q)||q<=0){toast.error("Informe uma quantidade válida.");return;}try{await mover.mutateAsync({produtoId:produto.id,tipo,quantidade:q,motivo});toast.success("Estoque atualizado.");onOpenChange(false);setQuantidade("1");setMotivo("");}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível movimentar o estoque.");}}
  return <Sheet open={Boolean(produto)} onOpenChange={onOpenChange}><SheetContent side="bottom" className="rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>{produto?.nome}</SheetTitle><SheetDescription>Estoque atual: {produto?Number(produto.quantidade_atual):0} {produto?.unidade}</SheetDescription></SheetHeader><div className="space-y-4 px-5 pb-8 pt-3"><div className="space-y-2"><Label>Tipo</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger className="h-12 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem><SelectItem value="uso_interno">Uso interno</SelectItem><SelectItem value="perda">Perda</SelectItem><SelectItem value="ajuste">Ajuste positivo</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Quantidade</Label><Input type="number" step="0.001" min="0.001" className="h-12 rounded-xl" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></div><div className="space-y-2"><Label>Motivo</Label><Textarea className="rounded-xl" value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Opcional"/></div><Button className="h-12 w-full rounded-xl" onClick={()=>void salvar()} disabled={mover.isPending}><ArrowDownToLine className="size-4"/>{mover.isPending?"Salvando...":"Registrar movimentação"}</Button></div></SheetContent></Sheet>;
}
