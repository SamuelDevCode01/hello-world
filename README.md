# Sistema de Agendamento

Aplicação web para gestão de salões de beleza, com agenda, clientes, serviços, caixa, produtos, estoque, pacotes, retornos e financeiro.

## Stack

- React 19
- TypeScript
- TanStack Start / TanStack Router
- Vite
- Tailwind CSS
- Supabase

## Desenvolvimento local

Requisitos: Node.js 20+ e npm.

```sh
git clone <url-do-repositorio>
cd hello-world
npm install
npm run dev
```

## Build de produção

```sh
npm run build
```

## Variáveis de ambiente

Configure as variáveis abaixo no ambiente de execução:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Chaves administrativas do Supabase devem permanecer exclusivamente no ambiente de servidor quando forem necessárias.
