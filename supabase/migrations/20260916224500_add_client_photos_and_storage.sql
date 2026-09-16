alter table public.clientes add column if not exists foto_path text;

create or replace view public.vw_clientes_resumo
with (security_invoker = true) as
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
  ) as retorno_previsto,
  c.foto_path
from public.clientes c;

grant select on public.vw_clientes_resumo to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-clientes',
  'fotos-clientes',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "membros leem fotos clientes" on storage.objects;
create policy "membros leem fotos clientes"
on storage.objects for select to authenticated
using (
  bucket_id = 'fotos-clientes'
  and (storage.foldername(name))[1] in (
    select us.salao_id::text
    from public.usuarios_saloes us
    where us.user_id = (select auth.uid())
  )
);

drop policy if exists "membros enviam fotos clientes" on storage.objects;
create policy "membros enviam fotos clientes"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fotos-clientes'
  and (storage.foldername(name))[1] in (
    select us.salao_id::text
    from public.usuarios_saloes us
    where us.user_id = (select auth.uid())
  )
);

drop policy if exists "membros atualizam fotos clientes" on storage.objects;
create policy "membros atualizam fotos clientes"
on storage.objects for update to authenticated
using (
  bucket_id = 'fotos-clientes'
  and (storage.foldername(name))[1] in (
    select us.salao_id::text
    from public.usuarios_saloes us
    where us.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'fotos-clientes'
  and (storage.foldername(name))[1] in (
    select us.salao_id::text
    from public.usuarios_saloes us
    where us.user_id = (select auth.uid())
  )
);

drop policy if exists "membros removem fotos clientes" on storage.objects;
create policy "membros removem fotos clientes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'fotos-clientes'
  and (storage.foldername(name))[1] in (
    select us.salao_id::text
    from public.usuarios_saloes us
    where us.user_id = (select auth.uid())
  )
);
