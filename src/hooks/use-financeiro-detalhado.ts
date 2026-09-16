import { useQuery } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useFinanceiroDetalhado() {
  const salao = useSalaoAtual();
  return useQuery({
    queryKey: ["financeiro-detalhado", salao.id],
    queryFn: async () => {
      const agora = new Date();
      const hoje = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,"0")}-${String(agora.getDate()).padStart(2,"0")}`;
      const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
      const inicioMesData = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const inicioMes = inicioMesData.toISOString();
      const inicioMesDate = `${inicioMesData.getFullYear()}-${String(inicioMesData.getMonth()+1).padStart(2,"0")}-01`;

      const [comandas, pagamentos, atendHoje, concluidosMes] = await Promise.all([
        db.from("comandas").select("id,total,status,opened_at,closed_at,comanda_itens(tipo,quantidade)").eq("salao_id", salao.id).gte("opened_at", inicioMes),
        db.from("pagamentos").select("forma_pagamento,valor,created_at").eq("salao_id", salao.id).gte("created_at", inicioMes),
        db.from("agendamentos").select("id,status").eq("salao_id", salao.id).eq("data", hoje),
        db.from("agendamentos").select("id").eq("salao_id", salao.id).eq("status", "concluido").gte("data", inicioMesDate),
      ]);
      if (comandas.error) throw comandas.error;
      if (pagamentos.error) throw pagamentos.error;
      if (atendHoje.error) throw atendHoje.error;
      if (concluidosMes.error) throw concluidosMes.error;

      const lista = comandas.data as any[];
      const fechadas = lista.filter((c) => c.status === "fechada");
      const fechadasHoje = fechadas.filter((c) => c.closed_at && c.closed_at >= inicioHoje);
      const pagamentosLista = pagamentos.data as any[];
      const pagamentosHoje = pagamentosLista.filter((p) => p.created_at >= inicioHoje);
      const faturamentoMes = fechadas.reduce((s,c)=>s+Number(c.total),0);
      const recebidoHoje = pagamentosHoje.reduce((s,p)=>s+Number(p.valor),0);
      const porForma = pagamentosLista.reduce((acc,p)=>{acc[p.forma_pagamento]=(acc[p.forma_pagamento]??0)+Number(p.valor);return acc;},{} as Record<string,number>);
      const produtosVendidos = fechadas.reduce((s,c)=>s+(c.comanda_itens??[]).filter((i:any)=>i.tipo==="produto").reduce((a:number,i:any)=>a+Number(i.quantidade),0),0);

      return {
        atendimentosHoje: (atendHoje.data as any[]).filter((a)=>!["cancelado","nao_compareceu"].includes(a.status)).length,
        faturamentoHoje: fechadasHoje.reduce((s,c)=>s+Number(c.total),0),
        recebidoHoje,
        comandasAbertas: lista.filter((c)=>c.status==="aberta").length,
        faturamentoMes,
        servicosRealizadosMes: (concluidosMes.data as any[]).length,
        produtosVendidosMes: produtosVendidos,
        ticketMedio: fechadas.length ? faturamentoMes/fechadas.length : 0,
        porForma,
      };
    },
  });
}
