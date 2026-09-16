do $$ begin
  create type public.tipo_item_comanda as enum ('servico','produto');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.status_comanda as enum ('aberta','fechada','cancelada');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.forma_pagamento as enum ('dinheiro','pix','debito','credito','outro');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tipo_movimento_estoque as enum ('entrada','saida','venda','uso_interno','ajuste','perda');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.uso_produto as enum ('interno','venda','ambos');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.status_cliente_pacote as enum ('ativo','esgotado','expirado','cancelado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tipo_template_mensagem as enum ('confirmacao','lembrete','retorno','aniversario','pos_atendimento');
exception when duplicate_object then null; end $$;

create table if not exists public.cliente_preferencias (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  categoria text not null,
  valor text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cliente_preferencias_salao_cliente on public.cliente_preferencias(salao_id, cliente_id);

create table if not exists public.templates_mensagens (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  nome text not null,
  tipo public.tipo_template_mensagem not null,
  mensagem text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_templates_mensagens_salao_tipo on public.templates_mensagens(salao_id, tipo);

create table if not exists public.retornos_ignorados (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete cascade,
  ignorar_ate date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salao_id, cliente_id, servico_id)
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  nome text not null,
  categoria text,
  marca text,
  sku text,
  preco_custo numeric(12,2) not null default 0 check (preco_custo >= 0),
  preco_venda numeric(12,2) not null default 0 check (preco_venda >= 0),
  quantidade_atual numeric(12,3) not null default 0,
  estoque_minimo numeric(12,3) not null default 0 check (estoque_minimo >= 0),
  unidade text not null default 'un',
  uso public.uso_produto not null default 'ambos',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, salao_id),
  unique (salao_id, sku)
);
create index if not exists idx_produtos_salao_nome on public.produtos(salao_id, nome);
create index if not exists idx_produtos_salao_estoque on public.produtos(salao_id, quantidade_atual, estoque_minimo) where ativo;

create table if not exists public.comandas (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  status public.status_comanda not null default 'aberta',
  subtotal numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  total numeric(12,2) not null default 0,
  observacoes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, salao_id)
);
create index if not exists idx_comandas_salao_status on public.comandas(salao_id, status, opened_at desc);
create index if not exists idx_comandas_cliente on public.comandas(cliente_id, opened_at desc);

create table if not exists public.comanda_itens (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  comanda_id uuid not null references public.comandas(id) on delete cascade,
  tipo public.tipo_item_comanda not null,
  servico_id uuid references public.servicos(id) on delete restrict,
  produto_id uuid references public.produtos(id) on delete restrict,
  descricao text not null,
  quantidade numeric(12,3) not null default 1 check (quantidade > 0),
  valor_unitario numeric(12,2) not null check (valor_unitario >= 0),
  total numeric(12,2) generated always as (round((quantidade * valor_unitario)::numeric, 2)) stored,
  created_at timestamptz not null default now(),
  check ((tipo = 'servico' and servico_id is not null and produto_id is null) or (tipo = 'produto' and produto_id is not null and servico_id is null))
);
create index if not exists idx_comanda_itens_comanda on public.comanda_itens(comanda_id);
create index if not exists idx_comanda_itens_salao on public.comanda_itens(salao_id);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  comanda_id uuid not null references public.comandas(id) on delete cascade,
  forma_pagamento public.forma_pagamento not null,
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_pagamentos_salao_data on public.pagamentos(salao_id, created_at desc);
create index if not exists idx_pagamentos_comanda on public.pagamentos(comanda_id);

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  tipo public.tipo_movimento_estoque not null,
  quantidade numeric(12,3) not null check (quantidade <> 0),
  motivo text,
  comanda_id uuid references public.comandas(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_mov_estoque_salao_produto on public.movimentacoes_estoque(salao_id, produto_id, created_at desc);
create unique index if not exists idx_mov_estoque_venda_unica on public.movimentacoes_estoque(comanda_id, produto_id) where tipo = 'venda' and comanda_id is not null;

create table if not exists public.pacotes (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(12,2) not null default 0 check (preco >= 0),
  validade_dias integer not null default 90 check (validade_dias > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, salao_id)
);
create index if not exists idx_pacotes_salao_ativo on public.pacotes(salao_id, ativo);

create table if not exists public.pacote_itens (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  pacote_id uuid not null references public.pacotes(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  created_at timestamptz not null default now(),
  unique (pacote_id, servico_id)
);
create index if not exists idx_pacote_itens_pacote on public.pacote_itens(pacote_id);

create table if not exists public.cliente_pacotes (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  pacote_id uuid not null references public.pacotes(id) on delete restrict,
  data_compra date not null default current_date,
  data_validade date not null,
  valor_pago numeric(12,2) not null check (valor_pago >= 0),
  status public.status_cliente_pacote not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, salao_id)
);
create index if not exists idx_cliente_pacotes_salao_cliente on public.cliente_pacotes(salao_id, cliente_id, status);

create table if not exists public.cliente_pacote_usos (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes(id) on delete cascade,
  cliente_pacote_id uuid not null references public.cliente_pacotes(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  quantidade integer not null default 1 check (quantidade > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_cliente_pacote_usos_pacote on public.cliente_pacote_usos(cliente_pacote_id, servico_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cliente_preferencias','templates_mensagens','retornos_ignorados','produtos','comandas','pacotes','cliente_pacotes']
  LOOP
    EXECUTE format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    EXECUTE format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cliente_preferencias','templates_mensagens','retornos_ignorados','produtos','comandas','comanda_itens','pagamentos','movimentacoes_estoque','pacotes','pacote_itens','cliente_pacotes','cliente_pacote_usos']
  LOOP
    EXECUTE format('alter table public.%I enable row level security', t);
    EXECUTE format('grant select, insert, update, delete on public.%I to authenticated', t);
    EXECUTE format('grant all on public.%I to service_role', t);
    EXECUTE format('drop policy if exists "membros acessam %s" on public.%I', t, t);
    EXECUTE format('create policy "membros acessam %s" on public.%I for all to authenticated using (public.pertence_ao_salao(salao_id)) with check (public.pertence_ao_salao(salao_id))', t, t);
  END LOOP;
END $$;

create or replace function public.recalcular_totais_comanda()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := coalesce(new.comanda_id, old.comanda_id);
  update public.comandas c
     set subtotal = coalesce((select sum(i.total) from public.comanda_itens i where i.comanda_id = v_id),0),
         total = greatest(0, coalesce((select sum(i.total) from public.comanda_itens i where i.comanda_id = v_id),0) - c.desconto),
         updated_at = now()
   where c.id = v_id;
  return coalesce(new, old);
end; $$;
drop trigger if exists trg_recalcular_comanda on public.comanda_itens;
create trigger trg_recalcular_comanda after insert or update or delete on public.comanda_itens for each row execute function public.recalcular_totais_comanda();

create or replace function public.recalcular_desconto_comanda()
returns trigger language plpgsql set search_path = public as $$
begin
  new.total := greatest(0, new.subtotal - new.desconto);
  return new;
end; $$;
drop trigger if exists trg_recalcular_desconto_comanda on public.comandas;
create trigger trg_recalcular_desconto_comanda before update of desconto on public.comandas for each row execute function public.recalcular_desconto_comanda();

create or replace function public.movimentar_estoque(
  p_produto_id uuid,
  p_tipo public.tipo_movimento_estoque,
  p_quantidade numeric,
  p_motivo text default null,
  p_comanda_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_salao uuid; v_delta numeric; v_atual numeric; v_id uuid;
begin
  if p_quantidade <= 0 then raise exception 'Quantidade deve ser maior que zero'; end if;
  select salao_id, quantidade_atual into v_salao, v_atual from public.produtos where id = p_produto_id for update;
  if v_salao is null or not public.pertence_ao_salao(v_salao) then raise exception 'Produto não encontrado'; end if;
  v_delta := case when p_tipo = 'entrada' then p_quantidade when p_tipo = 'ajuste' then p_quantidade else -p_quantidade end;
  if v_atual + v_delta < 0 then raise exception 'Estoque insuficiente'; end if;
  update public.produtos set quantidade_atual = quantidade_atual + v_delta where id = p_produto_id;
  insert into public.movimentacoes_estoque(salao_id, produto_id, tipo, quantidade, motivo, comanda_id)
  values(v_salao, p_produto_id, p_tipo, v_delta, p_motivo, p_comanda_id) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.fechar_comanda(p_comanda_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare v_salao uuid; v_total numeric; v_pago numeric; r record;
begin
  select salao_id, total into v_salao, v_total from public.comandas where id = p_comanda_id and status = 'aberta' for update;
  if v_salao is null or not public.pertence_ao_salao(v_salao) then raise exception 'Comanda não encontrada'; end if;
  select coalesce(sum(valor),0) into v_pago from public.pagamentos where comanda_id = p_comanda_id;
  if abs(v_pago - v_total) > 0.009 then raise exception 'Pagamentos devem totalizar o valor da comanda'; end if;
  for r in select produto_id, sum(quantidade) quantidade from public.comanda_itens where comanda_id = p_comanda_id and tipo = 'produto' group by produto_id loop
    if not exists (select 1 from public.movimentacoes_estoque where comanda_id = p_comanda_id and produto_id = r.produto_id and tipo = 'venda') then
      perform public.movimentar_estoque(r.produto_id, 'venda', r.quantidade, 'Venda em comanda', p_comanda_id);
    end if;
  end loop;
  update public.comandas set status = 'fechada', closed_at = now(), updated_at = now() where id = p_comanda_id;
end; $$;

create or replace function public.consumir_pacote(
  p_cliente_pacote_id uuid,
  p_servico_id uuid,
  p_agendamento_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_salao uuid; v_status public.status_cliente_pacote; v_validade date; v_limite int; v_usado int; v_id uuid; v_restante int;
begin
  select salao_id, status, data_validade into v_salao, v_status, v_validade from public.cliente_pacotes where id = p_cliente_pacote_id for update;
  if v_salao is null or not public.pertence_ao_salao(v_salao) then raise exception 'Pacote não encontrado'; end if;
  if v_status <> 'ativo' or v_validade < current_date then raise exception 'Pacote indisponível'; end if;
  select coalesce(sum(pi.quantidade),0) into v_limite from public.pacote_itens pi join public.cliente_pacotes cp on cp.pacote_id = pi.pacote_id where cp.id = p_cliente_pacote_id and pi.servico_id = p_servico_id;
  select coalesce(sum(u.quantidade),0) into v_usado from public.cliente_pacote_usos u where u.cliente_pacote_id = p_cliente_pacote_id and u.servico_id = p_servico_id;
  if v_limite <= v_usado then raise exception 'Saldo do serviço esgotado'; end if;
  insert into public.cliente_pacote_usos(salao_id, cliente_pacote_id, servico_id, agendamento_id, quantidade)
  values(v_salao, p_cliente_pacote_id, p_servico_id, p_agendamento_id, 1) returning id into v_id;
  select coalesce(sum(pi.quantidade),0) - coalesce((select sum(u.quantidade) from public.cliente_pacote_usos u where u.cliente_pacote_id = p_cliente_pacote_id),0)
    into v_restante from public.pacote_itens pi join public.cliente_pacotes cp on cp.pacote_id = pi.pacote_id where cp.id = p_cliente_pacote_id;
  if v_restante <= 0 then update public.cliente_pacotes set status = 'esgotado' where id = p_cliente_pacote_id; end if;
  return v_id;
end; $$;

revoke all on function public.movimentar_estoque(uuid, public.tipo_movimento_estoque, numeric, text, uuid) from public, anon;
revoke all on function public.fechar_comanda(uuid) from public, anon;
revoke all on function public.consumir_pacote(uuid, uuid, uuid) from public, anon;
grant execute on function public.movimentar_estoque(uuid, public.tipo_movimento_estoque, numeric, text, uuid) to authenticated;
grant execute on function public.fechar_comanda(uuid) to authenticated;
grant execute on function public.consumir_pacote(uuid, uuid, uuid) to authenticated;

drop view if exists public.vw_retornos_clientes;
create view public.vw_retornos_clientes with (security_invoker = true) as
select distinct on (a.salao_id, a.cliente_id, a.servico_id)
  a.salao_id,
  a.cliente_id,
  c.nome as cliente_nome,
  c.whatsapp,
  c.telefone,
  a.servico_id,
  s.nome as servico_nome,
  a.data as ultimo_atendimento,
  (a.data + s.dias_para_retorno) as retorno_previsto,
  ri.ignorar_ate
from public.agendamentos a
join public.clientes c on c.id = a.cliente_id
join public.servicos s on s.id = a.servico_id
left join public.retornos_ignorados ri on ri.salao_id = a.salao_id and ri.cliente_id = a.cliente_id and ri.servico_id = a.servico_id
where a.status = 'concluido' and coalesce(s.dias_para_retorno,0) > 0
order by a.salao_id, a.cliente_id, a.servico_id, a.data desc, a.hora_fim desc;
grant select on public.vw_retornos_clientes to authenticated;

create or replace function public.criar_templates_padrao_salao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.templates_mensagens(salao_id,nome,tipo,mensagem) values
  (new.id,'Confirmação','confirmacao','Olá, {nome}! Passando para confirmar seu horário em {data} às {hora} para {servico}.'),
  (new.id,'Retorno','retorno','Olá, {nome}! Tudo bem? 💛 Já está chegando o período recomendado para renovar seu {servico}. Se quiser, posso verificar um horário para você.'),
  (new.id,'Lembrete','lembrete','Olá, {nome}! Lembrando do seu horário em {data} às {hora} para {servico}.'),
  (new.id,'Aniversário','aniversario','Feliz aniversário, {nome}! 🎂 Desejamos um dia lindo para você!')
  on conflict do nothing;
  return new;
end; $$;
drop trigger if exists trg_templates_padrao_salao on public.saloes;
create trigger trg_templates_padrao_salao after insert on public.saloes for each row execute function public.criar_templates_padrao_salao();

insert into public.templates_mensagens(salao_id,nome,tipo,mensagem)
select s.id, x.nome, x.tipo::public.tipo_template_mensagem, x.mensagem from public.saloes s
cross join (values
 ('Confirmação','confirmacao','Olá, {nome}! Passando para confirmar seu horário em {data} às {hora} para {servico}.'),
 ('Retorno','retorno','Olá, {nome}! Tudo bem? 💛 Já está chegando o período recomendado para renovar seu {servico}. Se quiser, posso verificar um horário para você.'),
 ('Lembrete','lembrete','Olá, {nome}! Lembrando do seu horário em {data} às {hora} para {servico}.'),
 ('Aniversário','aniversario','Feliz aniversário, {nome}! 🎂 Desejamos um dia lindo para você!')
) as x(nome,tipo,mensagem)
where not exists (select 1 from public.templates_mensagens tm where tm.salao_id=s.id and tm.tipo=x.tipo::public.tipo_template_mensagem);
