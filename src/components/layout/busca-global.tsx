import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSalaoAtual } from "@/contexts/salao";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda } from "@/lib/formato";

const db = supabase as any;
type Destino = "/clientes" | "/servicos" | "/produtos";
type Resultado = { tipo: "Cliente" | "Serviço" | "Produto"; id: string; titulo: string; detalhe: string; destino: Destino };

export function BuscaGlobal({ compacta = false }: { compacta?: boolean }) {
  const salao = useSalaoAtual();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto || termo.trim().length < 2) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setCarregando(true);
      const q = termo.trim();
      const [clientes, servicos, produtos] = await Promise.all([
        db.from("clientes").select("id,nome,telefone").eq("salao_id", salao.id).or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`).limit(8),
        db.from("servicos").select("id,nome,preco").eq("salao_id", salao.id).ilike("nome", `%${q}%`).limit(8),
        db.from("produtos").select("id,nome,marca,preco_venda").eq("salao_id", salao.id).ilike("nome", `%${q}%`).limit(8),
      ]);
      setResultados([
        ...((clientes.data ?? []).map((c: any) => ({ tipo: "Cliente" as const, id: c.id, titulo: c.nome, detalhe: c.telefone || "Sem telefone", destino: "/clientes" as const }))),
        ...((servicos.data ?? []).map((s: any) => ({ tipo: "Serviço" as const, id: s.id, titulo: s.nome, detalhe: formatarMoeda(Number(s.preco)), destino: "/servicos" as const }))),
        ...((produtos.data ?? []).map((p: any) => ({ tipo: "Produto" as const, id: p.id, titulo: p.nome, detalhe: `${p.marca || ""}${p.marca ? " · " : ""}${formatarMoeda(Number(p.preco_venda))}`, destino: "/produtos" as const }))),
      ]);
      setCarregando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [aberto, termo, salao.id]);

  return <Sheet open={aberto} onOpenChange={setAberto}>
    <SheetTrigger asChild>
      <Button variant="ghost" size={compacta ? "icon" : "default"} className="rounded-xl">
        <Search className="size-4" />{!compacta && <span>Buscar</span>}
      </Button>
    </SheetTrigger>
    <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none">
      <SheetHeader className="px-5 pt-5 text-left"><SheetTitle>Busca rápida</SheetTitle><SheetDescription>Clientes, serviços e produtos do seu salão.</SheetDescription></SheetHeader>
      <div className="space-y-4 px-5 pb-8 pt-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input autoFocus className="h-12 rounded-xl pl-9" value={termo} onChange={(e)=>setTermo(e.target.value)} placeholder="Digite nome, telefone, serviço ou produto"/></div>
        {carregando ? <p className="py-8 text-center text-sm text-muted-foreground">Buscando...</p> : termo.length >= 2 && resultados.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</p> : <div className="space-y-2">{resultados.map(r=><Link key={`${r.tipo}-${r.id}`} to={r.destino} onClick={()=>setAberto(false)} className="block rounded-xl border px-4 py-3 transition-colors hover:bg-muted/50"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{r.tipo}</p><p className="font-medium">{r.titulo}</p><p className="text-xs text-muted-foreground">{r.detalhe}</p></Link>)}</div>}
      </div>
    </SheetContent>
  </Sheet>;
}
