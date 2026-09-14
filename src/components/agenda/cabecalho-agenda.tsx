import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatarData, formatarDataLonga, semanaDe } from "@/lib/datas";
import { ptBR } from "date-fns/locale";

export type Visao = "dia" | "semana";

type Props = {
  data: Date;
  visao: Visao;
  onData: (d: Date) => void;
  onVisao: (v: Visao) => void;
  onAnterior: () => void;
  onProximo: () => void;
  onHoje: () => void;
};

export function CabecalhoAgenda({
  data,
  visao,
  onData,
  onVisao,
  onAnterior,
  onProximo,
  onHoje,
}: Props) {
  const semana = semanaDe(data);
  const titulo =
    visao === "dia"
      ? formatarDataLonga(data)
      : `${formatarData(semana[0]!)} – ${formatarData(semana[6]!)}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          onClick={onAnterior}
          aria-label="Anterior"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          variant="ghost"
          className="h-10 flex-1 rounded-xl px-2 text-sm font-medium"
          onClick={onHoje}
        >
          HOJE
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          onClick={onProximo}
          aria-label="Próximo"
        >
          <ChevronRight className="size-5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-xl"
              aria-label="Escolher data"
            >
              <CalendarDays className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-xl p-0" align="end">
            <Calendar
              mode="single"
              selected={data}
              onSelect={(d) => d && onData(d)}
              locale={ptBR}
              weekStartsOn={1}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium capitalize text-muted-foreground">{titulo}</p>
        <Tabs value={visao} onValueChange={(v) => onVisao(v as Visao)}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="dia" className="rounded-lg px-4">
              Dia
            </TabsTrigger>
            <TabsTrigger value="semana" className="rounded-lg px-4">
              Semana
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
