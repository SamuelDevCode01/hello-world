create or replace function public.criar_templates_padrao_salao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.templates_mensagens(salao_id,nome,tipo,mensagem) values
  (new.id,'Confirmação','confirmacao','Olá, {nome}! Passando para confirmar seu horário em {data} às {hora} para {servico}.'),
  (new.id,'Retorno','retorno','Olá, {nome}! Tudo bem? 💛 Já está chegando o período recomendado para renovar seu {servico}. Se quiser, posso verificar um horário para você.'),
  (new.id,'Lembrete','lembrete','Olá, {nome}! Lembrando do seu horário em {data} às {hora} para {servico}.'),
  (new.id,'Aniversário','aniversario','Feliz aniversário, {nome}! 🎂 Desejamos um dia lindo para você!'),
  (new.id,'Pós-atendimento','pos_atendimento','Olá, {nome}! Foi um prazer atender você 💛 Se precisar de algo sobre seu {servico}, estou à disposição.');
  return new;
end;
$$;

insert into public.templates_mensagens(salao_id,nome,tipo,mensagem)
select s.id,'Pós-atendimento','pos_atendimento','Olá, {nome}! Foi um prazer atender você 💛 Se precisar de algo sobre seu {servico}, estou à disposição.'
from public.saloes s
where not exists (
  select 1 from public.templates_mensagens tm
  where tm.salao_id = s.id and tm.tipo = 'pos_atendimento'
);
