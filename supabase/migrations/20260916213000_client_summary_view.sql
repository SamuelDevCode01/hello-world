drop view if exists public.vw_clientes_resumo;
create view public.vw_clientes_resumo with (security_invoker = true) as
select
  c.id,
  c.salao_id,
  c.nome,
  c.telefone,
  c.whatsapp,
  c.data_nascimento,
  c.observacoes,
  (
    select max(a.data)
    from public.agendamentos a
    where a.cliente_id = c.id
      and a.salao_id = c.salao_id
      and a.status = 'concluido'
  ) as ultimo_atendimento,
  (
    select min(a.data)
    from public.agendamentos a
    where a.cliente_id = c.id
      and a.salao_id = c.salao_id
      and a.status in ('agendado','confirmado','em_atendimento')
      and a.data >= current_date
  ) as proximo_agendamento,
  (
    select min(r.retorno_previsto)
    from public.vw_retornos_clientes r
    where r.cliente_id = c.id
      and r.salao_id = c.salao_id
      and (r.ignorar_ate is null or r.ignorar_ate < current_date)
  ) as retorno_previsto
from public.clientes c;

grant select on public.vw_clientes_resumo to authenticated;
