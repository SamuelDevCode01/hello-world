import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Gift, MessageCircle, Play, ReceiptText, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SeletorCliente } from "@/components/clientes/seletor-cliente";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  temConflito, useAlterarStatus, useExcluirAgendamento, useSalvarAgendamento, type Agendamento,
} from "@/hooks/use-agendamentos";
import { useConcluirComPacote, useConcluirComRecebimento } from "@/hooks/use-finalizar-atendimento";
import { useClientePacotes, useComandas } from "@/hooks/use-operacao-leituras";
import { useCriarComanda, useTemplates, whatsappUrl } from "@/hooks/use-operacao";
import { useServicos } from "@/hooks/use-servicos";
import { formatarDuracao, horaCurta, somarMinutos } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { STATUS_CLASSE, STATUS_LABEL, type StatusAgendamento } from "@/lib/status";
import { cn } from "@/lib/utils";

type Props = {
  aberto: boolean; onOpenChange: (v: boolean) => void; agendamento: Agendamento | null;
  dataInicial: string; horaInicial: string; agendamentosDoDia: Agendamento[];
};

export function SheetAgendamento({aberto,onOpenChange,agendamento,dataInicial,horaInicial,agendamentosDoDia}:Props) {
  const navigate = useNavigate();
  const editando=Boolean(agendamento); const {data:servicos=[]}=useServicos(true); const salvar=useSalvarAgendamento(); const alterarStatus=useAlterarStatus(); const excluir=useExcluirAgendamento();
  const concluirReceber=useConcluirComRecebimento(); const concluirPacote=useConcluirComPacote(); const criarComanda=useCriarComanda(); const {data:comandas=[]}=useComandas();
  const [clienteId,setClienteId]=useState<string|null>(null); const [servicoId,setServicoId]=useState<string|null>(null); const [data,setData]=useState(dataInicial); const [inicio,setInicio]=useState(horaInicial); const [fim,setFim]=useState(""); const [fimManual,setFimManual]=useState(false); const [observacoes,setObservacoes]=useState("");
  const {data:clientePacotes=[]}=useClientePacotes(clienteId??undefined); const {data:templates=[]}=useTemplates();

  useEffect(()=>{if(!aberto)return;if(agendamento){setClienteId(agendamento.cliente_id);setServicoId(agendamento.servico_id);setData(agendamento.data);setInicio(horaCurta(agendamento.hora_inicio));setFim(horaCurta(agendamento.hora_fim));setFimManual(true);setObservacoes(agendamento.observacoes??"");}else{setClienteId(null);setServicoId(null);setData(dataInicial);setInicio(horaInicial);setFim("");setFimManual(false);setObservacoes("");}},[aberto,agendamento,dataInicial,horaInicial]);
  const servico=servicos.find(s=>s.id===servicoId)??null;
  useEffect(()=>{if(fimManual||!servico||!inicio)return;setFim(somarMinutos(inicio,servico.duracao_minutos));},[servico,inicio,fimManual]);
  const conflito=useMemo(()=>!data||!inicio||!fim?false:temConflito(agendamentosDoDia,{data,hora_inicio:inicio,hora_fim:fim,...(agendamento?{id:agendamento.id}:{})}),[agendamentosDoDia,data,inicio,fim,agendamento]);

  const pacoteDisponivel=useMemo(()=>{
    if(!servicoId)return null;
    const hoje=new Date().toISOString().slice(0,10);
    for(const cp of clientePacotes as any[]){
      if(cp.status!=="ativo"||cp.data_validade<hoje)continue;
      const item=(cp.pacotes?.pacote_itens??[]).find((i:any)=>i.servico_id===servicoId);
      if(!item)continue;
      const usado=(cp.cliente_pacote_usos??[]).filter((u:any)=>u.servico_id===servicoId).reduce((s:number,u:any)=>s+Number(u.quantidade),0);
      if(Number(item.quantidade)>usado)return {id:cp.id,nome:cp.pacotes?.nome??"Pacote",restante:Number(item.quantidade)-usado};
    }
    return null;
  },[clientePacotes,servicoId]);

  async function onSalvar(){if(!clienteId){toast.error("Escolha a cliente.");return;}if(!servicoId){toast.error("Escolha o serviço.");return;}if(!fim){toast.error("Informe o horário final.");return;}try{await salvar.mutateAsync({...(agendamento?{id:agendamento.id}:{}),dados:{cliente_id:clienteId,servico_id:servicoId,data,hora_inicio:inicio,hora_fim:fim,observacoes:observacoes.trim()||null}});toast.success(editando?"Agendamento atualizado.":"Agendamento criado.");onOpenChange(false);}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível salvar.");}}
  async function mudarStatus(status:StatusAgendamento){if(!agendamento)return;try{await alterarStatus.mutateAsync({id:agendamento.id,status});toast.success(`Agendamento marcado como ${STATUS_LABEL[status].toLowerCase()}.`);onOpenChange(false);}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível atualizar.");}}
  async function abrirAtendimento(){
    if(!agendamento||!agendamento.servicos)return;
    try{
      const existente=comandas.find(c=>c.agendamento_id===agendamento.id&&c.status!=="cancelada");
      if(!existente){
        await criarComanda.mutateAsync({clienteId:agendamento.cliente_id,agendamentoId:agendamento.id,servico:{id:agendamento.servicos.id,nome:agendamento.servicos.nome,preco:Number(agendamento.servicos.preco)}});
        toast.success("Atendimento aberto. Você já pode adicionar serviços, produtos e observações.");
      }
      onOpenChange(false);
      await navigate({to:"/comandas"});
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível abrir o atendimento.");}
  }
  async function finalizarRecebimento(){if(!agendamento)return;try{await concluirReceber.mutateAsync(agendamento.id);toast.success("Atendimento concluído. Registre o pagamento para fechar.");onOpenChange(false);await navigate({to:"/comandas"});}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível finalizar o atendimento.");}}
  async function finalizarPacote(){if(!agendamento||!pacoteDisponivel)return;try{await concluirPacote.mutateAsync({agendamentoId:agendamento.id,clientePacoteId:pacoteDisponivel.id});toast.success(`Atendimento concluído usando ${pacoteDisponivel.nome}.`);onOpenChange(false);}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível consumir o pacote.");}}
  async function onExcluir(){if(!agendamento)return;try{await excluir.mutateAsync(agendamento.id);toast.success("Agendamento excluído.");onOpenChange(false);}catch{toast.error("Não foi possível excluir.");}}

  const contato=agendamento?.clientes?.whatsapp||agendamento?.clientes?.telefone;
  function montarMensagem(tipo:"confirmacao"|"lembrete"|"pos_atendimento",fallback:string){
    const modelo=templates.find(t=>t.tipo===tipo&&t.ativo)?.mensagem??fallback;
    return modelo
      .replaceAll("{nome}",agendamento?.clientes?.nome??"")
      .replaceAll("{servico}",agendamento?.servicos?.nome??"")
      .replaceAll("{data}",agendamento?new Date(`${agendamento.data}T12:00:00`).toLocaleDateString("pt-BR"):"")
      .replaceAll("{hora}",agendamento?horaCurta(agendamento.hora_inicio):"");
  }
  const mensagemConfirmacao=montarMensagem("confirmacao","Olá, {nome}! Passando para confirmar seu horário em {data} às {hora} para {servico}.");
  const mensagemLembrete=montarMensagem("lembrete","Olá, {nome}! Lembrando do seu horário em {data} às {hora} para {servico}.");
  const mensagemPos=montarMensagem("pos_atendimento","Olá, {nome}! Foi um prazer te atender hoje. Se precisar de algo sobre seu {servico}, estou por aqui 💛");

  return <Sheet open={aberto} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>{editando?"Detalhes do agendamento":"Novo agendamento"}</SheetTitle><SheetDescription>{editando?"Atualize os dados ou avance o atendimento.":"Escolha a cliente, o serviço e o horário."}</SheetDescription></SheetHeader>
    <div className="space-y-5 px-5 pb-8 pt-2">
      {editando&&agendamento&&<div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium",STATUS_CLASSE[agendamento.status])}>{STATUS_LABEL[agendamento.status]}</span>{agendamento.servicos&&<span className="text-xs text-muted-foreground">{formatarMoeda(agendamento.servicos.preco)}</span>}{pacoteDisponivel&&<span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><Gift className="mr-1 inline size-3"/>{pacoteDisponivel.nome}: {pacoteDisponivel.restante} disponível</span>}</div>}
      <div className="space-y-2"><Label>Cliente</Label><SeletorCliente valor={clienteId} onChange={setClienteId}/></div>
      <div className="space-y-2"><Label>Serviço</Label><Select value={servicoId??""} onValueChange={v=>{setServicoId(v);setFimManual(false)}}><SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="Escolha o serviço"/></SelectTrigger><SelectContent className="rounded-xl">{servicos.length===0&&<div className="px-3 py-4 text-sm text-muted-foreground">Cadastre um serviço primeiro.</div>}{servicos.map(s=><SelectItem key={s.id} value={s.id}><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{backgroundColor:s.cor}}/>{s.nome} · {formatarDuracao(s.duracao_minutos)} · {formatarMoeda(s.preco)}</span></SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3"><div className="col-span-2 space-y-2"><Label htmlFor="data">Data</Label><Input id="data" type="date" value={data} onChange={e=>setData(e.target.value)} className="h-12 rounded-xl"/></div><div className="space-y-2"><Label htmlFor="inicio">Início</Label><Input id="inicio" type="time" value={inicio} onChange={e=>{setInicio(e.target.value);setFimManual(false)}} className="h-12 rounded-xl"/></div><div className="space-y-2"><Label htmlFor="fim">Término</Label><Input id="fim" type="time" value={fim} onChange={e=>{setFim(e.target.value);setFimManual(true)}} className="h-12 rounded-xl"/></div></div>
      {conflito&&<div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning"/><p>Já existe um atendimento nesse horário. Ajuste o horário antes de salvar.</p></div>}
      <div className="space-y-2"><Label htmlFor="obs">Observações</Label><Textarea id="obs" value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Preferências, alergias, detalhes do atendimento..." className="min-h-20 rounded-xl"/></div>
      <Button className="h-12 w-full rounded-xl" onClick={()=>void onSalvar()} disabled={salvar.isPending||conflito}>{salvar.isPending?"Salvando...":editando?"Salvar alterações":"Criar agendamento"}</Button>

      {editando&&agendamento&&<div className="space-y-3 border-t border-border pt-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações rápidas</p>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={()=>void mudarStatus("confirmado")} disabled={agendamento.status==="confirmado"}><Check className="size-4"/> Confirmar</Button><Button variant="outline" className="h-11 rounded-xl" onClick={()=>void mudarStatus("em_atendimento")} disabled={agendamento.status==="em_atendimento"}><Play className="size-4"/> Iniciar</Button></div>
        {agendamento.status==="em_atendimento"&&<Button variant="outline" className="h-11 w-full rounded-xl" onClick={()=>void abrirAtendimento()} disabled={criarComanda.isPending}><ReceiptText className="size-4"/> Abrir atendimento / adicionar extras</Button>}
        {agendamento.status!=="concluido"&&<div className="space-y-2">{pacoteDisponivel&&<Button variant="outline" className="h-11 w-full rounded-xl border-success/40 text-success" onClick={()=>void finalizarPacote()} disabled={concluirPacote.isPending}><Gift className="size-4"/> Concluir usando {pacoteDisponivel.nome}</Button>}<Button className="h-11 w-full rounded-xl" onClick={()=>void finalizarRecebimento()} disabled={concluirReceber.isPending}><ReceiptText className="size-4"/> Concluir e receber</Button></div>}
        {contato&&<div className="grid grid-cols-2 gap-2"><Button asChild variant="outline" className="h-11 rounded-xl"><a href={whatsappUrl(contato,mensagemConfirmacao)} target="_blank" rel="noreferrer"><MessageCircle className="size-4"/> Confirmar</a></Button><Button asChild variant="outline" className="h-11 rounded-xl"><a href={whatsappUrl(contato,agendamento.status==="concluido"?mensagemPos:mensagemLembrete)} target="_blank" rel="noreferrer"><MessageCircle className="size-4"/> {agendamento.status==="concluido"?"Pós-atendimento":"Lembrete"}</a></Button></div>}
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={()=>void mudarStatus("nao_compareceu")} disabled={agendamento.status==="nao_compareceu"}><X className="size-4"/> Não veio</Button>{!contato&&<Button variant="outline" className="h-11 rounded-xl" disabled><MessageCircle className="size-4"/> Sem WhatsApp</Button>}</div>
        <div className="grid grid-cols-2 gap-2"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="h-11 rounded-xl text-destructive">Cancelar</Button></AlertDialogTrigger><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle><AlertDialogDescription>O horário volta a ficar livre na agenda.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel><AlertDialogAction className="rounded-xl" onClick={()=>void mudarStatus("cancelado")}>Cancelar agendamento</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="h-11 rounded-xl text-muted-foreground"><Trash2 className="size-4"/> Excluir</Button></AlertDialogTrigger><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel><AlertDialogAction className="rounded-xl" onClick={()=>void onExcluir()}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
      </div>}
    </div>
  </SheetContent></Sheet>;
}
