# Valeria Hair Agendamentos — primeira entrega

## Concluído
- [x] Banco: saloes, usuarios_saloes, clientes, servicos, agendamentos (FKs, índices, created_at/updated_at)
- [x] RLS por salao_id com funções auxiliares (sem recursão) + GRANTs
- [x] Conflito de horário garantido no banco (EXCLUDE gist; cancelado/não compareceu liberam)
- [x] Login por e-mail/senha, sem cadastro público
- [x] Onboarding do primeiro salão (vínculo owner automático por trigger)
- [x] Layout: sidebar desktop + barra inferior mobile
- [x] Agenda Dia e Semana, criar/editar/confirmar/iniciar/concluir/não compareceu/cancelar/excluir
- [x] Cadastro rápido de cliente dentro do agendamento
- [x] Clientes: busca, lista, cadastro/edição
- [x] Serviços: cadastro/edição (duração, preço, custo, cor, retorno, ativo)
- [x] Configurações do salão
- [x] Comandas: tela "em preparação"
- [x] PWA instalável (manifest, ícones, tema) sem cache de dados
- [x] Typecheck e build limpos

## Pendente (operacional, fora do código)
- [ ] Criar a primeira conta de acesso no painel de usuários do backend
