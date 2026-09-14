# Valeria Hair Agendamentos — Primeira Entrega

Sistema de agendamentos para salão, multi-salão (multi-tenant) desde o primeiro dia, com a **Agenda como centro da experiência**. Projeto hoje está vazio (template limpo, sem backend ativo): tudo abaixo é construção nova.

## O que a primeira entrega inclui

1. **Login** (sem cadastro público) — quem não tem conta não entra.
2. **Configuração inicial do salão** — na primeira entrada, a pessoa cria o salão: nome, fuso, horário de funcionamento, duração padrão de atendimento.
3. **Agenda diária e semanal** — visão principal, navegação por dia/semana, "hoje", horários livres e ocupados.
4. **Agendamento** — criar, editar, cancelar e concluir.
5. **Cadastro rápido de cliente** — dentro do próprio fluxo de agendamento (nome + telefone), sem sair da tela.
6. **Serviços** — cadastro básico: nome, duração, preço, ativo/inativo.

Fora do escopo desta entrega (mas a estrutura já comporta): financeiro, comissões, relatórios, lembretes por WhatsApp, agendamento pelo cliente final, múltiplos profissionais com agenda separada.

## Identidade visual

- Fundo `#FAF8F5`, texto `#292524`, ação `#C1622D`, sucesso `#8A9A7E`, aviso `#C9962C`, erro `#B3492F`.
- Cantos `rounded-xl`, sombras discretas.
- Títulos em Fraunces, corpo em Inter.
- Nada de roxo/lilás genérico. Todas as cores viram tokens do tema (nenhuma cor solta nos componentes).

## Navegação

- **Celular:** barra inferior com Agenda · Clientes · Serviços · Ajustes. Agenda abre por padrão.
- **Desktop:** menu lateral fixo com os mesmos itens e área de conteúdo larga.
- Layout pensado primeiro para o celular; a tela grande é uma expansão, não o contrário.

## Telas

| Rota | Conteúdo |
|---|---|
| `/` | Redireciona para a agenda ou para o login |
| `/auth` | Login (e-mail e senha) |
| `/onboarding` | Criação do salão na primeira entrada |
| `/agenda` | Agenda diária e semanal |
| `/clientes` | Lista e busca de clientes |
| `/servicos` | Lista e cadastro de serviços |
| `/ajustes` | Dados do salão e sair |

---

## Detalhes técnicos

### Stack
React + Vite + TypeScript, Tailwind + shadcn/ui, TanStack Router/Query, Supabase (Postgres, Auth, RLS), date-fns, lucide-react, React Hook Form + Zod. Backend: Lovable Cloud (ativado nesta entrega).

### Banco de dados (migração inicial)

```text
saloes (id, nome, timezone='America/Sao_Paulo', telefone, hora_abertura,
        hora_fechamento, dias_funcionamento int[], intervalo_slot_min=30,
        criado_em)

usuarios_saloes (id, user_id -> auth.users, salao_id -> saloes,
                 papel enum papel_salao('proprietario','profissional','recepcao'),
                 ativo bool, criado_em)   UNIQUE(user_id, salao_id)

clientes (id, salao_id, nome, telefone, observacoes, criado_em)
          UNIQUE(salao_id, telefone) onde telefone não nulo

servicos (id, salao_id, nome, duracao_min, preco_centavos, cor, ativo, criado_em)

agendamentos (id, salao_id, cliente_id -> clientes, servico_id -> servicos,
              inicio timestamptz, fim timestamptz, preco_centavos,
              status enum status_agendamento('agendado','concluido','cancelado'),
              observacoes, criado_por -> auth.users, criado_em, atualizado_em)
```

FKs com `ON DELETE CASCADE` em `salao_id`; `cliente_id`/`servico_id` com `RESTRICT` para não apagar histórico.

Índices: `usuarios_saloes(user_id)`, `clientes(salao_id, nome)`, `servicos(salao_id) where ativo`, e o principal da agenda `agendamentos(salao_id, inicio)`; mais `agendamentos(cliente_id)`.

**Anti-conflito no banco:** restrição de exclusão (`EXCLUDE USING gist`) impedindo dois agendamentos não cancelados do mesmo salão com faixas de horário sobrepostas — a validação na tela é conveniência, o banco é a garantia. Requer extensão `btree_gist`.

### RLS multi-tenant

Função `security definer`:

```sql
public.pertence_ao_salao(_salao_id uuid) -- true se existe vínculo ativo em usuarios_saloes para auth.uid()
public.papel_no_salao(_salao_id uuid)
```

Evita recursão de política. Cada tabela: `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated`, `GRANT ALL TO service_role`, sem acesso `anon`. Políticas `TO authenticated` usando `pertence_ao_salao(salao_id)` em SELECT/INSERT/UPDATE/DELETE para clientes, servicos, agendamentos; `saloes` visível só a membros; `usuarios_saloes` lê apenas as próprias linhas do usuário e as do salão em que ele é proprietário. Criação de salão no onboarding via função `criar_salao(...)` que insere salão + vínculo de proprietário na mesma transação.

Papel NUNCA fica em tabela de perfil — fica em `usuarios_saloes`, lido por função security definer.

### Autenticação sem cadastro público

E-mail/senha com auto-confirmação ligada; a tela `/auth` tem **apenas login**, sem link de criar conta. Novas contas são criadas pela dona do salão (fora do escopo desta entrega, cria-se pelo painel da Cloud). Rotas privadas ficam sob o grupo protegido que redireciona para `/auth`; sair limpa cache e sessão.

### Datas e fuso

Banco guarda `timestamptz` (UTC). O salão tem seu `timezone`. Na tela, tudo é formatado em pt-BR com date-fns + locale `ptBR` (ex.: "Seg, 14 set"). Grade da agenda montada a partir de hora de abertura/fechamento e intervalo de slot do salão. Semana começa na segunda-feira. Conversões centralizadas em um módulo único de data para evitar erro de fuso espalhado.

### Camada de dados

Hooks com TanStack Query por recurso (`useAgendamentos(intervalo)`, `useClientes`, `useServicos`), leitura pelo cliente Supabase do navegador (RLS garante o isolamento), invalidação após cada mutação, estado otimista no concluir/cancelar. Formulários com React Hook Form + Zod: conflito de horário, serviço obrigatório, cliente obrigatório, horário dentro do funcionamento.

### Componentes principais da Agenda

- `AgendaHeader` — data atual, setas, botão "Hoje", alternância Dia/Semana.
- `AgendaDia` — coluna de horários com blocos de atendimento.
- `AgendaSemana` — 7 colunas compactas, rolagem horizontal no celular.
- `CardAgendamento` — cliente, serviço, horário, cor por status.
- `SheetAgendamento` — criar/editar; seleção de cliente com busca + "novo cliente" embutido; serviço preenche duração e preço.
- `EstadoVazio` — dia livre com atalho para agendar.

### Sequência de implementação

1. Ativar Lovable Cloud.
2. Tema (cores, fontes, raio, sombras) + fontes via `<link>` na raiz.
3. Migração única: extensão, enums, tabelas, grants, índices, restrição anti-conflito, funções e políticas.
4. Login + rotas protegidas + redirecionamento do `/`.
5. Onboarding do salão (bloqueia o app enquanto não houver salão).
6. Layout: barra inferior no celular, lateral no desktop.
7. Serviços (necessário para agendar).
8. Clientes + cadastro rápido.
9. Agenda diária → agendamento criar/editar/cancelar/concluir → agenda semanal.
10. Ajustes do salão.
11. Verificação no navegador do fluxo ponta a ponta, mais checagem de isolamento entre salões.

### Riscos e decisões

- **Isolamento é garantido no banco, não na tela.** Toda tabela carrega `salao_id` e toda política passa pela função de vínculo. Se um dia houver leitura pública, ela será explícita e restrita.
- **Conflito de horário no banco** (`EXCLUDE`) evita corrida entre dois dispositivos agendando o mesmo horário; validação no formulário é só experiência.
- **Fuso horário** é a fonte clássica de bug. Decisão: UTC no banco, fuso do salão na apresentação, um único módulo de conversão.
- **Sem cadastro público** significa que a primeira conta precisa ser criada manualmente no painel da Cloud — passo operacional, não de código.
- **Um profissional por salão nesta entrega:** `agendamentos` já pode receber `profissional_id` depois sem quebrar dados existentes; hoje a agenda é única.
- **PWA completo (instalável/offline) não entra nesta entrega** — a entrega é mobile-first e com boa área de toque; manifesto e service worker ficam para a próxima, já que offline real exige sincronização e conflito de dados.
