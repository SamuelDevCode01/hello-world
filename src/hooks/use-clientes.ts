import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { somenteDigitos } from "@/lib/formato";

const db = supabase as any;

export type Cliente = Tables<"clientes"> & { foto_path: string | null };

export function useClientes(busca = "") {
  const salao = useSalaoAtual();
  const termo = busca.trim();
  return useQuery({
    queryKey: ["clientes", salao.id, termo],
    staleTime: 30_000,
    queryFn: async () => {
      let q = db.from("clientes").select("*").eq("salao_id", salao.id).order("nome").limit(200);
      if (termo) {
        const seguro = termo.replace(/[,%()]/g, " ").trim();
        const digitos = somenteDigitos(termo);
        const filtros = [`nome.ilike.%${seguro}%`, `whatsapp.ilike.%${seguro}%`];
        if (digitos.length >= 3) filtros.push(`telefone.ilike.%${digitos}%`);
        q = q.or(filtros.join(","));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export type DadosCliente = Omit<TablesInsert<"clientes">, "salao_id" | "id" | "created_at" | "updated_at">;

function invalidarClientes(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["clientes"] });
  void qc.invalidateQueries({ queryKey: ["clientes-resumo"] });
  void qc.invalidateQueries({ queryKey: ["cliente-detalhes"] });
  void qc.invalidateQueries({ queryKey: ["aniversarios"] });
}

export function useSalvarCliente() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosCliente }) => {
      if (id) {
        const { data, error } = await db.from("clientes").update(dados).eq("id", id).eq("salao_id", salao.id).select("*").single();
        if (error) throw error;
        return data as Cliente;
      }
      const { data, error } = await db.from("clientes").insert({ ...dados, salao_id: salao.id }).select("*").single();
      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: () => invalidarClientes(qc),
  });
}

export function useUploadFotoCliente() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, file, fotoAnterior }: { clienteId: string; file: File; fotoAnterior?: string | null }) => {
      if (file.size > 5 * 1024 * 1024) throw new Error("A foto deve ter no máximo 5 MB.");
      const extensoes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
      const ext = extensoes[file.type];
      if (!ext) throw new Error("Use uma imagem JPG, PNG ou WebP.");
      const arquivo = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const path = `${salao.id}/${clienteId}/${arquivo}`;
      const { error: uploadError } = await supabase.storage.from("fotos-clientes").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: updateError } = await db.from("clientes").update({ foto_path: path }).eq("id", clienteId).eq("salao_id", salao.id);
      if (updateError) {
        await supabase.storage.from("fotos-clientes").remove([path]);
        throw updateError;
      }
      if (fotoAnterior && fotoAnterior !== path && fotoAnterior.startsWith(`${salao.id}/`)) {
        await supabase.storage.from("fotos-clientes").remove([fotoAnterior]);
      }
      return path;
    },
    onSuccess: () => invalidarClientes(qc),
  });
}

export function useFotoCliente(path?: string | null) {
  return useQuery({
    queryKey: ["foto-cliente", path],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("fotos-clientes").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useExcluirCliente() {
  const salao = useSalaoAtual();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clientes").delete().eq("id", id).eq("salao_id", salao.id);
      if (error) throw error;
    },
    onSuccess: () => invalidarClientes(qc),
  });
}
