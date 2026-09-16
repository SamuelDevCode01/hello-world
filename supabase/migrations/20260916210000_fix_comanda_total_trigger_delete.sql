create or replace function public.recalcular_totais_comanda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_id := old.comanda_id;
  else
    v_id := new.comanda_id;
  end if;

  update public.comandas c
     set subtotal = coalesce((select sum(i.total) from public.comanda_itens i where i.comanda_id = v_id), 0),
         total = greatest(0, coalesce((select sum(i.total) from public.comanda_itens i where i.comanda_id = v_id), 0) - c.desconto),
         updated_at = now()
   where c.id = v_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.recalcular_totais_comanda() from public, anon;
