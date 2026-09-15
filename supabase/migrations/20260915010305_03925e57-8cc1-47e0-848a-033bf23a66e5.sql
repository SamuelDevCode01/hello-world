-- 1) memberships: somente leitura pelo cliente
drop policy if exists "usuario cria seu vinculo" on public.usuarios_saloes;
drop policy if exists "usuario atualiza seu vinculo" on public.usuarios_saloes;
drop policy if exists "usuario remove seu vinculo" on public.usuarios_saloes;

revoke insert, update, delete on public.usuarios_saloes from authenticated;
grant select on public.usuarios_saloes to authenticated;
grant all on public.usuarios_saloes to service_role;

-- 2) integridade cross-tenant via FKs compostas
alter table public.clientes
  add constraint clientes_id_salao_key unique (id, salao_id);
alter table public.servicos
  add constraint servicos_id_salao_key unique (id, salao_id);

alter table public.agendamentos
  add constraint agendamentos_cliente_mesmo_salao
  foreign key (cliente_id, salao_id) references public.clientes (id, salao_id) on update cascade;
alter table public.agendamentos
  add constraint agendamentos_servico_mesmo_salao
  foreign key (servico_id, salao_id) references public.servicos (id, salao_id) on update cascade;