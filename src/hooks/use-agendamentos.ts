import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import { minutosDeHora, paraHoraISO } from "@/lib/datas";
import { STATUS_LIBERA_HORARIO, type StatusAgendamento } from "@/lib/status";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Agendamento = Tables<"agendamentos"> & {
  clientes: Pick<Tables<"clientes">, "id" | "nome" | "telefone" | "whatsapp"> | null;
  servicos: Pick<Tables<"servicos">, "id" | "nome" | "cor" | "duracao_minutos" | "preco"> | null;
};

const SELECT =
  "*, clientes(id, nome, telefone, whatsapp), servicos(id, nome, cor, duracao_minutos, preco)";

/** Agendamentos entre duas datas (inclusive), no formato yyyy-MM-dd. */
export function useAgendamentos(dataInicio: string, dataFim: string) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["agendamentos", salao.id, dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(SELECT)
        .eq("salao_id", salao.id)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data")
        .order("hora_inicio");
      if (error) throw error;
      return data as unknown as Agendamento[];
    },
  });
}

export type DadosAgendamento = {
  cliente_id: string;
  servico_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status?: StatusAgendamento;
  observacoes?: string | null;
};

export const MSG_CONFLITO =
  "Já existe um atendimento nesse horário. Escolha outro horário ou cancele o agendamento existente.";

function traduzirErro(error: { code?: string; message?: string }): Error {
  if (error.code === "23P01") return new Error(MSG_CONFLITO);
  if (error.code === "23514") return new Error("O horário final precisa ser maior que o inicial.");
  return new Error(error.message ?? "Não foi possível salvar o agendamento.");
}

export function useSalvarAgendamento() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosAgendamento }) => {
      if (minutosDeHora(dados.hora_fim) <= minutosDeHora(dados.hora_inicio)) {
        throw new Error("O horário final precisa ser maior que o inicial.");
      }
      const payload: TablesInsert<"agendamentos"> = {
        salao_id: salao.id,
        cliente_id: dados.cliente_id,
        servico_id: dados.servico_id,
        data: dados.data,
        hora_inicio: paraHoraISO(dados.hora_inicio),
        hora_fim: paraHoraISO(dados.hora_fim),
        observacoes: dados.observacoes ?? null,
        ...(dados.status ? { status: dados.status } : {}),
      };
      if (id) {
        const { error } = await supabase.from("agendamentos").update(payload).eq("id", id);
        if (error) throw traduzirErro(error);
        return id;
      }
      const { data, error } = await supabase
        .from("agendamentos")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw traduzirErro(error);
      return data.id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["agendamentos"] }),
  });
}

export function useAlterarStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusAgendamento }) => {
      const { error } = await supabase.from("agendamentos").update({ status }).eq("id", id);
      if (error) throw traduzirErro(error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["agendamentos"] }),
  });
}

export function useExcluirAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["agendamentos"] }),
  });
}

/** Checagem de conflito na interface (o banco também garante). */
export function temConflito(
  lista: Agendamento[],
  alvo: { data: string; hora_inicio: string; hora_fim: string; id?: string },
): boolean {
  const ini = minutosDeHora(alvo.hora_inicio);
  const fim = minutosDeHora(alvo.hora_fim);
  return lista.some((a) => {
    if (a.id === alvo.id) return false;
    if (a.data !== alvo.data) return false;
    if (STATUS_LIBERA_HORARIO.includes(a.status)) return false;
    return minutosDeHora(a.hora_inicio) < fim && minutosDeHora(a.hora_fim) > ini;
  });
}
