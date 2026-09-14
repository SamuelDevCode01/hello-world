import type { Enums } from "@/integrations/supabase/types";

export type StatusAgendamento = Enums<"status_agendamento">;

export const STATUS_LABEL: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};

/** Classes de badge por status — sempre tokens do tema. */
export const STATUS_CLASSE: Record<StatusAgendamento, string> = {
  agendado: "bg-muted text-muted-foreground",
  confirmado: "bg-primary/12 text-primary",
  em_atendimento: "bg-warning/20 text-warning-foreground",
  concluido: "bg-success/20 text-foreground",
  cancelado: "bg-destructive/12 text-destructive",
  nao_compareceu: "bg-destructive/10 text-destructive",
};

export const STATUS_ATIVOS: StatusAgendamento[] = [
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
];

/** Status que não ocupam horário na agenda. */
export const STATUS_LIBERA_HORARIO: StatusAgendamento[] = [
  "cancelado",
  "nao_compareceu",
];
