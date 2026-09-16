alter table public.saloes
  add column if not exists owner_user_id uuid;

update public.saloes s
set owner_user_id = us.user_id
from public.usuarios_saloes us
where us.salao_id = s.id
  and us.papel = 'owner'
  and s.owner_user_id is null;

alter table public.saloes
  alter column owner_user_id set default auth.uid();

alter table public.saloes
  alter column owner_user_id set not null;

alter table public.saloes
  add constraint saloes_owner_user_id_fkey
  foreign key (owner_user_id) references auth.users(id) on delete cascade;

alter table public.saloes
  add constraint saloes_owner_user_id_key unique (owner_user_id);

alter table public.usuarios_saloes
  add constraint usuarios_saloes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.usuarios_saloes
  add constraint usuarios_saloes_user_id_key unique (user_id);

create or replace function public.vincular_criador_salao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio';
  end if;

  if new.owner_user_id is distinct from auth.uid() then
    raise exception 'O salao deve pertencer ao usuario autenticado';
  end if;

  insert into public.usuarios_saloes (user_id, salao_id, papel)
  values (auth.uid(), new.id, 'owner');

  return new;
end;
$$;

create or replace function public.proteger_owner_salao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Nao e permitido alterar o proprietario do salao';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_owner_salao on public.saloes;
create trigger trg_proteger_owner_salao
before update of owner_user_id on public.saloes
for each row execute function public.proteger_owner_salao();

drop policy if exists "autenticado cria salao" on public.saloes;
drop policy if exists "autenticado cria seu unico salao" on public.saloes;
create policy "autenticado cria seu unico salao" on public.saloes
for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and not exists (
    select 1 from public.usuarios_saloes us where us.user_id = auth.uid()
  )
);

drop policy if exists "membros editam seu salao" on public.saloes;
create policy "membros editam seu salao" on public.saloes
for update to authenticated
using (public.pertence_ao_salao(id))
with check (public.pertence_ao_salao(id));

revoke all on function public.proteger_owner_salao() from public, anon, authenticated;