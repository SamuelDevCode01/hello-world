import { Plus } from "lucide-react";

import { CardAgendamento } from "@/components/agenda/card-agendamento";
import type { Agendamento } from "@/hooks/use-agendamentos";
import { minutosDeHora } from "@/lib/datas";
import { STATUS_LIBERA_HORARIO } from "@/lib/status";
import { cn } from "@/lib/utils";

type Props = {
  slots: string[];
  intervalo: number;
  agendamentos: Agendamento[];
  onSlot: (hora: string) => void;
  onAbrir: (a: Agendamento) => void;
};

export function GradeDia({ slots, intervalo, agendamentos, onSlot, onAbrir }: Props) {
  const usados = new Set<string>();

  const linhas = slots.map((slot) => {
    const ini = minutosDeHora(slot);
    const fim = ini + intervalo;
    const doSlot = agendamentos.filter((a) => {
      const m = minutosDeHora(a.hora_inicio);
      return m >= ini && m < fim;
    });
    doSlot.forEach((a) => usados.add(a.id));
    return { slot, doSlot };
  });

  const foraDoHorario = agendamentos.filter((a) => !usados.has(a.id));

  return (
    <div className="space-y-1">
      {linhas.map(({ slot, doSlot }) => {
        const ocupado = doSlot.some((a) => !STATUS_LIBERA_HORARIO.includes(a.status));
        return (
          <div key={slot} className="flex gap-3">
            <span className="w-12 shrink-0 pt-3 text-right text-xs tabular-nums text-muted-foreground">
              {slot}
            </span>
            <div className="min-w-0 flex-1">
              {doSlot.length > 0 ? (
                <div className="space-y-1.5 py-0.5">
                  {doSlot.map((a) => (
                    <CardAgendamento key={a.id} agendamento={a} onClick={() => onAbrir(a)} />
                  ))}
                  {!ocupado && (
                    <BotaoSlot hora={slot} onSlot={onSlot} rotulo="Agendar neste horário" />
                  )}
                </div>
              ) : (
                <BotaoSlot hora={slot} onSlot={onSlot} />
              )}
            </div>
          </div>
        );
      })}

      {foraDoHorario.length > 0 && (
        <div className="pt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fora do horário de funcionamento
          </p>
          <div className="space-y-2">
            {foraDoHorario.map((a) => (
              <CardAgendamento key={a.id} agendamento={a} onClick={() => onAbrir(a)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BotaoSlot({
  hora,
  onSlot,
  rotulo,
}: {
  hora: string;
  onSlot: (h: string) => void;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSlot(hora)}
      className={cn(
        "group flex h-11 w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 text-left text-xs text-muted-foreground/70 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
      )}
    >
      <Plus className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="opacity-0 transition-opacity group-hover:opacity-100">
        {rotulo ?? "Agendar"}
      </span>
    </button>
  );
}
