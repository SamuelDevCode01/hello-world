import { useQuery } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import type { Comanda, Pacote } from "@/hooks/use-operacao";

const db = supabase as any;

function dataISO(d: Date) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function useMovimentosEstoque(produtoId?: string) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["movimentos-estoque", salao.id, produtoId],
    staleTime: 30_000,
    queryFn: async () => {
      let q = db
        .from("movimentacoes_estoque")
        .select(
          "*, produtos:produtos!movimentacoes_produto_salao_fkey(nome,unidade)",
        )
        .eq("salao_id", salao.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (produtoId) q = q.eq("produto_id", produtoId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useClienteDetalhes(clienteId?: string) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["cliente-detalhes", salao.id, clienteId],
    enabled: Boolean(clienteId),
    staleTime: 30_000,
    queryFn: async () => {
      const [hist, prefs] = await Promise.all([
        db
          .from("agendamentos")
          .select(
            "id,data,hora_inicio,status,observacoes,servicos:servicos!agendamentos_servico_mesmo_salao(nome,preco)",
          )
          .eq("salao_id", salao.id)
          .eq("cliente_id", clienteId)
          .order("data", { ascending: false })
          .limit(50),
        db
          .from("cliente_preferencias")
          .select("*")
          .eq("salao_id", salao.id)
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false }),
      ]);
      if (hist.error) throw hist.error;
      if (prefs.error) throw prefs.error;
      return { historico: hist.data as any[], preferencias: prefs.data as any[] };
    },
  });
}

export function usePacotes() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["pacotes", salao.id],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("pacotes")
        .select(
          "*, pacote_itens:pacote_itens!pacote_itens_pacote_salao_fkey(id,servico_id,quantidade,servicos:servicos!pacote_itens_servico_salao_fkey(nome,preco))",
        )
        .eq("salao_id", salao.id)
        .order("nome");
      if (error) throw error;
      return data as Pacote[];
    },
  });
}

export function useClientePacotes(clienteId?: string) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["cliente-pacotes", salao.id, clienteId],
    enabled: Boolean(clienteId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("cliente_pacotes")
        .select(
          "*, pacotes:pacotes!cliente_pacotes_pacote_salao_fkey(nome,pacote_itens:pacote_itens!pacote_itens_pacote_salao_fkey(servico_id,quantidade,servicos:servicos!pacote_itens_servico_salao_fkey(nome))), cliente_pacote_usos:cliente_pacote_usos!cliente_pacote_usos_pacote_salao_fkey(servico_id,quantidade)",
        )
        .eq("salao_id", salao.id)
        .eq("cliente_id", clienteId)
        .order("data_compra", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useComandas() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["comandas", salao.id],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("comandas")
        .select(
          "*, clientes:clientes!comandas_cliente_salao_fkey(id,nome,telefone,whatsapp,observacoes,foto_path), comanda_itens:comanda_itens!comanda_itens_comanda_salao_fkey(*), pagamentos:pagamentos!pagamentos_comanda_salao_fkey(*)",
        )
        .eq("salao_id", salao.id)
        .order("opened_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Comanda[];
    },
  });
}

export function useResumoOperacao() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["resumo-operacao", salao.id],
    staleTime: 15_000,
    queryFn: async () => {
      const hoje = dataISO(new Date());
      const [ag, ret, prod] = await Promise.all([
        db
          .from("agendamentos")
          .select(
            "id,status,servicos:servicos!agendamentos_servico_mesmo_salao(preco)",
          )
          .eq("salao_id", salao.id)
          .eq("data", hoje),
        db
          .from("vw_retornos_clientes")
          .select("retorno_previsto,ignorar_ate")
          .eq("salao_id", salao.id)
          .lte("retorno_previsto", hoje),
        db
          .from("produtos")
          .select("id,quantidade_atual,estoque_minimo")
          .eq("salao_id", salao.id)
          .eq("ativo", true),
      ]);
      if (ag.error) throw ag.error;
      if (ret.error) throw ret.error;
      if (prod.error) throw prod.error;
      const ativos = (ag.data as any[]).filter(
        (a) => !["cancelado", "nao_compareceu"].includes(a.status),
      );
      return {
        atendimentos: ativos.length,
        previstos: ativos.reduce(
          (s, a) => s + Number(a.servicos?.preco ?? 0),
          0,
        ),
        retornos: ((ret.data as any[]) ?? []).filter(
          (r) => !r.ignorar_ate || r.ignorar_ate < hoje,
        ).length,
        estoqueBaixo: ((prod.data as any[]) ?? []).filter(
          (p) => Number(p.quantidade_atual) <= Number(p.estoque_minimo),
        ).length,
      };
    },
  });
}
