import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, UserRound } from "lucide-react";
import { useState } from "react";

import { SheetCliente } from "@/components/clientes/sheet-cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientes, type Cliente } from "@/hooks/use-clientes";
import { formatarTelefone, iniciais } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: PaginaClientes,
  head: () => ({
    meta: [
      { title: "Clientes do salão | Cadastro e busca" },
      {
        name: "description",
        content: "Busque clientes por nome ou telefone e mantenha o cadastro do salão em dia.",
      },
      { property: "og:title", content: "Clientes do salão | Cadastro e busca" },
      {
        property: "og:description",
        content: "Busque clientes por nome ou telefone e mantenha o cadastro em dia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaginaClientes() {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const { data: clientes = [], isLoading } = useClientes(busca);

  function abrir(cliente: Cliente | null) {
    setEditando(cliente);
    setAberto(true);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Clientes</h1>
        <Button className="rounded-xl" onClick={() => abrir(null)}>
          <Plus className="size-4" /> Nova
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="h-12 rounded-xl pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center">
          <UserRound className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {busca ? "Nenhuma cliente encontrada." : "Cadastre a primeira cliente do salão."}
          </p>
          <Button variant="outline" className="rounded-xl" onClick={() => abrir(null)}>
            Cadastrar cliente
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {clientes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => abrir(c)}
                className="card-elegante flex w-full items-center gap-3 px-4 py-3 text-left transition-shadow hover:shadow-[0_6px_20px_rgba(41,37,36,0.08)]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-medium text-primary">
                  {iniciais(c.nome)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatarTelefone(c.telefone) || "Sem telefone"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <SheetCliente aberto={aberto} onOpenChange={setAberto} cliente={editando} />
    </div>
  );
}
