import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useConcluirComRecebimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agendamentoId: string) => {
      const { data, error } = await db.rpc("concluir_agendamento_com_comanda", {
        p_agendamento_id: agendamentoId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agendamentos"] });
      void qc.invalidateQueries({ queryKey: ["comandas"] });
      void qc.invalidateQueries({ queryKey: ["resumo-operacao"] });
    },
  });
}

export function useConcluirComPacote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agendamentoId, clientePacoteId }: { agendamentoId: string; clientePacoteId: string }) => {
      const { data, error } = await db.rpc("concluir_agendamento_com_pacote", {
        p_agendamento_id: agendamentoId,
        p_cliente_pacote_id: clientePacoteId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agendamentos"] });
      void qc.invalidateQueries({ queryKey: ["cliente-pacotes"] });
      void qc.invalidateQueries({ queryKey: ["cliente-detalhes"] });
      void qc.invalidateQueries({ queryKey: ["resumo-operacao"] });
    },
  });
}
