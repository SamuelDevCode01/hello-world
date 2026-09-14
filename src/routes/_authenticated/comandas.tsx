import { createFileRoute, Link } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/comandas")({
  component: PaginaComandas,
  head: () => ({
    meta: [
      { title: "Comandas | Em preparação" },
      {
        name: "description",
        content: "O fechamento de comandas e pagamentos chega em uma próxima etapa do salão.",
      },
      { property: "og:title", content: "Comandas | Em preparação" },
      {
        property: "og:description",
        content: "O fechamento de comandas e pagamentos chega em uma próxima etapa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaginaComandas() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl">Comandas</h1>
      <div className="card-elegante flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ReceiptText className="size-6" />
        </span>
        <p className="font-medium">Em preparação</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          O fechamento de atendimentos com pagamentos e produtos chega em uma próxima etapa. Por
          enquanto, tudo acontece na agenda.
        </p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/agenda">Ir para a agenda</Link>
        </Button>
      </div>
    </div>
  );
}
