create unique index if not exists uq_comandas_agendamento
on public.comandas(agendamento_id)
where agendamento_id is not null;
