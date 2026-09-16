import { createFileRoute, Link } from "@tanstack/react-router";
import { addDays } from "date-fns";
import { CalendarPlus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { CabecalhoAgenda, type Visao } from "@/components/agenda/cabecalho-agenda";
import { GradeDia } from "@/components/agenda/grade-dia";
import { GradeSemana } from "@/components/agenda/grade-semana";
import { SheetAgendamento } from "@/components/agenda/sheet-agendamento";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalaoAtual } from "@/contexts/salao";
import { useAgendamentos, type Agendamento } from "@/hooks/use-agendamentos";
import { useResumoOperacao } from "@/hooks/use-operacao-leituras";
import { gerarSlots, horaCurta, paraDataISO, semanaDe } from "@/lib/datas";
import { formatarMoeda, saudacao } from "@/lib/formato";
import { STATUS_LIBERA_HORARIO } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: PaginaAgenda,
  head: () => ({ meta: [{ title: "Agenda do dia | Agendamentos do salão" }, { name: "description", content: "Veja e organize os atendimentos do salão por dia e por semana." }] }),
});

function PaginaAgenda() {
  const salao = useSalaoAtual();
  const { data: resumo } = useResumoOperacao();
  const [data,setData]=useState<Date>(new Date()); const [visao,setVisao]=useState<Visao>("dia"); const [sheetAberto,setSheetAberto]=useState(false); const [editando,setEditando]=useState<Agendamento|null>(null); const [horaInicial,setHoraInicial]=useState(horaCurta(salao.horario_abertura));
  const dias=useMemo(()=>semanaDe(data),[data]); const dataISO=paraDataISO(data); const inicio=visao==="dia"?dataISO:paraDataISO(dias[0]!); const fim=visao==="dia"?dataISO:paraDataISO(dias[6]!);
  const {data:agendamentos=[],isLoading}=useAgendamentos(inicio,fim);
  const slots=useMemo(()=>gerarSlots(horaCurta(salao.horario_abertura),horaCurta(salao.horario_fechamento),salao.intervalo_agenda_minutos),[salao]);
  const doDia=agendamentos.filter(a=>a.data===dataISO); const ativosDoDia=doDia.filter(a=>!STATUS_LIBERA_HORARIO.includes(a.status)); const concluidosDoDia=doDia.filter(a=>a.status==="concluido");
  function abrirNovo(hora?:string){setEditando(null);setHoraInicial(hora??horaCurta(salao.horario_abertura));setSheetAberto(true)}
  function abrirExistente(a:Agendamento){setEditando(a);setSheetAberto(true)}
  return <div className="space-y-5">
    <header className="space-y-3"><div><p className="text-sm text-muted-foreground">{saudacao()}{salao.nome_responsavel?`, ${salao.nome_responsavel.split(" ")[0]}`:""}</p><h1 className="font-display text-2xl">{salao.nome}</h1></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link to="/agenda" className="card-elegante px-3 py-3"><p className="text-[11px] text-muted-foreground">Atendimentos hoje</p><p className="mt-1 text-xl font-semibold tabular-nums">{resumo?.atendimentos??ativosDoDia.length}</p></Link>
        <div className="card-elegante px-3 py-3"><p className="text-[11px] text-muted-foreground">Previsto hoje</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatarMoeda(resumo?.previstos??0)}</p></div>
        <Link to="/retornos" className="card-elegante px-3 py-3"><p className="text-[11px] text-muted-foreground">Clientes para retornar</p><p className="mt-1 text-xl font-semibold tabular-nums text-warning">{resumo?.retornos??0}</p></Link>
        <Link to="/estoque" className="card-elegante px-3 py-3"><p className="text-[11px] text-muted-foreground">Estoque baixo</p><p className="mt-1 text-xl font-semibold tabular-nums text-destructive">{resumo?.estoqueBaixo??0}</p></Link>
      </div>
      {paraDataISO(new Date())!==dataISO&&<div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-muted/40 px-3 py-2"><p className="text-xs text-muted-foreground">Atendimentos na data</p><p className="font-semibold">{ativosDoDia.length}</p></div><div className="rounded-xl bg-muted/40 px-3 py-2"><p className="text-xs text-muted-foreground">Concluídos na data</p><p className="font-semibold text-success">{concluidosDoDia.length}</p></div></div>}
    </header>
    <CabecalhoAgenda data={data} visao={visao} onData={setData} onVisao={setVisao} onHoje={()=>setData(new Date())} onAnterior={()=>setData(d=>addDays(d,visao==="dia"?-1:-7))} onProximo={()=>setData(d=>addDays(d,visao==="dia"?1:7))}/>
    {isLoading?<div className="space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-12 w-full rounded-xl"/>)}</div>:visao==="dia"?(slots.length===0?<EstadoVazio onNovo={()=>abrirNovo()}/>:<GradeDia slots={slots} intervalo={salao.intervalo_agenda_minutos} agendamentos={doDia} onSlot={h=>abrirNovo(h)} onAbrir={abrirExistente}/>):<GradeSemana dias={dias} agendamentos={agendamentos} onDia={d=>{setData(d);setVisao("dia")}} onAbrir={abrirExistente}/>} 
    <Button onClick={()=>abrirNovo()} className="fixed bottom-24 right-5 z-40 size-14 rounded-2xl shadow-lg md:bottom-8 md:right-8" aria-label="Novo agendamento"><Plus className="size-6"/></Button>
    <SheetAgendamento aberto={sheetAberto} onOpenChange={setSheetAberto} agendamento={editando} dataInicial={dataISO} horaInicial={horaInicial} agendamentosDoDia={agendamentos}/>
  </div>;
}

function EstadoVazio({onNovo}:{onNovo:()=>void}){return <div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><CalendarPlus className="size-8 text-muted-foreground"/><p className="font-medium">Seu dia está livre ✨</p><p className="text-sm text-muted-foreground">Toque abaixo para criar um atendimento.</p><Button variant="outline" className="rounded-xl" onClick={onNovo}>Criar agendamento</Button></div>}
