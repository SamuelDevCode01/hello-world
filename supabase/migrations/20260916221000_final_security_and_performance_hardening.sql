create schema if not exists extensions;
alter extension btree_gist set schema extensions;

revoke all on function public.criar_templates_padrao_salao() from public, anon, authenticated;
revoke all on function public.recalcular_totais_comanda() from public, anon, authenticated;
revoke all on function public.papel_no_salao(uuid) from public, anon;
revoke all on function public.pertence_ao_salao(uuid) from public, anon;
grant execute on function public.papel_no_salao(uuid) to authenticated;
grant execute on function public.pertence_ao_salao(uuid) to authenticated;

drop policy if exists "usuario ve seus vinculos" on public.usuarios_saloes;
create policy "usuario ve seus vinculos" on public.usuarios_saloes
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "autenticado cria seu unico salao" on public.saloes;
create policy "autenticado cria seu unico salao" on public.saloes
for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and not exists (
    select 1 from public.usuarios_saloes us where us.user_id = (select auth.uid())
  )
);

-- Remove unique indexes duplicated by UNIQUE constraints.
drop index if exists public.uq_cliente_pacotes_id_salao;
drop index if exists public.uq_clientes_id_salao;
drop index if exists public.uq_comandas_id_salao;
drop index if exists public.uq_pacotes_id_salao;
drop index if exists public.uq_produtos_id_salao;
drop index if exists public.uq_servicos_id_salao;

-- Cover tenant-aware foreign keys and the main lookup paths used by the app.
create index if not exists idx_agendamentos_cliente_salao on public.agendamentos(cliente_id, salao_id);
create index if not exists idx_agendamentos_servico_salao on public.agendamentos(servico_id, salao_id);
create index if not exists idx_cliente_preferencias_cliente_salao on public.cliente_preferencias(cliente_id, salao_id);
create index if not exists idx_retornos_cliente_salao on public.retornos_ignorados(cliente_id, salao_id);
create index if not exists idx_retornos_servico_salao on public.retornos_ignorados(servico_id, salao_id);
create index if not exists idx_comandas_cliente_salao on public.comandas(cliente_id, salao_id);
create index if not exists idx_comandas_agendamento_salao on public.comandas(agendamento_id, salao_id) where agendamento_id is not null;
create index if not exists idx_comanda_itens_comanda_salao on public.comanda_itens(comanda_id, salao_id);
create index if not exists idx_comanda_itens_servico_salao on public.comanda_itens(servico_id, salao_id) where servico_id is not null;
create index if not exists idx_comanda_itens_produto_salao on public.comanda_itens(produto_id, salao_id) where produto_id is not null;
create index if not exists idx_pagamentos_comanda_salao on public.pagamentos(comanda_id, salao_id);
create index if not exists idx_movimentos_produto_salao on public.movimentacoes_estoque(produto_id, salao_id);
create index if not exists idx_movimentos_comanda_salao on public.movimentacoes_estoque(comanda_id, salao_id) where comanda_id is not null;
create index if not exists idx_pacote_itens_salao on public.pacote_itens(salao_id);
create index if not exists idx_pacote_itens_pacote_salao on public.pacote_itens(pacote_id, salao_id);
create index if not exists idx_pacote_itens_servico_salao on public.pacote_itens(servico_id, salao_id);
create index if not exists idx_cliente_pacotes_cliente_salao on public.cliente_pacotes(cliente_id, salao_id);
create index if not exists idx_cliente_pacotes_pacote_salao on public.cliente_pacotes(pacote_id, salao_id);
create index if not exists idx_cliente_pacote_usos_salao on public.cliente_pacote_usos(salao_id);
create index if not exists idx_cliente_pacote_usos_pacote_salao on public.cliente_pacote_usos(cliente_pacote_id, salao_id);
create index if not exists idx_cliente_pacote_usos_servico_salao on public.cliente_pacote_usos(servico_id, salao_id);
create index if not exists idx_cliente_pacote_usos_agendamento_salao on public.cliente_pacote_usos(agendamento_id, salao_id) where agendamento_id is not null;
