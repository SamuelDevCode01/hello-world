import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

function invalidar(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["comandas"] });
  void qc.invalidateQueries({ queryKey: ["financeiro"] });
  void qc.invalidateQueries({ queryKey: ["financeiro-detalhado"] });
}

export function useAtualizarDescontoComanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, desconto }: { id: string; desconto: number }) => {
      if (desconto < 0) throw new Error("O desconto não pode ser negativo.");
      const { error } = await db.from("comandas").update({ desconto }).eq("id", id).eq("status", "aberta");
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}

export function useRemoverPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("pagamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}

export function useCancelarComanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("cancelar_comanda", { p_comanda_id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}
