create or replace function public.cancelar_comanda(p_comanda_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_salao uuid;
begin
  select salao_id into v_salao
    from public.comandas
   where id = p_comanda_id and status = 'aberta'
   for update;

  if v_salao is null or not public.pertence_ao_salao(v_salao) then
    raise exception 'Comanda aberta não encontrada';
  end if;

  if exists (select 1 from public.pagamentos where comanda_id = p_comanda_id) then
    raise exception 'Remova os pagamentos registrados antes de cancelar';
  end if;

  update public.comandas
     set status = 'cancelada', closed_at = now(), updated_at = now()
   where id = p_comanda_id;
end;
$$;

revoke all on function public.cancelar_comanda(uuid) from public, anon;
grant execute on function public.cancelar_comanda(uuid) to authenticated;
