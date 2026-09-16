import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { FormSalao, type ValoresSalao } from "@/components/salao/form-salao";
import { Button } from "@/components/ui/button";
import { useSalao, useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import { horaCurta, paraHoraISO } from "@/lib/datas";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: PaginaConfiguracoes,
  head: () => ({
    meta: [
      { title: "Configurações do salão | Horários e contato" },
      {
        name: "description",
        content:
          "Ajuste nome, responsável, contato, horário de funcionamento e intervalo da agenda do salão.",
      },
      { property: "og:title", content: "Configurações do salão | Horários e contato" },
      {
        property: "og:description",
        content: "Ajuste contato, horário de funcionamento e intervalo da agenda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaginaConfiguracoes() {
  const salao = useSalaoAtual();
  const { recarregar } = useSalao();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function salvar(v: ValoresSalao) {
    const { error } = await supabase
      .from("saloes")
      .update({
        nome: v.nome.trim(),
        nome_responsavel: v.nome_responsavel?.trim() || null,
        telefone: v.telefone?.trim() || null,
        whatsapp: v.whatsapp?.trim() || null,
        email: v.email?.trim() || null,
        endereco: v.endereco?.trim() || null,
        logo_url: v.logo_url?.trim() || null,
        cor_primaria: v.cor_primaria,
        horario_abertura: paraHoraISO(v.horario_abertura),
        horario_fechamento: paraHoraISO(v.horario_fechamento),
        intervalo_agenda_minutos: v.intervalo_agenda_minutos,
      })
      .eq("id", salao.id);

    if (error) {
      toast.error("Não foi possível salvar as configurações.");
      return;
    }
    toast.success("Configurações salvas.");
    recarregar();
  }

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados e funcionamento do salão.</p>
      </header>
      <div className="card-elegante p-5">
        <FormSalao
          textoBotao="Salvar alterações"
          onSubmit={salvar}
          valoresIniciais={{
            nome: salao.nome,
            nome_responsavel: salao.nome_responsavel ?? "",
            telefone: salao.telefone ?? "",
            whatsapp: salao.whatsapp ?? "",
            email: salao.email ?? "",
            endereco: salao.endereco ?? "",
            logo_url: salao.logo_url ?? "",
            cor_primaria: salao.cor_primaria ?? "#C1622D",
            horario_abertura: horaCurta(salao.horario_abertura),
            horario_fechamento: horaCurta(salao.horario_fechamento),
            intervalo_agenda_minutos: salao.intervalo_agenda_minutos,
          }}
        />
      </div>

      <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => void sair()}>
        <LogOut className="size-4" /> Sair da conta
      </Button>
    </div>
  );
}
