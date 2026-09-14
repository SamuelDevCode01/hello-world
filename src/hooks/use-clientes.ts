import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import { somenteDigitos } from "@/lib/formato";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Cliente = Tables<"clientes">;

export function useClientes(busca = "") {
  const salao = useSalaoAtual();
  const termo = busca.trim();
  return useQuery({
    queryKey: ["clientes", salao.id, termo],
    queryFn: async () => {
      let q = supabase
        .from("clientes")
        .select("*")
        .eq("salao_id", salao.id)
        .order("nome")
        .limit(200);
      if (termo) {
        const digitos = somenteDigitos(termo);
        const filtros = [`nome.ilike.%${termo}%`];
        if (digitos.length >= 3) filtros.push(`telefone.ilike.%${digitos}%`);
        q = q.or(filtros.join(","));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export type DadosCliente = Omit<
  TablesInsert<"clientes">,
  "salao_id" | "id" | "created_at" | "updated_at"
>;

export function useSalvarCliente() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosCliente }) => {
      if (id) {
        const { data, error } = await supabase
          .from("clientes")
          .update(dados)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("clientes")
        .insert({ ...dados, salao_id: salao.id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useExcluirCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}
