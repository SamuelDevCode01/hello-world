import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Scissors, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useExcluirServico, useSalvarServico, useServicos, type Servico } from "@/hooks/use-servicos";
import { formatarDuracao } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/servicos")({
  component: PaginaServicos,
  head: () => ({
    meta: [
      { title: "Serviços do salão | Duração e preço" },
      {
        name: "description",
        content: "Cadastre os serviços do salão com duração, preço, cor na agenda e retorno.",
      },
      { property: "og:title", content: "Serviços do salão | Duração e preço" },
      {
        property: "og:description",
        content: "Cadastre os serviços do salão com duração, preço e cor na agenda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const esquema = z.object({
  nome: z.string().min(2, "Informe o nome do serviço"),
  descricao: z.string().optional(),
  duracao_minutos: z.coerce.number().int().min(5, "Mínimo de 5 minutos").max(600),
  preco: z.coerce.number().min(0),
  custo_estimado: z.coerce.number().min(0),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use um código como #C1622D"),
  dias_para_retorno: z.coerce.number().int().min(0).max(365),
  ativo: z.boolean(),
});

type Valores = z.infer<typeof esquema>;

function PaginaServicos() {
  const { data: servicos = [], isLoading } = useServicos();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);

  function abrir(s: Servico | null) {
    setEditando(s);
    setAberto(true);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Serviços</h1>
        <Button className="rounded-xl" onClick={() => abrir(null)}>
          <Plus className="size-4" /> Novo
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : servicos.length === 0 ? (
        <div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Scissors className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Cadastre os serviços para começar a agendar.
          </p>
          <Button variant="outline" className="rounded-xl" onClick={() => abrir(null)}>
            Cadastrar serviço
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {servicos.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => abrir(s)}
                className="card-elegante flex w-full items-center gap-3 px-4 py-3 text-left transition-shadow hover:shadow-[0_6px_20px_rgba(41,37,36,0.08)]"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.cor }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {s.nome}
                    {!s.ativo && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        inativo
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatarDuracao(s.duracao_minutos)} · {formatarMoeda(s.preco)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <SheetServico aberto={aberto} onOpenChange={setAberto} servico={editando} />
    </div>
  );
}

function SheetServico({
  aberto,
  onOpenChange,
  servico,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  servico: Servico | null;
}) {
  const salvar = useSalvarServico();
  const excluir = useExcluirServico();
  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: "",
      descricao: "",
      duracao_minutos: 60,
      preco: 0,
      custo_estimado: 0,
      cor: "#C1622D",
      dias_para_retorno: 0,
      ativo: true,
    },
  });

  useEffect(() => {
    if (!aberto) return;
    form.reset({
      nome: servico?.nome ?? "",
      descricao: servico?.descricao ?? "",
      duracao_minutos: servico?.duracao_minutos ?? 60,
      preco: Number(servico?.preco ?? 0),
      custo_estimado: Number(servico?.custo_estimado ?? 0),
      cor: servico?.cor ?? "#C1622D",
      dias_para_retorno: servico?.dias_para_retorno ?? 0,
      ativo: servico?.ativo ?? true,
    });
  }, [aberto, servico, form]);

  async function enviar(valores: Valores) {
    try {
      await salvar.mutateAsync({
        id: servico?.id,
        dados: {
          nome: valores.nome.trim(),
          descricao: valores.descricao?.trim() || null,
          duracao_minutos: valores.duracao_minutos,
          preco: valores.preco,
          custo_estimado: valores.custo_estimado,
          cor: valores.cor,
          dias_para_retorno: valores.dias_para_retorno,
          ativo: valores.ativo,
        },
      });
      toast.success(servico ? "Serviço atualizado." : "Serviço cadastrado.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o serviço.");
    }
  }

  async function remover() {
    if (!servico) return;
    try {
      await excluir.mutateAsync(servico.id);
      toast.success("Serviço excluído.");
      onOpenChange(false);
    } catch {
      toast.error(
        "Não foi possível excluir. Se houver agendamentos usando este serviço, marque-o como inativo.",
      );
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"
      >
        <SheetHeader className="px-5 pt-5 text-left">
          <SheetTitle>{servico ? "Editar serviço" : "Novo serviço"}</SheetTitle>
          <SheetDescription>Duração e preço aparecem na agenda.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(enviar)} className="space-y-4 px-5 pb-8 pt-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input className="h-12 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="duracao_minutos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} step={5} className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="custo_estimado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dias_para_retorno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retorno (dias)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor na agenda</FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <span
                      className="size-10 shrink-0 rounded-xl border border-border"
                      style={{ backgroundColor: field.value }}
                      aria-hidden
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20 rounded-xl" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <FormLabel>Serviço ativo</FormLabel>
                    <FormDescription>Serviços inativos não aparecem no agendamento.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-12 w-full rounded-xl"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Salvando..." : "Salvar serviço"}
            </Button>

            {servico && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full rounded-xl text-destructive"
                  >
                    <Trash2 className="size-4" /> Excluir serviço
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir este serviço?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se ele já foi usado em agendamentos, prefira marcar como inativo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                    <AlertDialogAction className="rounded-xl" onClick={() => void remover()}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
