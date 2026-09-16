import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Cake, CalendarPlus, Clock3, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAniversarios, useIgnorarRetorno, useRetornos, useTemplates, whatsappUrl } from "@/hooks/use-operacao";

export const Route = createFileRoute("/_authenticated/retornos")({
  component: PaginaRetornos,
  head: () => ({ meta: [{ title: "Retornos de clientes | Agenda do Salão" }] }),
});

function formatarData(data: string) {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR");
}

function situacao(data: string) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const alvo = new Date(`${data}T00:00:00`);
  const dias = Math.round((+alvo - +hoje) / 86400000);
  if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Hoje";
  return `Em ${dias} dia${dias === 1 ? "" : "s"}`;
}

function PaginaRetornos() {
  const { data: retornos = [], isLoading } = useRetornos();
  const { data: aniversarios = [] } = useAniversarios();
  const { data: templates = [] } = useTemplates();
  const ignorar = useIgnorarRetorno();
  const modeloRetorno = templates.find((t) => t.tipo === "retorno" && t.ativo)?.mensagem;
  const modeloAniversario = templates.find((t) => t.tipo === "aniversario" && t.ativo)?.mensagem;

  function mensagem(modelo: string | undefined, nome: string, servico?: string) {
    return (modelo ?? "Olá, {nome}! Tudo bem?")
      .replaceAll("{nome}", nome)
      .replaceAll("{servico}", servico ?? "seu atendimento");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl">Retornos</h1>
        <p className="text-sm text-muted-foreground">Clientes no período ideal para chamar de volta.</p>
      </header>

      {aniversarios.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium"><Cake className="size-4 text-warning" /> Aniversariantes</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {aniversarios.map((c: any) => (
              <div key={c.id} className="card-elegante flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-warning/10">🎂</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.proximo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
                </div>
                {(c.whatsapp || c.telefone) && (
                  <Button asChild size="icon" variant="ghost" className="rounded-xl">
                    <a href={whatsappUrl(c.whatsapp || c.telefone, mensagem(modeloAniversario, c.nome))} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle className="size-4" /></a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium"><BellRing className="size-4 text-primary" /> Clientes para chamar de volta</div>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : retornos.length === 0 ? (
          <div className="card-elegante px-6 py-12 text-center">
            <p className="font-medium">Nenhum retorno pendente ✨</p>
            <p className="mt-1 text-sm text-muted-foreground">Quando serviços concluídos chegarem ao período de retorno, eles aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {retornos.map((r) => (
              <div key={`${r.cliente_id}-${r.servico_id}`} className="card-elegante space-y-3 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.cliente_nome}</p>
                    <p className="text-sm text-muted-foreground">{r.servico_nome}</p>
                  </div>
                  <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">{situacao(r.retorno_previsto)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Último: {formatarData(r.ultimo_atendimento)}</span>
                  <span>Previsto: {formatarData(r.retorno_previsto)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button asChild variant="outline" className="rounded-xl px-2">
                    <a href={whatsappUrl(r.whatsapp || r.telefone, mensagem(modeloRetorno, r.cliente_nome, r.servico_nome))} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> <span className="hidden sm:inline">WhatsApp</span></a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl px-2"><Link to="/agenda"><CalendarPlus className="size-4" /> Agendar</Link></Button>
                  <Button
                    variant="ghost"
                    className="rounded-xl px-2"
                    disabled={ignorar.isPending}
                    onClick={() => void ignorar.mutateAsync({ clienteId: r.cliente_id, servicoId: r.servico_id }).then(() => toast.success("Retorno adiado por 7 dias."))}
                  ><Clock3 className="size-4" /> Adiar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
