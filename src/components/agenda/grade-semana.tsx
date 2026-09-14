import { CardAgendamento } from "@/components/agenda/card-agendamento";
import type { Agendamento } from "@/hooks/use-agendamentos";
import { ehHoje, formatarDiaSemana, paraDataISO } from "@/lib/datas";
import { cn } from "@/lib/utils";

type Props = {
  dias: Date[];
  agendamentos: Agendamento[];
  onDia: (d: Date) => void;
  onAbrir: (a: Agendamento) => void;
};

export function GradeSemana({ dias, agendamentos, onDia, onAbrir }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div className="flex min-w-[46rem] gap-2">
        {dias.map((dia) => {
          const iso = paraDataISO(dia);
          const doDia = agendamentos.filter((a) => a.data === iso);
          const hoje = ehHoje(dia);
          return (
            <div key={iso} className="flex w-[6.5rem] flex-1 flex-col">
              <button
                type="button"
                onClick={() => onDia(dia)}
                className={cn(
                  "mb-2 rounded-xl px-2 py-2 text-center transition-colors",
                  hoje ? "bg-primary/10 text-primary" : "hover:bg-accent",
                )}
              >
                <span className="block text-[11px] font-medium uppercase">
                  {formatarDiaSemana(dia)}
                </span>
                <span className="block text-base font-semibold tabular-nums">
                  {dia.getDate()}
                </span>
              </button>
              <div className="space-y-1.5">
                {doDia.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-2 py-4 text-center text-[11px] text-muted-foreground/70">
                    Livre
                  </p>
                ) : (
                  doDia.map((a) => (
                    <CardAgendamento key={a.id} agendamento={a} onClick={() => onAbrir(a)} compacto />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
