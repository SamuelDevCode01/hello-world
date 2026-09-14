import { createFileRoute } from "@tanstack/react-router";
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
import { gerarSlots, horaCurta, paraDataISO, semanaDe } from "@/lib/datas";
import { saudacao } from "@/lib/formato";
import { STATUS_LIBERA_HORARIO } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: PaginaAgenda,
  head: () => ({
    meta: [
      { title: "Agenda do dia | Agendamentos do salão" },
      {
        name: "description",
        content:
          "Veja e organize os atendimentos do salão por dia e por semana, com criação rápida de agendamentos.",
      },
      { property: "og:title", content: "Agenda do dia | Agendamentos do salão" },
      {
        property: "og:description",
        content: "Organize os atendimentos do salão por dia e por semana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaginaAgenda() {
  const salao = useSalaoAtual();
  const [data, setData] = useState<Date>(new Date());
  const [visao, setVisao] = useState<Visao>("dia");
  const [sheetAberto, setSheetAberto] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [horaInicial, setHoraInicial] = useState(horaCurta(salao.horario_abertura));

  const dias = useMemo(() => semanaDe(data), [data]);
  const dataISO = paraDataISO(data);
  const inicio = visao === "dia" ? dataISO : paraDataISO(dias[0]!);
  const fim = visao === "dia" ? dataISO : paraDataISO(dias[6]!);

  const { data: agendamentos = [], isLoading } = useAgendamentos(inicio, fim);

  const slots = useMemo(
    () =>
      gerarSlots(
        horaCurta(salao.horario_abertura),
        horaCurta(salao.horario_fechamento),
        salao.intervalo_agenda_minutos,
      ),
    [salao],
  );

  const doDia = agendamentos.filter((a) => a.data === dataISO);
  const ativosDoDia = doDia.filter((a) => !STATUS_LIBERA_HORARIO.includes(a.status));
  const concluidosDoDia = doDia.filter((a) => a.status === "concluido");

  function abrirNovo(hora?: string) {
    setEditando(null);
    setHoraInicial(hora ?? horaCurta(salao.horario_abertura));
    setSheetAberto(true);
  }

  function abrirExistente(a: Agendamento) {
    setEditando(a);
    setSheetAberto(true);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {saudacao()}
            {salao.nome_responsavel ? `, ${salao.nome_responsavel.split(" ")[0]}` : ""}
          </p>
          <h1 className="font-display text-2xl">{salao.nome}</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card-elegante px-4 py-3">
            <p className="text-xs text-muted-foreground">Atendimentos no dia</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{ativosDoDia.length}</p>
          </div>
          <div className="card-elegante px-4 py-3">
            <p className="text-xs text-muted-foreground">Já concluídos</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
              {concluidosDoDia.length}
            </p>
          </div>
        </div>
      </header>

      <CabecalhoAgenda
        data={data}
        visao={visao}
        onData={setData}
        onVisao={setVisao}
        onHoje={() => setData(new Date())}
        onAnterior={() => setData((d) => addDays(d, visao === "dia" ? -1 : -7))}
        onProximo={() => setData((d) => addDays(d, visao === "dia" ? 1 : 7))}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : visao === "dia" ? (
        slots.length === 0 ? (
          <EstadoVazio onNovo={() => abrirNovo()} />
        ) : (
          <GradeDia
            slots={slots}
            intervalo={salao.intervalo_agenda_minutos}
            agendamentos={doDia}
            onSlot={(h) => abrirNovo(h)}
            onAbrir={abrirExistente}
          />
        )
      ) : (
        <GradeSemana
          dias={dias}
          agendamentos={agendamentos}
          onDia={(d) => {
            setData(d);
            setVisao("dia");
          }}
          onAbrir={abrirExistente}
        />
      )}

      <Button
        onClick={() => abrirNovo()}
        className="fixed bottom-24 right-5 z-40 size-14 rounded-2xl shadow-lg md:bottom-8 md:right-8"
        aria-label="Novo agendamento"
      >
        <Plus className="size-6" />
      </Button>

      <SheetAgendamento
        aberto={sheetAberto}
        onOpenChange={setSheetAberto}
        agendamento={editando}
        dataInicial={dataISO}
        horaInicial={horaInicial}
        agendamentosDoDia={agendamentos}
      />
    </div>
  );
}

function EstadoVazio({ onNovo }: { onNovo: () => void }) {
  return (
    <div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center">
      <CalendarPlus className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Defina o horário de funcionamento nas configurações para ver os horários da agenda.
      </p>
      <Button variant="outline" className="rounded-xl" onClick={onNovo}>
        Criar agendamento mesmo assim
      </Button>
    </div>
  );
}
