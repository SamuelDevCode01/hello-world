create extension if not exists btree_gist;

create type public.papel_salao as enum ('owner','admin','profissional','recepcao');
create type public.status_agendamento as enum ('agendado','confirmado','em_atendimento','concluido','cancelado','nao_compareceu');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- SALOES
create table public.saloes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_responsavel text,
  telefone text,
  whatsapp text,
  email text,
  logo_url text,
  endereco text,
  cor_primaria text not null default '#C1622D',
  horario_abertura time not null default '09:00',
  horario_fechamento time not null default '19:00',
  intervalo_agenda_minutos integer not null default 30 check (intervalo_agenda_minutos between 5 and 240),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (horario_fechamento > horario_abertura)
);
grant select, insert, update, delete on public.saloes to authenticated;
grant all on public.saloes to service_role;
alter table public.saloes enable row level security;

-- USUARIOS_SALOES
create table public.usuarios_saloes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  salao_id uuid not null references public.saloes(id) on delete cascade,
  papel public.papel_salao not null default 'owner',
  created_at timestamptz not null default now(),
  unique (user_id, salao_id)
);
grant select, insert, update, delete on public.usuarios_saloes to authenticated;
grant all on public.usuarios_saloes to service_role;
alter table public.usuarios_saloes enable row level security;

create index idx_usuarios_saloes_user on public.usuarios_saloes(user_id);
create index idx_usuarios_saloes_salao on public.usuarios_saloes(salao_id);

-- helpers (security definer => sem recursao de policy)
create or replace function public.pertence_ao_salao(_salao_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.usuarios_saloes
    where user_id = auth.uid() and salao_id = _salao_id
  );
$$;

create or replace function public.papel_no_salao(_salao_id uuid)
returns public.papel_salao language sql stable security definer set search_path = public as $$
  select papel from public.usuarios_saloes
  where user_id = auth.uid() and salao_id = _salao_id limit 1;
$$;

-- vinculo automatico do criador como owner
create or replace function public.vincular_criador_salao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into public.usuarios_saloes (user_id, salao_id, papel)
    values (auth.uid(), new.id, 'owner')
    on conflict (user_id, salao_id) do nothing;
  end if;
  return new;
end; $$;

create trigger trg_vincular_criador_salao
after insert on public.saloes
for each row execute function public.vincular_criador_salao();

create trigger trg_saloes_updated_at before update on public.saloes
for each row execute function public.set_updated_at();

create policy "membros veem seu salao" on public.saloes
for select to authenticated using (public.pertence_ao_salao(id));
create policy "autenticado cria salao" on public.saloes
for insert to authenticated with check (true);
create policy "membros editam seu salao" on public.saloes
for update to authenticated using (public.pertence_ao_salao(id)) with check (public.pertence_ao_salao(id));
create policy "owner exclui salao" on public.saloes
for delete to authenticated using (public.papel_no_salao(id) = 'owner');

create policy "usuario ve seus vinculos" on public.usuarios_saloes
for select to authenticated using (user_id = auth.uid() or public.pertence_ao_salao(salao_id));
create policy "usuario cria seu vinculo" on public.usuarios_saloes
for insert to authenticated with check (user_id = auth.uid());
create policy "usuario atualiza seu vinculo" on public.usuarios_saloes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "usuario remove seu vinculo" on public.usuarios_saloes
for delete to authenticated using (user_id = auth.uid());

-- CLIENTES
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  nome text not null,
  telefone text,
  whatsapp text,
  data_nascimento date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clientes to authenticated;
grant all on public.clientes to service_role;
alter table public.clientes enable row level security;
create index idx_clientes_salao_nome on public.clientes(salao_id, nome);
create index idx_clientes_salao_telefone on public.clientes(salao_id, telefone);
create trigger trg_clientes_updated_at before update on public.clientes
for each row execute function public.set_updated_at();
create policy "membros acessam clientes" on public.clientes
for all to authenticated using (public.pertence_ao_salao(salao_id)) with check (public.pertence_ao_salao(salao_id));

-- SERVICOS
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  nome text not null,
  descricao text,
  duracao_minutos integer not null default 60 check (duracao_minutos > 0),
  preco numeric(10,2) not null default 0 check (preco >= 0),
  custo_estimado numeric(10,2) check (custo_estimado >= 0),
  cor text not null default '#C1622D',
  dias_para_retorno integer check (dias_para_retorno >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.servicos to authenticated;
grant all on public.servicos to service_role;
alter table public.servicos enable row level security;
create index idx_servicos_salao_ativo on public.servicos(salao_id) where ativo;
create trigger trg_servicos_updated_at before update on public.servicos
for each row execute function public.set_updated_at();
create policy "membros acessam servicos" on public.servicos
for all to authenticated using (public.pertence_ao_salao(salao_id)) with check (public.pertence_ao_salao(salao_id));

-- AGENDAMENTOS
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  status public.status_agendamento not null default 'agendado',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hora_fim > hora_inicio),
  constraint agendamentos_sem_conflito exclude using gist (
    salao_id with =,
    tsrange((data + hora_inicio), (data + hora_fim), '[)') with &&
  ) where (status not in ('cancelado','nao_compareceu'))
);
grant select, insert, update, delete on public.agendamentos to authenticated;
grant all on public.agendamentos to service_role;
alter table public.agendamentos enable row level security;
create index idx_agendamentos_salao_data on public.agendamentos(salao_id, data, hora_inicio);
create index idx_agendamentos_cliente on public.agendamentos(cliente_id);
create index idx_agendamentos_salao_status on public.agendamentos(salao_id, status);
create trigger trg_agendamentos_updated_at before update on public.agendamentos
for each row execute function public.set_updated_at();
create policy "membros acessam agendamentos" on public.agendamentos
for all to authenticated using (public.pertence_ao_salao(salao_id)) with check (public.pertence_ao_salao(salao_id));