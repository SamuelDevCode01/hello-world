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
  foto_path: string | null;
  foto_url: string | null;
};

export function useClientesResumo(busca = "") {
  const salao = useSalaoAtual();
  const termo = busca.trim();
  return useQuery({
    queryKey: ["clientes-resumo", salao.id, termo],
    staleTime: 30_000,
    queryFn: async () => {
      let q = db
        .from("vw_clientes_resumo")
        .select("*")
        .eq("salao_id", salao.id)
        .order("nome")
        .limit(200);
      if (termo) {
        const seguro = termo.replace(/[,%()]/g, " ").trim();
        q = q.or(`nome.ilike.%${seguro}%,telefone.ilike.%${seguro}%,whatsapp.ilike.%${seguro}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      const clientes = (data ?? []) as Omit<ClienteResumo, "foto_url">[];
      const paths = Array.from(new Set(clientes.map((c) => c.foto_path).filter((p): p is string => Boolean(p))));
      const urls = new Map<string, string>();
      if (paths.length) {
        const { data: assinadas } = await supabase.storage.from("fotos-clientes").createSignedUrls(paths, 3600);
        for (const item of assinadas ?? []) {
          if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
        }
      }
      return clientes.map((c) => ({ ...c, foto_url: c.foto_path ? urls.get(c.foto_path) ?? null : null })) as ClienteResumo[];
    },
  });
}
