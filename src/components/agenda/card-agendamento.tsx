import { Clock } from "lucide-react";

import type { Agendamento } from "@/hooks/use-agendamentos";
import { duracaoEntre, formatarDuracao, horaCurta } from "@/lib/datas";
import { STATUS_CLASSE, STATUS_LABEL } from "@/lib/status";
import { cn } from "@/lib/utils";

type Props = {
  agendamento: Agendamento;
  onClick: () => void;
  compacto?: boolean;
};

export function CardAgendamento({ agendamento, onClick, compacto }: Props) {
  const cor = agendamento.servicos?.cor ?? "#C1622D";
  const cancelado = agendamento.status === "cancelado" || agendamento.status === "nao_compareceu";
  const duracao = duracaoEntre(agendamento.hora_inicio, agendamento.hora_fim);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border border-border bg-card p-3 text-left shadow-[0_1px_2px_rgba(41,37,36,0.04)] transition-all hover:shadow-[0_6px_20px_rgba(41,37,36,0.08)] active:scale-[0.995]",
        cancelado && "opacity-60",
        compacto && "p-2",
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: cor }}
        aria-hidden
      />
      <div className={cn("pl-2.5", compacto && "pl-2")}>
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "truncate font-medium text-foreground",
              compacto ? "text-xs" : "text-sm",
              cancelado && "line-through",
            )}
          >
            {agendamento.clientes?.nome ?? "Cliente"}
          </p>
          {!compacto && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                STATUS_CLASSE[agendamento.status],
              )}
            >
              {STATUS_LABEL[agendamento.status]}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-muted-foreground",
            compacto ? "text-[11px]" : "text-xs",
          )}
        >
          {agendamento.servicos?.nome ?? "Serviço"}
        </p>
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-muted-foreground",
            compacto ? "text-[10px]" : "text-xs",
          )}
        >
          <Clock className="size-3" />
          {horaCurta(agendamento.hora_inicio)}–{horaCurta(agendamento.hora_fim)}
          <span className="text-muted-foreground/70">· {formatarDuracao(duracao)}</span>
        </p>
      </div>
    </button>
  );
}
