import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export type Salao = Tables<"saloes">;
export type Papel = Enums<"papel_salao">;

type SalaoContexto = {
  salao: Salao | null;
  papel: Papel | null;
  userId: string | null;
  carregando: boolean;
  recarregar: () => void;
};

const Ctx = createContext<SalaoContexto | null>(null);

export const CHAVE_SALAO = ["salao-atual"] as const;

async function carregarSalao(): Promise<{ salao: Salao | null; papel: Papel | null; userId: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { salao: null, papel: null, userId: null };

  const { data, error } = await supabase
    .from("usuarios_saloes")
    .select("papel, saloes(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const salao = (data?.saloes as Salao | null) ?? null;
  return { salao, papel: data?.papel ?? null, userId };
}

export function SalaoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: CHAVE_SALAO,
    queryFn: carregarSalao,
    staleTime: 60_000,
  });

  return (
    <Ctx.Provider
      value={{
        salao: data?.salao ?? null,
        papel: data?.papel ?? null,
        userId: data?.userId ?? null,
        carregando: isPending,
        recarregar: () => void queryClient.invalidateQueries({ queryKey: CHAVE_SALAO }),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSalao(): SalaoContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSalao precisa estar dentro de SalaoProvider");
  return ctx;
}

/** Salão garantido (uso dentro das telas já protegidas pelo onboarding). */
export function useSalaoAtual(): Salao {
  const { salao } = useSalao();
  if (!salao) throw new Error("Nenhum salão configurado");
  return salao;
}
