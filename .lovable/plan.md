# Valeria Hair Agendamentos — Primeira Entrega

App de agendamentos para salão, mobile-first e instalável no celular, com a **Agenda como centro da experiência**. Multi-salão desde o primeiro dia: cada salão tem seu nome, cores e horários próprios, e nenhum salão enxerga dados de outro. O projeto hoje é um starter vazio, então tudo é construído do zero. O backend (Lovable Cloud) já está ligado.

## O que entra nesta entrega

1. **Entrar no sistema** com e-mail e senha. Sem botão de criar conta — quem não foi cadastrado não entra.
2. **Configuração inicial do salão** — quem entra e ainda não tem salão passa por um fluxo simples e bonito de "vamos configurar seu salão" (nome, responsável, contatos, horário de funcionamento, intervalo da agenda, cor). Nada de jargão sobre multi-salão.
3. **Agenda Dia e Semana** — grade de horários gerada pelo horário de funcionamento do salão, navegação `< HOJE >`, seletor de data, card com horário, cliente, serviço, duração e status na cor do serviço.
4. **Agendar de verdade** — tocar num horário vazio já abre a criação com data e hora preenchidas; tocar num agendamento abre os detalhes. Ações: confirmar, iniciar atendimento, concluir, reagendar, cancelar.
5. **Cliente novo sem sair do agendamento** — busca por nome ou telefone com opção "+ Nova cliente" ali mesmo.
6. **Clientes** — busca, lista em cards, cadastro e edição.
7. **Serviços** — nome, descrição, duração, preço, custo estimado, cor, dias para retorno, ativo.
8. **Configurações do salão** — todos os dados do salão editáveis; o nome do salão aparece no app no lugar de um nome fixo.
9. **Instalável no celular** (PWA) com ícone e cores da marca.

Não entra agora (mas nada na base impede depois): comandas, pagamentos, produtos/estoque, pacotes, retorno inteligente, WhatsApp automático, aniversários, financeiro, vários profissionais, comissão, link público.

## Identidade visual

Fundo `#FAF8F5`, texto `#292524`, ação `#C1622D`, sucesso `#8A9A7E`, aviso `#C9962C`, erro `#B3492F`. Cantos `rounded-xl`, sombras discretas, bastante respiro, animações sutis, ícones lucide. Títulos em Fraunces, corpo em Inter. Clima de salão premium e acolhedor — nada de roxo de SaaS nem cara de painel corporativo.

## Navegação

- **Celular:** barra inferior com Agenda · Clientes · Comandas · Mais, e botão **+** central (Novo agendamento / Nova cliente). Comandas aparece elegante e discretamente marcada como "em breve", sem tela quebrada.
- **Desktop:** menu lateral com os mesmos itens.
- Entrar no app cai direto na Agenda, com um cabeçalho pequeno: saudação com o nome da responsável e cards compactos de atendimentos de hoje, próximos e concluídos — tudo calculado dos próprios agendamentos.

## Telas e rotas

| Rota | Conteúdo |
|---|---|
| `/` | Manda para a Agenda, para o login ou para a configuração inicial |
| `/auth` | Entrar (e-mail e senha) |
| `/configurar-salao` | Configuração inicial do salão |
| `/agenda` | Agenda Dia e Semana (tela principal) |
| `/clientes` | Busca, lista, cadastro e edição |
| `/servicos` | Cadastro e edição de serviços |
| `/mais` | Atalhos: serviços, configurações, sair |
| `/configuracoes` | Dados do salão |
| `/comandas` | Tela de "em breve" contida e elegante |

---

## Detalhes técnicos

### Banco (migração inicial única)

```text
saloes(id, nome, nome_responsavel, telefone, whatsapp, email, logo_url,
       endereco, cor_primaria, horario_abertura time, horario_fechamento time,
       intervalo_agenda_minutos int default 30, ativo bool, created_at, updated_at)

usuarios_saloes(id, user_id uuid, salao_id -> saloes, papel papel_salao default 'owner',
                created_at)  UNIQUE(user_id, salao_id)
  enum papel_salao: owner | admin | profissional | recepcao

clientes(id, salao_id, nome, telefone, whatsapp, data_nascimento date,
         observacoes, created_at, updated_at)

servicos(id, salao_id, nome, descricao, duracao_minutos int, preco numeric(10,2),
         custo_estimado numeric(10,2), cor text, dias_para_retorno int,
         ativo bool default true, created_at, updated_at)

agendamentos(id, salao_id, cliente_id -> clientes, servico_id -> servicos,
             data date, hora_inicio time, hora_fim time,
             status status_agendamento default 'agendado', observacoes,
             created_at, updated_at)
  enum status_agendamento: agendado | confirmado | em_atendimento | concluido
                           | cancelado | nao_compareceu
  CHECK (hora_fim > hora_inicio)
```

FKs: `salao_id` com `ON DELETE CASCADE`; `cliente_id` e `servico_id` com `ON DELETE RESTRICT` (não apagar histórico). `updated_at` por trigger compartilhado.

Índices: `usuarios_saloes(user_id)`, `usuarios_saloes(salao_id)`, `clientes(salao_id, nome)`, `clientes(salao_id, telefone)`, `servicos(salao_id) where ativo`, e o principal `agendamentos(salao_id, data, hora_inicio)` mais `agendamentos(cliente_id)` e `agendamentos(salao_id, status)`.

**Conflito de horário no banco:** extensão `btree_gist` + `EXCLUDE USING gist (salao_id WITH =, data WITH =, timerange(hora_inicio, hora_fim) WITH &&) WHERE (status NOT IN ('cancelado','nao_compareceu'))`. Cancelado não bloqueia horário. A checagem na tela é conveniência; o banco é a garantia contra dois celulares agendando o mesmo horário ao mesmo tempo.

### RLS sem recursão

O risco clássico: uma policy de `usuarios_saloes` que consulta `usuarios_saloes` entra em recursão. Solução:

```sql
create function public.pertence_ao_salao(_salao_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios_saloes
                 where user_id = auth.uid() and salao_id = _salao_id) $$;
```

`security definer` ignora RLS dentro da função, quebrando o ciclo. Uma função irmã `papel_no_salao(_salao_id)` fica pronta para permissões futuras.

- `usuarios_saloes`: policies **diretas** (`user_id = auth.uid()`), nunca via subconsulta na própria tabela.
- `saloes`: leitura/edição se `pertence_ao_salao(id)`; inserção livre para autenticado (é o bootstrap), com trigger `after insert` criando o vínculo `owner` do criador automaticamente — assim o salão nunca nasce órfão e o app não precisa de duas chamadas.
- `clientes`, `servicos`, `agendamentos`: as quatro operações usando `pertence_ao_salao(salao_id)` em `using` e `with check`.
- `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated` e `GRANT ALL TO service_role` em cada tabela. **Nenhum acesso `anon`.**
- Papel fica só em `usuarios_saloes`, nunca numa tabela de perfil.

Sem dados demo: o onboarding já deixa o salão utilizável e dados falsos poluiriam a agenda real.

### Sem cadastro público / primeiro acesso

A tela de login só faz login. A primeira conta é criada pela administração no painel do backend; o primeiro salão nasce do próprio onboarding dentro do app (o usuário logado sem vínculo é levado a `/configurar-salao`). Login por e-mail/senha precisa ser habilitado no backend na mesma entrega.

### Camada de dados e frontend

- Rotas protegidas por grupo autenticado; `AppShell` decide barra inferior (celular) ou lateral (desktop).
- `SalaoProvider` carrega salão + vínculo uma vez e serve nome, cores e horários ao app inteiro (nome do produto dinâmico).
- TanStack Query por recurso (`useAgendamentos(intervalo)`, `useClientes(busca)`, `useServicos`), leitura direta pelo cliente do navegador — o isolamento é do banco, não do filtro da tela. Invalidação após cada mutação; estado otimista em confirmar/concluir.
- Formulários com React Hook Form + Zod; toasts discretos (sonner); diálogo de confirmação para cancelar/excluir; skeletons e estados vazios que orientam a próxima ação.
- `salao_id` sempre injetado por uma camada única de mutação, para nunca escapar do isolamento.

### Componentes principais

`AgendaHeader` (setas, HOJE, seletor de data, alternância Dia/Semana) · `GradeDia` (slots gerados do horário do salão) · `GradeSemana` (7 colunas compactas, rolagem horizontal no celular) · `CardAgendamento` (cor do serviço + estado) · `SheetAgendamento` (criar/editar, hora fim calculada pela duração e editável, alerta de conflito) · `SeletorCliente` (autocomplete + nova cliente embutida) · `BotaoFlutuanteNovo` · `EstadoVazio` · `CardCliente` · `FormServico`.

### Datas, horas e dinheiro

Data como `date`, horas como `time` — nunca string formatada de UI. Tudo formatado em pt-BR com date-fns e locale `ptBR` (`dd/MM/yyyy`, `HH:mm`), moeda em R$ com `Intl.NumberFormat`. Semana começa na segunda. Toda conversão num módulo único (`lib/datas.ts`) para não espalhar erro de fuso — como data e hora são locais do salão, não há conversão de fuso silenciosa.

### PWA

`manifest.webmanifest` com nome, cores da marca e ícones 192/512 gerados e versionados no projeto (sem depender de asset externo), `theme-color`, e service worker leve com cache do app shell — sem cache de dados, para a agenda nunca mostrar informação velha.

### Sequência de implementação

1. Tema, fontes e tokens de cor + fontes via `<link>` na raiz.
2. Migração única: extensão, enums, tabelas, grants, índices, restrição anti-conflito, funções e policies.
3. Habilitar login por e-mail/senha; tela `/auth`; rotas protegidas; redirecionamento do `/`.
4. Onboarding do salão + `SalaoProvider`.
5. `AppShell`: barra inferior, sidebar, botão +.
6. Serviços (pré-requisito para agendar).
7. Clientes + cadastro rápido.
8. Agenda Dia → sheet de agendamento com conflito → ações de status → Agenda Semana.
9. Cabeçalho com saudação e cards do dia.
10. Configurações do salão.
11. PWA (manifesto, ícones, service worker).
12. Verificação no navegador do fluxo ponta a ponta e teste de isolamento entre dois salões.

### Riscos e decisões importantes

- **Isolamento vive no banco.** Toda tabela carrega `salao_id`, toda policy passa pela função de vínculo, nenhum acesso anônimo. Filtro de tela é só usabilidade.
- **Recursão de RLS** é evitada por `security definer` + policies diretas em `usuarios_saloes`. Esse é o ponto mais delicado do schema.
- **Conflito de agenda** garantido por restrição do banco, não só pela tela; cancelado e não compareceu liberam o horário.
- **Bootstrap sem cadastro público** depende de um passo manual para criar a primeira conta — operacional, não de código. Vale confirmar quem fará isso.
- **Uma agenda por salão nesta entrega.** `agendamentos` receberá `profissional_id` depois sem quebrar dados; hoje a grade é única, e trocar para várias colunas exige rever a restrição de conflito (passará a incluir o profissional).
- **Comandas aparece na barra inferior** sem existir ainda; será um estado "em breve" cuidado, não um placeholder feio.
- **Service worker mal configurado** é a causa mais comum de "o app não atualiza". Decisão: cachear só o shell, nunca dados.
