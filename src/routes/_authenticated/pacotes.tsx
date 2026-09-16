import { createFileRoute } from "@tanstack/react-router";
import { Gift, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useClientes } from "@/hooks/use-clientes";
import { usePacotes } from "@/hooks/use-operacao-leituras";
import { useComprarPacote, useSalvarPacote, type Pacote } from "@/hooks/use-operacao";
import { useServicos } from "@/hooks/use-servicos";
import { formatarMoeda } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/pacotes")({
  component: PaginaPacotes,
  head: () => ({ meta: [{ title: "Pacotes | Agenda do Salão" }] }),
});

type ItemDraft = { servico_id: string; quantidade: number };

function PaginaPacotes() {
  const { data: pacotes = [], isLoading, isError } = usePacotes();
  const [editando,setEditando] = useState<Pacote|null>(null);
  const [aberto,setAberto] = useState(false);
  const [vendendo,setVendendo] = useState<Pacote|null>(null);
  return <div className="space-y-5">
    <header className="flex items-center justify-between gap-3"><div><h1 className="font-display text-2xl">Pacotes</h1><p className="text-sm text-muted-foreground">Combos de serviços com validade e saldo.</p></div><Button className="rounded-xl" onClick={()=>{setEditando(null);setAberto(true)}}><Plus className="size-4"/> Novo</Button></header>
    {isLoading?<div className="card-elegante px-5 py-8 text-center text-sm text-muted-foreground">Carregando pacotes...</div>:isError?<div className="card-elegante px-5 py-8 text-center text-sm text-destructive">Não foi possível carregar os pacotes. Atualize a página e tente novamente.</div>:pacotes.length===0?<div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><Gift className="size-8 text-muted-foreground"/><p className="text-sm text-muted-foreground">Nenhum pacote cadastrado.</p><Button variant="outline" className="rounded-xl" onClick={()=>setAberto(true)}>Criar primeiro pacote</Button></div>:<div className="space-y-2">{pacotes.map(p=><div key={p.id} className="card-elegante flex items-center gap-3 px-4 py-4"><button className="min-w-0 flex-1 text-left" onClick={()=>{setEditando(p);setAberto(true)}}><span className="block font-medium">{p.nome}</span><span className="block text-xs text-muted-foreground">{p.pacote_itens?.map(i=>`${i.quantidade}× ${i.servicos?.nome??"Serviço"}`).join(" · ") || "Sem itens"} · {p.validade_dias} dias</span></button><div className="text-right"><p className="font-medium">{formatarMoeda(p.preco)}</p><Button size="sm" variant="outline" className="mt-1 rounded-xl" onClick={()=>setVendendo(p)}><ShoppingBag className="size-3.5"/> Vender</Button></div></div>)}</div>}
    <SheetPacote aberto={aberto} onOpenChange={setAberto} pacote={editando}/>
    <SheetVenda pacote={vendendo} onOpenChange={(v)=>!v&&setVendendo(null)}/>
  </div>;
}

function SheetPacote({aberto,onOpenChange,pacote}:{aberto:boolean;onOpenChange:(v:boolean)=>void;pacote:Pacote|null}) {
  const {data:servicos=[]}=useServicos(true); const salvar=useSalvarPacote();
  const [nome,setNome]=useState(""); const [descricao,setDescricao]=useState(""); const [preco,setPreco]=useState("0"); const [validade,setValidade]=useState("90"); const [ativo,setAtivo]=useState(true); const [itens,setItens]=useState<ItemDraft[]>([]);
  useEffect(()=>{if(!aberto)return;setNome(pacote?.nome??"");setDescricao(pacote?.descricao??"");setPreco(String(pacote?.preco??0));setValidade(String(pacote?.validade_dias??90));setAtivo(pacote?.ativo??true);setItens((pacote?.pacote_itens??[]).map(i=>({servico_id:i.servico_id,quantidade:i.quantidade})));},[aberto,pacote]);
  function toggle(servicoId:string){setItens(a=>a.some(i=>i.servico_id===servicoId)?a.filter(i=>i.servico_id!==servicoId):[...a,{servico_id:servicoId,quantidade:1}]);}
  function qtd(servicoId:string,q:number){setItens(a=>a.map(i=>i.servico_id===servicoId?{...i,quantidade:Math.max(1,q)}:i));}
  async function enviar(){if(nome.trim().length<2){toast.error("Informe o nome do pacote.");return;}if(itens.length===0){toast.error("Escolha ao menos um serviço.");return;}try{await salvar.mutateAsync({...(pacote?{id:pacote.id}:{}),dados:{nome:nome.trim(),descricao:descricao.trim()||null,preco:Number(preco),validade_dias:Number(validade),ativo},itens});toast.success(pacote?"Pacote atualizado.":"Pacote criado.");onOpenChange(false);}catch{toast.error("Não foi possível salvar o pacote.");}}
  return <Sheet open={aberto} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>{pacote?"Editar pacote":"Novo pacote"}</SheetTitle><SheetDescription>Defina os serviços incluídos e a validade.</SheetDescription></SheetHeader><div className="space-y-4 px-5 pb-8 pt-3"><div className="space-y-2"><Label>Nome</Label><Input className="h-12 rounded-xl" value={nome} onChange={e=>setNome(e.target.value)}/></div><div className="space-y-2"><Label>Descrição</Label><Textarea className="rounded-xl" value={descricao} onChange={e=>setDescricao(e.target.value)}/></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" min="0" className="h-12 rounded-xl" value={preco} onChange={e=>setPreco(e.target.value)}/></div><div className="space-y-2"><Label>Validade (dias)</Label><Input type="number" min="1" className="h-12 rounded-xl" value={validade} onChange={e=>setValidade(e.target.value)}/></div></div><div className="space-y-2"><Label>Serviços incluídos</Label>{servicos.map(s=>{const item=itens.find(i=>i.servico_id===s.id);return <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3"><button type="button" className={`size-5 rounded border ${item?"bg-primary border-primary":""}`} onClick={()=>toggle(s.id)} aria-label={`Selecionar ${s.nome}`}/><span className="min-w-0 flex-1 text-sm">{s.nome}</span>{item&&<Input type="number" min="1" className="h-9 w-20 rounded-lg" value={item.quantidade} onChange={e=>qtd(s.id,Number(e.target.value))}/>}</div>})}</div><div className="flex items-center justify-between rounded-xl border p-4"><Label>Pacote ativo</Label><Switch checked={ativo} onCheckedChange={setAtivo}/></div><Button className="h-12 w-full rounded-xl" onClick={()=>void enviar()} disabled={salvar.isPending}>{salvar.isPending?"Salvando...":"Salvar pacote"}</Button></div></SheetContent></Sheet>;
}

function SheetVenda({pacote,onOpenChange}:{pacote:Pacote|null;onOpenChange:(v:boolean)=>void}) {
  const {data:clientes=[]}=useClientes(); const comprar=useComprarPacote(); const [clienteId,setClienteId]=useState("");
  async function vender(){if(!pacote||!clienteId){toast.error("Escolha a cliente.");return;}try{await comprar.mutateAsync({clienteId,pacote});toast.success("Pacote vinculado à cliente.");onOpenChange(false);setClienteId("");}catch{toast.error("Não foi possível registrar a compra do pacote.");}}
  return <Sheet open={Boolean(pacote)} onOpenChange={onOpenChange}><SheetContent side="bottom" className="rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>Vender {pacote?.nome}</SheetTitle><SheetDescription>{pacote&&formatarMoeda(pacote.preco)} · validade de {pacote?.validade_dias} dias</SheetDescription></SheetHeader><div className="space-y-4 px-5 pb-8 pt-3"><div className="space-y-2"><Label>Cliente</Label><Select value={clienteId} onValueChange={setClienteId}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Escolha a cliente"/></SelectTrigger><SelectContent>{clientes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div><Button className="h-12 w-full rounded-xl" onClick={()=>void vender()} disabled={comprar.isPending}>Registrar compra</Button></div></SheetContent></Sheet>;
}
