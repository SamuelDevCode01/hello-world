import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Valeria Hair Agendamentos" },
      { name: "description", content: "Acesse a agenda do seu salão." },
      { property: "og:title", content: "Entrar — Valeria Hair Agendamentos" },
      { property: "og:description", content: "Acesse a agenda do seu salão." },
    ],
  }),
  component: PaginaLogin,
});

const esquema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  senha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
});

function PaginaLogin() {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/agenda", replace: true });
    });
  }, [navigate]);

  const form = useForm<z.infer<typeof esquema>>({
    resolver: zodResolver(esquema),
    defaultValues: { email: "", senha: "" },
  });

  async function onSubmit(valores: z.infer<typeof esquema>) {
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: valores.email.trim(),
      password: valores.senha,
    });
    setEnviando(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
      );
      return;
    }
    await navigate({ to: "/agenda", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Scissors className="size-7" />
          </div>
          <h1 className="text-2xl">Bem-vinda de volta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para ver a agenda do seu salão.
          </p>
        </div>

        <div className="card-elegante p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="voce@salao.com.br"
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="h-12 w-full rounded-xl" disabled={enviando}>
                {enviando ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          O acesso é criado pela administração do salão.
        </p>
      </div>
    </main>
  );
}
