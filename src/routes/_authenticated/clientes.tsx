import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, MessageCircle, Plus, RotateCcw, Search, UserRound } from "lucide-react";
import { useState } from "react";

import { SheetCliente } from "@/components/clientes/sheet-cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientesResumo, type ClienteResumo } from "@/hooks/use-clientes-resumo";
import type { Cliente } from "@/hooks/use-clientes";
import { formatarTelefone, iniciais } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: PaginaClientes,
  head: () => ({ meta: [{ title: "Clientes do salão | Cadastro, histórico e retorno" }, { name: "description", content: "Busque clientes, veja contatos, observações, último atendimento, próximo agendamento e retorno recomendado." }] }),
});

function pt(data:string|null){return data?new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR"):null}
function paraCliente(c:ClienteResumo):Cliente{return {id:c.id,salao_id:c.salao_id,nome:c.nome,telefone:c.telefone,whatsapp:c.whatsapp,data_nascimento:c.data_nascimento,observacoes:c.observacoes,foto_path:c.foto_path,created_at:"",updated_at:""} as Cliente}
function retornoLabel(data:string|null){if(!data)return null;const hoje=new Date();hoje.setHours(0,0,0,0);const alvo=new Date(`${data}T00:00:00`);const dias=Math.round((+alvo-+hoje)/86400000);if(dias<0)return `Retorno atrasado ${Math.abs(dias)}d`;if(dias===0)return "Retorno hoje";if(dias<=7)return `Retorno em ${dias}d`;return `Retorno ${pt(data)}`}

function DadosCompactos({c}:{c:ClienteResumo}){
  const itens:string[]=[];
  if(c.whatsapp)itens.push(`WhatsApp ${formatarTelefone(c.whatsapp)}`);
  if(c.telefone&&c.telefone!==c.whatsapp)itens.push(formatarTelefone(c.telefone));
  if(!itens.length)itens.push("Sem telefone");
  return <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><MessageCircle className="size-3 shrink-0"/><span className="truncate">{itens.join(" · ")}</span></div>;
}

function PaginaClientes(){
  const [busca,setBusca]=useState(""); const [aberto,setAberto]=useState(false); const [editando,setEditando]=useState<Cliente|null>(null); const {data:clientes=[],isLoading}=useClientesResumo(busca);
  function abrir(c:ClienteResumo|null){setEditando(c?paraCliente(c):null);setAberto(true)}
  return <div className="space-y-5">
    <header className="flex items-center justify-between gap-3"><div><h1 className="font-display text-2xl">Clientes</h1><p className="text-sm text-muted-foreground">Cadastro, contatos, histórico e próximos retornos.</p></div><Button className="rounded-xl" onClick={()=>abrir(null)}><Plus className="size-4"/> Nova</Button></header>
    <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou WhatsApp" className="h-12 rounded-xl pl-9"/></div>
    {isLoading?<div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-24 w-full rounded-xl"/>)}</div>:clientes.length===0?<div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><UserRound className="size-8 text-muted-foreground"/><p className="text-sm text-muted-foreground">{busca?"Nenhuma cliente encontrada.":"Você ainda não cadastrou nenhuma cliente."}</p><Button variant="outline" className="rounded-xl" onClick={()=>abrir(null)}>Cadastrar primeira cliente</Button></div>:<ul className="space-y-2">{clientes.map(c=>{const ret=retornoLabel(c.retorno_previsto);return <li key={c.id}><button type="button" onClick={()=>abrir(c)} className="card-elegante flex w-full items-center gap-3 px-4 py-3 text-left transition-shadow hover:shadow-[0_6px_20px_rgba(41,37,36,0.08)]">
      {c.foto_url?<img src={c.foto_url} alt="" className="size-12 shrink-0 rounded-full border border-border object-cover"/>:<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">{iniciais(c.nome)}</span>}
      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.nome}</span><DadosCompactos c={c}/>{c.observacoes&&<span className="mt-1 block truncate text-[11px] text-muted-foreground/80">{c.observacoes}</span>}<span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">{c.ultimo_atendimento&&<span>Último: {pt(c.ultimo_atendimento)}</span>}{c.proximo_agendamento&&<span className="inline-flex items-center gap-1"><CalendarClock className="size-3"/> Próximo: {pt(c.proximo_agendamento)}</span>}{ret&&<span className="inline-flex items-center gap-1 text-warning"><RotateCcw className="size-3"/> {ret}</span>}</span></span>
    </button></li>})}</ul>}
    <SheetCliente aberto={aberto} onOpenChange={setAberto} cliente={editando}/>
  </div>
}
