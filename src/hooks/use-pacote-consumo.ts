import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useConsumirPacote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientePacoteId, servicoId, agendamentoId }: { clientePacoteId: string; servicoId: string; agendamentoId?: string }) => {
      const { error } = await db.rpc("consumir_pacote", {
        p_cliente_pacote_id: clientePacoteId,
        p_servico_id: servicoId,
        p_agendamento_id: agendamentoId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cliente-pacotes"] });
      void qc.invalidateQueries({ queryKey: ["cliente-detalhes"] });
    },
  });
}
