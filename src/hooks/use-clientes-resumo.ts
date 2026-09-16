import { useQuery } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type ClienteResumo = {
  id: string;
  salao_id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  ultimo_atendimento: string | null;
  proximo_agendamento: string | null;
  retorno_previsto: string | null;
};

export function useClientesResumo(busca = "") {
  const salao = useSalaoAtual();
  const termo = busca.trim();
  return useQuery({
    queryKey: ["clientes-resumo", salao.id, termo],
    queryFn: async () => {
      let q = db
        .from("vw_clientes_resumo")
        .select("*")
        .eq("salao_id", salao.id)
        .order("nome")
        .limit(200);
      if (termo) {
        const seguro = termo.replace(/[,%()]/g, " ").trim();
        q = q.or(`nome.ilike.%${seguro}%,telefone.ilike.%${seguro}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as ClienteResumo[];
    },
  });
}
