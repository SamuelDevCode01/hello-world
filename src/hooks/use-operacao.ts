import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type Produto = {
  id: string;
  salao_id: string;
  nome: string;
  categoria: string | null;
  marca: string | null;
  sku: string | null;
  preco_custo: number;
  preco_venda: number;
  quantidade_atual: number;
  estoque_minimo: number;
  unidade: string;
  uso: "interno" | "venda" | "ambos";
  ativo: boolean;
};

export type RetornoCliente = {
  salao_id: string;
  cliente_id: string;
  cliente_nome: string;
  whatsapp: string | null;
  telefone: string | null;
  servico_id: string;
  servico_nome: string;
  ultimo_atendimento: string;
  retorno_previsto: string;
  ignorar_ate: string | null;
};

export type TemplateMensagem = {
  id: string;
  salao_id: string;
  nome: string;
  tipo: "confirmacao" | "lembrete" | "retorno" | "aniversario" | "pos_atendimento";
  mensagem: string;
  ativo: boolean;
};

export type Pacote = {
  id: string;
  salao_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  validade_dias: number;
  ativo: boolean;
  pacote_itens?: Array<{ id: string; servico_id: string; quantidade: number; servicos?: { nome: string } | null }>;
};

export type Comanda = {
  id: string;
  salao_id: string;
  cliente_id: string;
  agendamento_id: string | null;
  status: "aberta" | "fechada" | "cancelada";
  subtotal: number;
  desconto: number;
  total: number;
  observacoes: string | null;
  opened_at: string;
  closed_at: string | null;
  clientes?: { nome: string } | null;
  comanda_itens?: Array<{
    id: string;
    tipo: "servico" | "produto";
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    total: number;
    servico_id: string | null;
    produto_id: string | null;
  }>;
  pagamentos?: Array<{ id: string; forma_pagamento: string; valor: number }>;
};

function dataISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function whatsappUrl(numero: string | null | undefined, mensagem: string) {
  const digitos = (numero ?? "").replace(/\D/g, "");
  const telefone = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

export function useProdutos(busca = "") {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["produtos", salao.id, busca],
    queryFn: async () => {
      let q = db.from("produtos").select("*").eq("salao_id", salao.id).order("nome");
      if (busca.trim()) q = q.ilike("nome", `%${busca.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Produto[];
    },
  });
}

export function useSalvarProduto() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<Produto> }) => {
      const payload = { ...dados, salao_id: salao.id };
      const q = id ? db.from("produtos").update(payload).eq("id", id) : db.from("produtos").insert(payload);
      const { data, error } = await q.select("*").single();
      if (error) throw error;
      return data as Produto;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

export function useExcluirProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

export function useMovimentarEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ produtoId, tipo, quantidade, motivo }: { produtoId: string; tipo: string; quantidade: number; motivo?: string }) => {
      const { error } = await db.rpc("movimentar_estoque", {
        p_produto_id: produtoId,
        p_tipo: tipo,
        p_quantidade: quantidade,
        p_motivo: motivo || null,
        p_comanda_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["produtos"] });
      void qc.invalidateQueries({ queryKey: ["movimentos-estoque"] });
      void qc.invalidateQueries({ queryKey: ["resumo-operacao"] });
    },
  });
}

export function useMovimentosEstoque(produtoId?: string) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["movimentos-estoque", salao.id, produtoId],
    queryFn: async () => {
      let q = db
        .from("movimentacoes_estoque")
        .select("*, produtos(nome, unidade)")
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

export function useRetornos() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["retornos", salao.id],
    queryFn: async () => {
      const { data, error } = await db.from("vw_retornos_clientes").select("*").eq("salao_id", salao.id).order("retorno_previsto");
      if (error) throw error;
      const hoje = dataISO(new Date());
      const limite = new Date();
      limite.setDate(limite.getDate() + 7);
      const limiteISO = dataISO(limite);
      return (data as RetornoCliente[]).filter((r) => r.retorno_previsto <= limiteISO && (!r.ignorar_ate || r.ignorar_ate < hoje));
    },
  });
}

export function useIgnorarRetorno() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, servicoId, dias = 7 }: { clienteId: string; servicoId: string; dias?: number }) => {
      const ate = new Date();
      ate.setDate(ate.getDate() + dias);
      const { error } = await db.from("retornos_ignorados").upsert(
        { salao_id: salao.id, cliente_id: clienteId, servico_id: servicoId, ignorar_ate: dataISO(ate) },
        { onConflict: "salao_id,cliente_id,servico_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["retornos"] }),
  });
}

export function useTemplates() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["templates", salao.id],
    queryFn: async () => {
      const { data, error } = await db.from("templates_mensagens").select("*").eq("salao_id", salao.id).order("tipo");
      if (error) throw error;
      return data as TemplateMensagem[];
    },
  });
}

export function useSalvarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mensagem, ativo }: { id: string; mensagem: string; ativo: boolean }) => {
      const { error } = await db.from("templates_mensagens").update({ mensagem, ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useAniversarios() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["aniversarios", salao.id],
    queryFn: async () => {
      const { data, error } = await db.from("clientes").select("id,nome,whatsapp,telefone,data_nascimento").eq("salao_id", salao.id).not("data_nascimento", "is", null);
      if (error) throw error;
      const hoje = new Date();
      const fim = new Date(); fim.setDate(fim.getDate() + 7);
      return (data as any[]).map((c) => {
        const [,m,d] = c.data_nascimento.split("-").map(Number);
        let prox = new Date(hoje.getFullYear(), m - 1, d);
        if (prox < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) prox = new Date(hoje.getFullYear() + 1, m - 1, d);
        return { ...c, proximo: prox };
      }).filter((c) => c.proximo <= fim).sort((a,b) => +a.proximo - +b.proximo);
    },
  });
}

export function useClienteDetalhes(clienteId?: string) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["cliente-detalhes", salao.id, clienteId],
    enabled: Boolean(clienteId),
    queryFn: async () => {
      const [hist, prefs] = await Promise.all([
        db.from("agendamentos").select("id,data,hora_inicio,status,observacoes,servicos(nome,preco)").eq("salao_id", salao.id).eq("cliente_id", clienteId).order("data", { ascending: false }).limit(50),
        db.from("cliente_preferencias").select("*").eq("salao_id", salao.id).eq("cliente_id", clienteId).order("created_at", { ascending: false }),
      ]);
      if (hist.error) throw hist.error;
      if (prefs.error) throw prefs.error;
      return { historico: hist.data as any[], preferencias: prefs.data as any[] };
    },
  });
}

export function useSalvarPreferencia() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, categoria, valor }: { clienteId: string; categoria: string; valor: string }) => {
      const { error } = await db.from("cliente_preferencias").insert({ salao_id: salao.id, cliente_id: clienteId, categoria, valor });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cliente-detalhes"] }),
  });
}

export function useExcluirPreferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cliente_preferencias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cliente-detalhes"] }),
  });
}

export function usePacotes() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["pacotes", salao.id],
    queryFn: async () => {
      const { data, error } = await db.from("pacotes").select("*, pacote_itens(id,servico_id,quantidade,servicos(nome))").eq("salao_id", salao.id).order("nome");
      if (error) throw error;
      return data as Pacote[];
    },
  });
}

export function useSalvarPacote() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados, itens }: { id?: string; dados: any; itens: Array<{ servico_id: string; quantidade: number }> }) => {
      let pacoteId = id;
      if (id) {
        const { error } = await db.from("pacotes").update(dados).eq("id", id);
        if (error) throw error;
        const { error: delError } = await db.from("pacote_itens").delete().eq("pacote_id", id);
        if (delError) throw delError;
      } else {
        const { data, error } = await db.from("pacotes").insert({ ...dados, salao_id: salao.id }).select("id").single();
        if (error) throw error;
        pacoteId = data.id;
      }
      if (itens.length) {
        const { error } = await db.from("pacote_itens").insert(itens.map((i) => ({ ...i, pacote_id: pacoteId, salao_id: salao.id })));
        if (error) throw error;
      }
      return pacoteId as string;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["pacotes"] }),
  });
}

export function useComprarPacote() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, pacote }: { clienteId: string; pacote: Pacote }) => {
      const validade = new Date(); validade.setDate(validade.getDate() + pacote.validade_dias);
      const { error } = await db.from("cliente_pacotes").insert({
        salao_id: salao.id, cliente_id: clienteId, pacote_id: pacote.id,
        data_compra: dataISO(new Date()), data_validade: dataISO(validade), valor_pago: pacote.preco,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cliente-pacotes"] }),
  });
}

export function useClientePacotes(clienteId?: string) {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["cliente-pacotes", salao.id, clienteId],
    enabled: Boolean(clienteId),
    queryFn: async () => {
      const { data, error } = await db.from("cliente_pacotes").select("*, pacotes(nome,pacote_itens(servico_id,quantidade,servicos(nome))), cliente_pacote_usos(servico_id,quantidade)").eq("salao_id", salao.id).eq("cliente_id", clienteId).order("data_compra", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useComandas() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["comandas", salao.id],
    queryFn: async () => {
      const { data, error } = await db.from("comandas").select("*, clientes(nome), comanda_itens(*), pagamentos(*)").eq("salao_id", salao.id).order("opened_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as Comanda[];
    },
  });
}

export function useCriarComanda() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, agendamentoId, servico }: { clienteId: string; agendamentoId?: string; servico?: { id: string; nome: string; preco: number } }) => {
      const { data, error } = await db.from("comandas").insert({ salao_id: salao.id, cliente_id: clienteId, agendamento_id: agendamentoId ?? null }).select("id").single();
      if (error) throw error;
      if (servico) {
        const { error: itemError } = await db.from("comanda_itens").insert({ salao_id: salao.id, comanda_id: data.id, tipo: "servico", servico_id: servico.id, descricao: servico.nome, quantidade: 1, valor_unitario: servico.preco });
        if (itemError) throw itemError;
      }
      return data.id as string;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["comandas"] }),
  });
}

export function useAdicionarItemComanda() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      const { error } = await db.from("comanda_itens").insert({ ...item, salao_id: salao.id });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["comandas"] }),
  });
}

export function useAdicionarPagamento() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ comandaId, forma, valor }: { comandaId: string; forma: string; valor: number }) => {
      const { error } = await db.from("pagamentos").insert({ salao_id: salao.id, comanda_id: comandaId, forma_pagamento: forma, valor });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["comandas"] }),
  });
}

export function useFecharComanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("fechar_comanda", { p_comanda_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["comandas"] });
      void qc.invalidateQueries({ queryKey: ["produtos"] });
      void qc.invalidateQueries({ queryKey: ["financeiro"] });
    },
  });
}

export function useFinanceiro() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["financeiro", salao.id],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
      const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
      const [comandas, pagamentos] = await Promise.all([
        db.from("comandas").select("id,total,status,closed_at,comanda_itens(tipo,quantidade)").eq("salao_id", salao.id).gte("opened_at", inicioMes),
        db.from("pagamentos").select("forma_pagamento,valor,created_at").eq("salao_id", salao.id).gte("created_at", inicioMes),
      ]);
      if (comandas.error) throw comandas.error;
      if (pagamentos.error) throw pagamentos.error;
      const fechadas = (comandas.data as any[]).filter((c) => c.status === "fechada");
      const faturamentoMes = fechadas.reduce((s,c) => s + Number(c.total), 0);
      const hoje = fechadas.filter((c) => c.closed_at && c.closed_at >= inicioHoje);
      const porForma = (pagamentos.data as any[]).reduce((acc,p) => ({ ...acc, [p.forma_pagamento]: (acc[p.forma_pagamento] ?? 0) + Number(p.valor) }), {} as Record<string,number>);
      const produtosVendidos = fechadas.reduce((s,c) => s + (c.comanda_itens ?? []).filter((i:any) => i.tipo === "produto").reduce((a:number,i:any) => a + Number(i.quantidade),0),0);
      return {
        faturamentoHoje: hoje.reduce((s,c) => s + Number(c.total),0),
        faturamentoMes,
        comandasAbertas: (comandas.data as any[]).filter((c) => c.status === "aberta").length,
        ticketMedio: fechadas.length ? faturamentoMes / fechadas.length : 0,
        produtosVendidos,
        porForma,
      };
    },
  });
}

export function useResumoOperacao() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["resumo-operacao", salao.id],
    staleTime: 30_000,
    queryFn: async () => {
      const hoje = dataISO(new Date());
      const [ag, ret, prod] = await Promise.all([
        db.from("agendamentos").select("id,status,servicos(preco)").eq("salao_id", salao.id).eq("data", hoje),
        db.from("vw_retornos_clientes").select("retorno_previsto,ignorar_ate").eq("salao_id", salao.id).lte("retorno_previsto", hoje),
        db.from("produtos").select("id,quantidade_atual,estoque_minimo").eq("salao_id", salao.id).eq("ativo", true),
      ]);
      if (ag.error) throw ag.error;
      const ativos = (ag.data as any[]).filter((a) => !["cancelado","nao_compareceu"].includes(a.status));
      return {
        atendimentos: ativos.length,
        previstos: ativos.reduce((s,a) => s + Number(a.servicos?.preco ?? 0),0),
        retornos: (ret.data as any[] ?? []).filter((r) => !r.ignorar_ate || r.ignorar_ate < hoje).length,
        estoqueBaixo: (prod.data as any[] ?? []).filter((p) => Number(p.quantidade_atual) <= Number(p.estoque_minimo)).length,
      };
    },
  });
}
