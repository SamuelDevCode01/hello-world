import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Servico = Tables<"servicos">;

export function useServicos(apenasAtivos = false) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["servicos", salao.id, apenasAtivos],
    queryFn: async () => {
      let q = supabase
        .from("servicos")
        .select("*")
        .eq("salao_id", salao.id)
        .order("nome");
      if (apenasAtivos) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export type DadosServico = Omit<
  TablesInsert<"servicos">,
  "salao_id" | "id" | "created_at" | "updated_at"
>;

export function useSalvarServico() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosServico }) => {
      if (id) {
        const { error } = await supabase.from("servicos").update(dados).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("servicos")
        .insert({ ...dados, salao_id: salao.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["servicos"] }),
  });
}

export function useExcluirServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("servicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["servicos"] }),
  });
}
