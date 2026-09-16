import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, BadgeCheck, Ban, CheckCircle2, CircleDollarSign, MessageCircle, Plus, ReceiptText, Save, Trash2, UserRound, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientes, useFotoCliente } from "@/hooks/use-clientes";
import { useAtualizarComanda, useCancelarComanda, useRemoverItemComanda, useRemoverPagamento } from "@/hooks/use-comanda-acoes";
import { useComandas, usePacotes } from "@/hooks/use-operacao-leituras";
import { useAdicionarItemComanda, useAdicionarPagamento, useCriarComanda, useFecharComanda, useProdutos, whatsappUrl, type Comanda } from "@/hooks/use-operacao";
import { useServicos } from "@/hooks/use-servicos";
import { formatarMoeda, iniciais } from "@/lib/formato";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/comandas")({
  component: PaginaCaixa,
  head: () => ({ meta: [{ title: "Caixa | Agenda do Salão" }] }),
});

type ClienteCaixa = {
  id?: string;
  nome: string;
  telefone?: string | null;
  whatsapp?: string | null;
  observacoes?: string | null;
  foto_path?: string | null;
};

function pagoDaComanda(c: Comanda) {
  return (c.pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);
}

function faltaDaComanda(c: Comanda) {
  return Math.max(0, Number(c.total ?? 0) - pagoDaComanda(c));
}

function PaginaCaixa(){
  const {data:comandas=[],isLoading,isError}=useComandas();
  const {data:clientes=[]}=useClientes();
  const criar=useCriarComanda();
  const [clienteId,setClienteId]=useState("");
  const [aberta,setAberta]=useState<Comanda|null>(null);
  const [aba,setAba]=useState("pendentes");

  const pendentes=useMemo(()=>comandas.filter(c=>c.status==="aberta"),[comandas]);
  const encerradas=useMemo(()=>comandas.filter(c=>c.status!=="aberta"),[comandas]);
  const totalPendente=useMemo(()=>pendentes.reduce((s,c)=>s+faltaDaComanda(c),0),[pendentes]);

  async function nova(){
    if(!clienteId){toast.error("Escolha a cliente.");return;}
    try{
      await criar.mutateAsync({clienteId});
      setClienteId("");
      setAba("pendentes");
      toast.success("Atendimento aberto. Ele já está em Pendentes para você lançar os itens e receber.");
    }catch{toast.error("Não foi possível abrir o atendimento.");}
  }

  return <div className="space-y-5">
    <header className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CircleDollarSign className="size-5"/></span><h1 className="font-display text-2xl">Caixa</h1></div><p className="mt-1 text-sm text-muted-foreground">Finalize atendimentos, registre pagamentos e acompanhe as vendas do salão.</p></div></header>

    {pendentes.length>0&&<div className="rounded-2xl border border-warning/30 bg-warning/10 p-4"><div className="flex items-start gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning"><AlertCircle className="size-5"/></span><div className="min-w-0 flex-1"><p className="font-semibold">{pendentes.length} atendimento{pendentes.length===1?"":"s"} aguardando fechamento</p><p className="mt-0.5 text-sm text-muted-foreground">Abra o atendimento, confira os itens, registre o recebimento e encerre a venda. {totalPendente>0&&<>Ainda há <strong className="text-foreground">{formatarMoeda(totalPendente)}</strong> a receber.</>}</p></div></div></div>}

    <div className="card-elegante space-y-3 p-4"><div><Label>Abrir atendimento avulso</Label><p className="mt-1 text-xs text-muted-foreground">Use quando a cliente não veio por um agendamento existente.</p></div><div className="flex gap-2"><Select value={clienteId} onValueChange={setClienteId}><SelectTrigger className="h-12 flex-1 rounded-xl"><SelectValue placeholder="Escolha a cliente"/></SelectTrigger><SelectContent>{clientes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select><Button className="h-12 rounded-xl" onClick={()=>void nova()} disabled={criar.isPending}><Plus className="size-4"/> Abrir</Button></div></div>

    {isLoading?<div className="card-elegante px-5 py-8 text-center text-sm text-muted-foreground">Carregando o caixa...</div>:isError?<div className="card-elegante px-5 py-8 text-center text-sm text-destructive">Não foi possível carregar o caixa. Atualize a página e tente novamente.</div>:<Tabs value={aba} onValueChange={setAba} className="space-y-4"><TabsList className="grid w-full grid-cols-2 rounded-xl"><TabsTrigger value="pendentes" className="rounded-lg">Pendentes {pendentes.length>0&&<span className="ml-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">{pendentes.length}</span>}</TabsTrigger><TabsTrigger value="encerradas" className="rounded-lg">Finalizados <span className="ml-1 text-[10px] text-muted-foreground">{encerradas.length}</span></TabsTrigger></TabsList>
      <TabsContent value="pendentes" className="mt-0 space-y-2">{pendentes.length===0?<div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><BadgeCheck className="size-9 text-success"/><div><p className="font-medium">Caixa em dia</p><p className="mt-1 text-sm text-muted-foreground">Nenhum atendimento aguardando pagamento ou encerramento.</p></div></div>:pendentes.map(c=><CardCaixa key={c.id} comanda={c} onClick={()=>setAberta(c)}/>)}</TabsContent>
      <TabsContent value="encerradas" className="mt-0 space-y-2">{encerradas.length===0?<div className="card-elegante px-6 py-10 text-center text-sm text-muted-foreground">Nenhuma venda finalizada ainda.</div>:encerradas.map(c=><CardCaixa key={c.id} comanda={c} onClick={()=>setAberta(c)}/>)}</TabsContent>
    </Tabs>}

    <SheetCaixa comanda={aberta} onOpenChange={v=>!v&&setAberta(null)}/>
  </div>;
}

function CardCaixa({comanda,onClick}:{comanda:Comanda;onClick:()=>void}){
  const cliente=(comanda.clientes??null) as ClienteCaixa|null;
  const pago=pagoDaComanda(comanda);
  const falta=faltaDaComanda(comanda);
  const aberta=comanda.status==="aberta";
  const fechada=comanda.status==="fechada";
  return <button onClick={onClick} className={cn("w-full rounded-2xl border px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",aberta&&"border-warning/30 bg-warning/[0.07]",fechada&&"border-success/25 bg-success/[0.05]",comanda.status==="cancelada"&&"border-destructive/15 bg-destructive/[0.03]")}>
    <div className="flex items-start gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",aberta?"bg-warning/15 text-warning":fechada?"bg-success/15 text-success":"bg-muted text-muted-foreground")}>{iniciais(cliente?.nome??"Cliente")}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold">{cliente?.nome??"Cliente"}</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",aberta?"bg-warning/15 text-warning":fechada?"bg-success/15 text-success":"bg-destructive/10 text-destructive")}>{aberta?falta<=0.009?"Pago · falta encerrar":"Aguardando pagamento":fechada?"Finalizado":"Cancelado"}</span></span><span className="mt-1 block text-xs text-muted-foreground">{new Date(comanda.opened_at).toLocaleString("pt-BR")} · {(comanda.comanda_itens??[]).length} item{(comanda.comanda_itens??[]).length===1?"":"s"}</span>{aberta&&<span className="mt-1 block text-xs">{falta>0.009?<><span className="text-muted-foreground">Pago {formatarMoeda(pago)} · </span><strong className="text-warning">Falta {formatarMoeda(falta)}</strong></>:<strong className="text-success">Pagamento completo — encerre a venda</strong>}</span>}</span><span className="text-right"><strong className="block text-base">{formatarMoeda(Number(comanda.total))}</strong><span className="mt-1 block text-xs text-muted-foreground">Abrir detalhes</span></span></div>
  </button>
}

function SheetCaixa({comanda,onOpenChange}:{comanda:Comanda|null;onOpenChange:(v:boolean)=>void}){
  const {data:lista=[]}=useComandas();
  const atual=lista.find(c=>c.id===comanda?.id)??comanda;
  const {data:servicos=[]}=useServicos(true);
  const {data:produtos=[]}=useProdutos();
  const {data:pacotes=[]}=usePacotes();
  const cliente=(atual?.clientes??null) as ClienteCaixa|null;
  const {data:fotoCliente}=useFotoCliente(cliente?.foto_path);

  const addItem=useAdicionarItemComanda();
  const addPag=useAdicionarPagamento();
  const fechar=useFecharComanda();
  const atualizar=useAtualizarComanda();
  const removerPag=useRemoverPagamento();
  const removerItem=useRemoverItemComanda();
  const cancelar=useCancelarComanda();

  const [opcaoServico,setOpcaoServico]=useState("");
  const [produtoId,setProdutoId]=useState("");
  const [forma,setForma]=useState("pix");
  const [valor,setValor]=useState("");
  const [desconto,setDesconto]=useState("0");
  const [observacoes,setObservacoes]=useState("");
  const [mostrarCliente,setMostrarCliente]=useState(false);

  const pago=useMemo(()=>atual?.pagamentos?.reduce((s,p)=>s+Number(p.valor),0)??0,[atual]);
  const falta=Math.max(0,Number(atual?.total??0)-pago);

  useEffect(()=>{
    if(!atual)return;
    setDesconto(String(atual.desconto??0));
    setObservacoes(atual.observacoes??"");
    setMostrarCliente(false);
  },[atual?.id,atual?.desconto,atual?.observacoes]);

  useEffect(()=>{
    if(!atual||atual.status!=="aberta")return;
    setValor(falta>0.009?falta.toFixed(2):"0.00");
  },[atual?.id,atual?.total,pago]);

  if(!atual)return null;
  const editavel=atual.status==="aberta";

  async function adicionarServicoOuCombo(){
    if(!opcaoServico)return;
    try{
      if(opcaoServico.startsWith("servico:")){
        const id=opcaoServico.slice("servico:".length);
        const s=servicos.find(x=>x.id===id);
        if(!s)return;
        await addItem.mutateAsync({comanda_id:atual.id,tipo:"servico",servico_id:s.id,produto_id:null,descricao:s.nome,quantidade:1,valor_unitario:Number(s.preco)});
        toast.success("Serviço adicionado à venda.");
      }else if(opcaoServico.startsWith("pacote:")){
        const id=opcaoServico.slice("pacote:".length);
        const pacote=pacotes.find(p=>p.id===id);
        if(!pacote)return;
        const itens=((pacote.pacote_itens??[]) as any[]).filter(i=>i.servico_id);
        if(itens.length===0){toast.error("Esse combo não possui serviços cadastrados.");return;}
        const detalhados=itens.map(i=>{
          const servico=servicos.find(s=>s.id===i.servico_id);
          const quantidade=Math.max(1,Number(i.quantidade)||1);
          const precoBase=Number(servico?.preco??i.servicos?.preco??0);
          return {item:i,servico,quantidade,base:precoBase*quantidade};
        });
        const somaBase=detalhados.reduce((s,i)=>s+i.base,0);
        let alocado=0;
        for(let index=0;index<detalhados.length;index++){
          const d=detalhados[index]!;
          let totalLinha=index===detalhados.length-1?Number(pacote.preco)-alocado:somaBase>0?Number(pacote.preco)*(d.base/somaBase):index===0?Number(pacote.preco):0;
          totalLinha=Math.max(0,Number(totalLinha.toFixed(2)));
          alocado+=totalLinha;
          const unitario=Number((totalLinha/d.quantidade).toFixed(2));
          await addItem.mutateAsync({comanda_id:atual.id,tipo:"servico",servico_id:d.item.servico_id,produto_id:null,descricao:`${pacote.nome} · ${d.servico?.nome??d.item.servicos?.nome??"Serviço"}`,quantidade:d.quantidade,valor_unitario:unitario});
        }
        toast.success(`Combo ${pacote.nome} adicionado à venda.`);
      }
      setOpcaoServico("");
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível adicionar o serviço ou combo.");}
  }

  async function addProduto(){
    if(!produtoId)return;
    const p=produtos.find(x=>x.id===produtoId);
    if(!p)return;
    try{await addItem.mutateAsync({comanda_id:atual.id,tipo:"produto",produto_id:p.id,servico_id:null,descricao:p.nome,quantidade:1,valor_unitario:Number(p.preco_venda)});setProdutoId("");toast.success("Produto adicionado à venda.");}catch{toast.error("Não foi possível adicionar o produto.");}
  }

  async function salvarAjustes(){try{await atualizar.mutateAsync({id:atual.id,desconto:Number(desconto||0),observacoes});toast.success("Desconto e observações salvos.");}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível salvar.");}}

  async function pagamento(){
    const v=Number(valor);
    if(!Number.isFinite(v)||v<=0){toast.error("Informe um valor de pagamento válido.");return;}
    if(v>falta+0.009){toast.error("O pagamento não pode ultrapassar o valor restante.");return;}
    try{await addPag.mutateAsync({comandaId:atual.id,forma,valor:v});toast.success("Recebimento registrado.");}catch{toast.error("Não foi possível registrar o recebimento.");}
  }

  async function concluir(){try{await fechar.mutateAsync(atual.id);toast.success("Venda encerrada. Pagamento e estoque foram registrados.");onOpenChange(false);}catch(e){toast.error(e instanceof Error?e.message:"Confira os pagamentos antes de encerrar.");}}
  async function cancelarAtual(){try{await cancelar.mutateAsync(atual.id);toast.success("Atendimento cancelado.");onOpenChange(false);}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível cancelar.");}}

  const contato=cliente?.whatsapp||cliente?.telefone;

  return <Sheet open={Boolean(comanda)} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[94vh] overflow-y-auto rounded-t-2xl sm:max-w-xl md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><div className="flex items-center gap-2"><SheetTitle>{cliente?.nome??"Atendimento"}</SheetTitle><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",atual.status==="aberta"?"bg-warning/15 text-warning":atual.status==="fechada"?"bg-success/15 text-success":"bg-destructive/10 text-destructive")}>{atual.status==="aberta"?"Pendente":atual.status==="fechada"?"Finalizado":"Cancelado"}</span></div><SheetDescription>{atual.status==="fechada"?"Venda encerrada e pagamento registrado.":atual.status==="cancelada"?"Este atendimento foi cancelado.":"Conclua o recebimento e encerre a venda para tirar este atendimento dos pendentes."}</SheetDescription></SheetHeader><div className="space-y-5 px-5 pb-8 pt-3">

    {editavel&&<div className={cn("rounded-2xl border p-4",falta>0.009?"border-warning/30 bg-warning/10":"border-success/30 bg-success/10")}><div className="flex items-start gap-3">{falta>0.009?<AlertCircle className="mt-0.5 size-5 shrink-0 text-warning"/>:<CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success"/>}<div><p className="font-semibold">{falta>0.009?"Atendimento concluído — finalize a venda":"Pagamento completo — falta encerrar a venda"}</p><p className="mt-1 text-sm text-muted-foreground">{falta>0.009?"Confira os itens abaixo. O valor que falta receber já aparece preenchido no campo de pagamento.":"O recebimento já está completo. Clique em “Encerrar venda” para finalizar este atendimento no caixa."}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium"><span className="rounded-full bg-background/80 px-2.5 py-1">1. Conferir itens</span><span className="rounded-full bg-background/80 px-2.5 py-1">2. Registrar recebimento</span><span className="rounded-full bg-background/80 px-2.5 py-1">3. Encerrar venda</span></div></div></div></div>}

    <div className="rounded-2xl border bg-card p-3"><button type="button" onClick={()=>setMostrarCliente(v=>!v)} className="flex w-full items-center gap-3 text-left"><span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary">{fotoCliente?<img src={fotoCliente} alt="" className="size-full object-cover"/>:iniciais(cliente?.nome??"Cliente")}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{cliente?.nome??"Cliente"}</span><span className="block truncate text-xs text-muted-foreground">{cliente?.whatsapp?`WhatsApp ${cliente.whatsapp}`:cliente?.telefone?`Telefone ${cliente.telefone}`:"Sem telefone cadastrado"}</span></span><span className="text-xs font-medium text-primary">{mostrarCliente?"Ocultar dados":"Ver dados"}</span></button>{mostrarCliente&&<div className="mt-3 grid gap-2 border-t pt-3 text-sm"><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Telefone</p><p>{cliente?.telefone||"—"}</p></div><div><p className="text-xs text-muted-foreground">WhatsApp</p><p>{cliente?.whatsapp||"—"}</p></div></div>{cliente?.observacoes&&<div><p className="text-xs text-muted-foreground">Observações da cliente</p><p className="mt-0.5 text-sm">{cliente.observacoes}</p></div>}{contato&&<Button asChild variant="outline" size="sm" className="mt-1 w-fit rounded-xl"><a href={whatsappUrl(contato,`Olá, ${cliente?.nome??""}! Tudo bem?`)} target="_blank" rel="noreferrer"><MessageCircle className="size-4"/> Abrir WhatsApp</a></Button>}</div>}</div>

    <section className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Itens da venda</h3><p className="text-xs text-muted-foreground">Serviços, combos e produtos consumidos pela cliente.</p></div><ReceiptText className="size-5 text-muted-foreground"/></div><div className="space-y-2">{(atual.comanda_itens??[]).length===0?<p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum item ainda.</p>:atual.comanda_itens?.map(i=><div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.descricao}</p><p className="text-xs text-muted-foreground">{Number(i.quantidade)} × {formatarMoeda(Number(i.valor_unitario))}</p></div><strong>{formatarMoeda(Number(i.total))}</strong>{editavel&&<Button size="icon" variant="ghost" className="size-8 rounded-lg text-destructive" onClick={()=>void removerItem.mutateAsync(i.id)}><Trash2 className="size-3.5"/></Button>}</div>)}</div></section>

    {editavel&&<div className="rounded-2xl border bg-muted/20 p-3"><p className="mb-3 text-sm font-semibold">Adicionar à venda</p><div className="grid gap-2 sm:grid-cols-2"><div className="flex gap-2"><Select value={opcaoServico} onValueChange={setOpcaoServico}><SelectTrigger className="h-11 flex-1 rounded-xl"><SelectValue placeholder="Serviço ou combo"/></SelectTrigger><SelectContent><div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Serviços</div>{servicos.map(s=><SelectItem key={s.id} value={`servico:${s.id}`}>{s.nome} · {formatarMoeda(Number(s.preco))}</SelectItem>)}{pacotes.filter(p=>p.ativo).length>0&&<div className="mt-1 border-t px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Combos / pacotes</div>}{pacotes.filter(p=>p.ativo).map(p=><SelectItem key={p.id} value={`pacote:${p.id}`}>Combo: {p.nome} · {formatarMoeda(Number(p.preco))}</SelectItem>)}</SelectContent></Select><Button size="icon" variant="outline" className="size-11 rounded-xl" disabled={!opcaoServico||addItem.isPending} onClick={()=>void adicionarServicoOuCombo()}><Plus className="size-4"/></Button></div><div className="flex gap-2"><Select value={produtoId} onValueChange={setProdutoId}><SelectTrigger className="h-11 flex-1 rounded-xl"><SelectValue placeholder="Produto"/></SelectTrigger><SelectContent>{produtos.filter(p=>p.ativo&&p.uso!=="interno").map(p=><SelectItem key={p.id} value={p.id}>{p.nome} · {formatarMoeda(Number(p.preco_venda))}</SelectItem>)}</SelectContent></Select><Button size="icon" variant="outline" className="size-11 rounded-xl" disabled={!produtoId||addItem.isPending} onClick={()=>void addProduto()}><Plus className="size-4"/></Button></div></div></div>}

    {editavel&&<div className="space-y-3 rounded-2xl border p-3"><div className="grid grid-cols-[130px_1fr] items-end gap-3"><div className="space-y-2"><Label>Desconto (R$)</Label><Input type="number" min="0" max={Number(atual.subtotal)} step="0.01" className="h-11 rounded-xl" value={desconto} onChange={e=>setDesconto(e.target.value)}/></div><div className="space-y-2"><Label>Observações da venda</Label><Input className="h-11 rounded-xl" value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Opcional"/></div></div><Button size="sm" variant="outline" className="rounded-xl" onClick={()=>void salvarAjustes()}><Save className="size-3.5"/> Aplicar alterações</Button></div>}

    <div className="rounded-2xl bg-muted/45 p-4"><div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatarMoeda(Number(atual.subtotal))}</span></div>{Number(atual.desconto)>0&&<div className="mt-1 flex justify-between text-sm text-success"><span>Desconto</span><span>- {formatarMoeda(Number(atual.desconto))}</span></div>}<div className="mt-2 flex justify-between text-xl font-semibold"><span>Total</span><span>{formatarMoeda(Number(atual.total))}</span></div><div className="mt-2 flex justify-between text-sm text-muted-foreground"><span>Recebido</span><span>{formatarMoeda(pago)}</span></div>{editavel&&<div className="mt-1 flex justify-between text-sm font-medium"><span>Restante</span><span className={falta>0.009?"text-warning":"text-success"}>{formatarMoeda(falta)}</span></div>}</div>

    {editavel&&<section className="space-y-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-4"><div><h3 className="font-semibold">Recebimento</h3><p className="mt-1 text-xs text-muted-foreground">O valor restante já vem preenchido. Só altere se a cliente for dividir o pagamento em mais de uma forma.</p></div><div className="grid grid-cols-[1fr_1fr_auto] gap-2"><Select value={forma} onValueChange={setForma}><SelectTrigger className="h-11 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pix">PIX</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="debito">Débito</SelectItem><SelectItem value="credito">Crédito</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select><Input type="number" step="0.01" min="0" className="h-11 rounded-xl font-medium" value={valor} onChange={e=>setValor(e.target.value)}/><Button className="h-11 rounded-xl" disabled={falta<=0.009||addPag.isPending} onClick={()=>void pagamento()}>Registrar</Button></div>{atual.pagamentos?.map(p=><div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2 text-sm"><span className="capitalize">{p.forma_pagamento}</span><span className="ml-auto font-medium">{formatarMoeda(Number(p.valor))}</span><Button size="icon" variant="ghost" className="size-7 rounded-lg text-destructive" onClick={()=>void removerPag.mutateAsync(p.id)}><Trash2 className="size-3.5"/></Button></div>)}{falta<=0.009&&Number(atual.total)>0&&<div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success"><CheckCircle2 className="size-4"/> Pagamento completo. Agora encerre a venda.</div>}<Button className={cn("h-12 w-full rounded-xl",falta<=0.009&&Number(atual.total)>0&&"bg-success text-white hover:bg-success/90")} disabled={falta>0.009||fechar.isPending||Number(atual.total)<=0} onClick={()=>void concluir()}><CheckCircle2 className="size-4"/>{falta>0.009?`Receba ${formatarMoeda(falta)} para encerrar`:"Encerrar venda"}</Button></section>}

    {!editavel&&<section className="space-y-2"><h3 className="font-semibold">Pagamentos registrados</h3>{!atual.pagamentos?.length?<p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>:atual.pagamentos.map(p=><div key={p.id} className="flex justify-between rounded-xl border px-3 py-2 text-sm"><span className="capitalize">{p.forma_pagamento}</span><strong>{formatarMoeda(Number(p.valor))}</strong></div>)}</section>}

    {editavel&&<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="h-11 w-full rounded-xl text-destructive"><XCircle className="size-4"/> Cancelar atendimento</Button></AlertDialogTrigger><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Cancelar este atendimento?</AlertDialogTitle><AlertDialogDescription>Os itens permanecem no histórico da venda cancelada. Se houver pagamentos registrados, remova-os primeiro.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel><AlertDialogAction className="rounded-xl" onClick={()=>void cancelarAtual()}>Cancelar atendimento</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
    {atual.status==="cancelada"&&<div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-3 text-sm text-destructive"><Ban className="size-4"/> Atendimento cancelado.</div>}
  </div></SheetContent></Sheet>;
}
