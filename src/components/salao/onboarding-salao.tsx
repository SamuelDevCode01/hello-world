import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { FormSalao, type ValoresSalao } from "@/components/salao/form-salao";
import { useSalao } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import { paraHoraISO } from "@/lib/datas";

export function OnboardingSalao() {
  const { recarregar } = useSalao();

  async function criar(valores: ValoresSalao) {
    const { error } = await supabase.from("saloes").insert({
      nome: valores.nome.trim(),
      nome_responsavel: valores.nome_responsavel?.trim() || null,
      cor_primaria: valores.cor_primaria,
      horario_abertura: paraHoraISO(valores.horario_abertura),
      horario_fechamento: paraHoraISO(valores.horario_fechamento),
      intervalo_agenda_minutos: valores.intervalo_agenda_minutos,
    });
    if (error) {
      toast.error("Não foi possível criar o salão. Tente novamente.");
      return;
    }
    toast.success("Tudo pronto! Seu salão está configurado.");
    recarregar();
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-2xl">Vamos configurar seu salão</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Só o essencial para abrir a agenda. Você pode ajustar tudo depois.
          </p>
        </div>
        <div className="card-elegante p-6">
          <FormSalao onSubmit={criar} textoBotao="Criar meu salão" compacto />
        </div>
      </div>
    </main>
  );
}
