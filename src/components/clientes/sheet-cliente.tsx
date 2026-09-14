import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Textarea } from "@/components/ui/textarea";
import { useSalvarCliente, type Cliente } from "@/hooks/use-clientes";

const esquema = z.object({
  nome: z.string().min(2, "Informe o nome da cliente"),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  data_nascimento: z.string().optional(),
  observacoes: z.string().optional(),
});

type Valores = z.infer<typeof esquema>;

type Props = {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  cliente?: Cliente | null;
  onSalvo?: (cliente: Cliente) => void;
};

export function SheetCliente({ aberto, onOpenChange, cliente, onSalvo }: Props) {
  const salvar = useSalvarCliente();
  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { nome: "", telefone: "", whatsapp: "", data_nascimento: "", observacoes: "" },
  });

  useEffect(() => {
    if (!aberto) return;
    form.reset({
      nome: cliente?.nome ?? "",
      telefone: cliente?.telefone ?? "",
      whatsapp: cliente?.whatsapp ?? "",
      data_nascimento: cliente?.data_nascimento ?? "",
      observacoes: cliente?.observacoes ?? "",
    });
  }, [aberto, cliente, form]);

  async function enviar(valores: Valores) {
    try {
      const salvo = await salvar.mutateAsync({
        id: cliente?.id,
        dados: {
          nome: valores.nome.trim(),
          telefone: valores.telefone?.trim() || null,
          whatsapp: valores.whatsapp?.trim() || null,
          data_nascimento: valores.data_nascimento || null,
          observacoes: valores.observacoes?.trim() || null,
        },
      });
      toast.success(cliente ? "Cliente atualizada." : "Cliente cadastrada.");
      onSalvo?.(salvo);
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar a cliente.");
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"
      >
        <SheetHeader className="px-5 pt-5 text-left">
          <SheetTitle>{cliente ? "Editar cliente" : "Nova cliente"}</SheetTitle>
          <SheetDescription>Só o nome é obrigatório.</SheetDescription>
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
                    <Input className="h-12 rounded-xl" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input className="h-12 rounded-xl" inputMode="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input className="h-12 rounded-xl" inputMode="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="data_nascimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-12 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="h-12 w-full rounded-xl"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Salvando..." : "Salvar cliente"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
