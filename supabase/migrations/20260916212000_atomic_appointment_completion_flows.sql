create or replace function public.concluir_agendamento_com_comanda(p_agendamento_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_salao uuid;
  v_cliente uuid;
  v_servico uuid;
  v_servico_nome text;
  v_preco numeric;
  v_comanda uuid;
begin
  select a.salao_id, a.cliente_id, a.servico_id
    into v_salao, v_cliente, v_servico
    from public.agendamentos a
   where a.id = p_agendamento_id
   for update;

  if v_salao is null or not public.pertence_ao_salao(v_salao) then
    raise exception 'Agendamento não encontrado';
  end if;

  select c.id into v_comanda
    from public.comandas c
   where c.agendamento_id = p_agendamento_id
   limit 1;

  if v_comanda is null then
    select s.nome, s.preco into v_servico_nome, v_preco
      from public.servicos s
     where s.id = v_servico and s.salao_id = v_salao;

    insert into public.comandas(salao_id, cliente_id, agendamento_id)
    values(v_salao, v_cliente, p_agendamento_id)
    returning id into v_comanda;

    insert into public.comanda_itens(
      salao_id, comanda_id, tipo, servico_id, descricao, quantidade, valor_unitario
    ) values (
      v_salao, v_comanda, 'servico', v_servico, coalesce(v_servico_nome, 'Serviço'), 1, coalesce(v_preco, 0)
    );
  end if;

  update public.agendamentos
     set status = 'concluido', updated_at = now()
   where id = p_agendamento_id;

  return v_comanda;
end;
$$;

create or replace function public.concluir_agendamento_com_pacote(
  p_agendamento_id uuid,
  p_cliente_pacote_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_salao uuid;
  v_cliente uuid;
  v_servico uuid;
  v_cp_cliente uuid;
  v_cp_salao uuid;
  v_uso uuid;
begin
  select a.salao_id, a.cliente_id, a.servico_id
    into v_salao, v_cliente, v_servico
    from public.agendamentos a
   where a.id = p_agendamento_id
   for update;

  if v_salao is null or not public.pertence_ao_salao(v_salao) then
    raise exception 'Agendamento não encontrado';
  end if;

  select cp.cliente_id, cp.salao_id
    into v_cp_cliente, v_cp_salao
    from public.cliente_pacotes cp
   where cp.id = p_cliente_pacote_id
   for update;

  if v_cp_cliente is distinct from v_cliente or v_cp_salao is distinct from v_salao then
    raise exception 'Pacote não pertence à cliente deste agendamento';
  end if;

  v_uso := public.consumir_pacote(p_cliente_pacote_id, v_servico, p_agendamento_id);

  update public.agendamentos
     set status = 'concluido', updated_at = now()
   where id = p_agendamento_id;

  return v_uso;
end;
$$;

revoke all on function public.concluir_agendamento_com_comanda(uuid) from public, anon;
revoke all on function public.concluir_agendamento_com_pacote(uuid, uuid) from public, anon;
grant execute on function public.concluir_agendamento_com_comanda(uuid) to authenticated;
grant execute on function public.concluir_agendamento_com_pacote(uuid, uuid) to authenticated;
