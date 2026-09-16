import { createFileRoute } from "@tanstack/react-router";
import { PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useExcluirProduto, useMovimentarEstoque, useProdutos, useSalvarProduto, type Produto } from "@/hooks/use-operacao";
import { formatarMoeda } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/produtos")({ component: PaginaProdutos, head: () => ({ meta: [{ title: "Produtos | Agenda do Salão" }] }) });

const UNIDADES = [
  ["un", "Unidade (un)"], ["ml", "Mililitro (ml)"], ["l", "Litro (L)"], ["g", "Grama (g)"],
  ["kg", "Quilo (kg)"], ["pct", "Pacote (pct)"], ["cx", "Caixa (cx)"], ["fr", "Frasco (fr)"],
] as const;

type Uso = Produto["uso"];

function unidadeExibida(unidade:string){return /^\d+(?:[.,]\d+)?$/.test(unidade.trim())?"un":unidade}

function PaginaProdutos(){
  const [busca,setBusca]=useState("");
  const [aberto,setAberto]=useState(false);
  const [editando,setEditando]=useState<Produto|null>(null);
  const {data:produtos=[],isLoading}=useProdutos(busca);

  function abrir(produto:Produto|null){setEditando(produto);setAberto(true)}

  return <div className="space-y-5">
    <header className="flex items-center justify-between gap-3"><div><h1 className="font-display text-2xl">Produtos</h1><p className="text-sm text-muted-foreground">Cadastro, preços e unidade de medida.</p></div><Button className="rounded-xl" onClick={()=>abrir(null)}><Plus className="size-4"/> Novo</Button></header>
    <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="h-12 rounded-xl pl-9" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar produto"/></div>
    {isLoading?<div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-20 rounded-xl"/>)}</div>:produtos.length===0?<div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><PackagePlus className="size-8 text-muted-foreground"/><p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p><Button variant="outline" className="rounded-xl" onClick={()=>abrir(null)}>Cadastrar primeiro produto</Button></div>:<div className="space-y-2">{produtos.map(p=>{
      const baixo=Number(p.quantidade_atual)<=Number(p.estoque_minimo);
      return <button key={p.id} onClick={()=>abrir(p)} className="card-elegante flex w-full items-center gap-3 px-4 py-3 text-left transition-shadow hover:shadow-[0_8px_24px_rgba(41,37,36,0.08)]"><span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.nome}</span><span className="block text-xs text-muted-foreground">{[p.marca,p.categoria].filter(Boolean).join(" · ")||"Sem categoria"}</span></span><span className="text-right"><span className="block text-sm font-medium">{formatarMoeda(p.preco_venda)}</span><span className={baixo?"block text-xs font-medium text-warning":"block text-xs text-muted-foreground"}>{Number(p.quantidade_atual)} {unidadeExibida(p.unidade)}{baixo?" · estoque baixo":""}</span></span></button>
    })}</div>}
    <SheetProduto aberto={aberto} onOpenChange={setAberto} produto={editando}/>
  </div>
}

function SheetProduto({aberto,onOpenChange,produto}:{aberto:boolean;onOpenChange:(v:boolean)=>void;produto:Produto|null}){
  const salvar=useSalvarProduto();
  const excluir=useExcluirProduto();
  const mover=useMovimentarEstoque();
  const [nome,setNome]=useState("");
  const [categoria,setCategoria]=useState("");
  const [marca,setMarca]=useState("");
  const [sku,setSku]=useState("");
  const [custo,setCusto]=useState("0");
  const [venda,setVenda]=useState("0");
  const [minimo,setMinimo]=useState("0");
  const [quantidadeInicial,setQuantidadeInicial]=useState("0");
  const [unidade,setUnidade]=useState("un");
  const [uso,setUso]=useState<Uso>("ambos");
  const [ativo,setAtivo]=useState(true);

  useEffect(()=>{
    if(!aberto)return;
    const unidadeAtual=produto?unidadeExibida(produto.unidade):"un";
    setNome(produto?.nome??"");
    setCategoria(produto?.categoria??"");
    setMarca(produto?.marca??"");
    setSku(produto?.sku??"");
    setCusto(String(Number(produto?.preco_custo??0)));
    setVenda(String(Number(produto?.preco_venda??0)));
    setMinimo(String(Number(produto?.estoque_minimo??0)));
    setQuantidadeInicial("0");
    setUnidade(UNIDADES.some(([v])=>v===unidadeAtual)?unidadeAtual:"un");
    setUso(produto?.uso??"ambos");
    setAtivo(produto?.ativo??true);
  },[aberto,produto]);

  async function enviar(){
    if(nome.trim().length<2){toast.error("Informe o nome do produto.");return;}
    const numeros=[Number(custo),Number(venda),Number(minimo),Number(quantidadeInicial)];
    if(numeros.some(n=>!Number.isFinite(n)||n<0)){toast.error("Confira os valores e quantidades informados.");return;}
    try{
      const salvo=await salvar.mutateAsync({...(produto?{id:produto.id}:{}),dados:{nome:nome.trim(),categoria:categoria.trim()||null,marca:marca.trim()||null,sku:sku.trim()||null,preco_custo:Number(custo),preco_venda:Number(venda),estoque_minimo:Number(minimo),unidade,uso,ativo}});
      if(!produto&&Number(quantidadeInicial)>0){
        try{await mover.mutateAsync({produtoId:salvo.id,tipo:"entrada",quantidade:Number(quantidadeInicial),motivo:"Estoque inicial"});}
        catch{toast.warning("Produto salvo, mas o estoque inicial não foi lançado. Você pode registrar a entrada em Estoque.");}
      }
      toast.success(produto?"Produto atualizado.":"Produto cadastrado.");
      onOpenChange(false);
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível salvar o produto.")}
  }

  async function remover(){if(!produto)return;try{await excluir.mutateAsync(produto.id);toast.success("Produto excluído.");onOpenChange(false)}catch{toast.error("Não foi possível excluir. Marque como inativo se já houver movimentações.")}}

  return <Sheet open={aberto} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>{produto?"Editar produto":"Novo produto"}</SheetTitle><SheetDescription>Cadastre quantidade e unidade de medida em campos separados.</SheetDescription></SheetHeader><div className="space-y-4 px-5 pb-8 pt-2">
    <div className="space-y-2"><Label>Nome</Label><Input className="h-12 rounded-xl" value={nome} onChange={e=>setNome(e.target.value)}/></div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Categoria</Label><Input className="h-12 rounded-xl" value={categoria} onChange={e=>setCategoria(e.target.value)}/></div><div className="space-y-2"><Label>Marca</Label><Input className="h-12 rounded-xl" value={marca} onChange={e=>setMarca(e.target.value)}/></div><div className="space-y-2"><Label>Custo (R$)</Label><Input type="number" step="0.01" min="0" className="h-12 rounded-xl" value={custo} onChange={e=>setCusto(e.target.value)}/></div><div className="space-y-2"><Label>Venda (R$)</Label><Input type="number" step="0.01" min="0" className="h-12 rounded-xl" value={venda} onChange={e=>setVenda(e.target.value)}/></div><div className="space-y-2"><Label>Estoque mínimo</Label><Input type="number" step="0.001" min="0" placeholder="0" className="h-12 rounded-xl" value={minimo} onChange={e=>setMinimo(e.target.value)}/></div>{!produto?<div className="space-y-2"><Label>Quantidade inicial</Label><Input type="number" step="0.001" min="0" placeholder="0" className="h-12 rounded-xl" value={quantidadeInicial} onChange={e=>setQuantidadeInicial(e.target.value)}/><p className="text-xs text-muted-foreground">Ex.: 2 unidades em estoque.</p></div>:<div className="space-y-2"><Label>Estoque atual</Label><div className="flex h-12 items-center rounded-xl border bg-muted/40 px-3 text-sm font-medium">{Number(produto.quantidade_atual)} {unidadeExibida(produto.unidade)}</div><p className="text-xs text-muted-foreground">Altere pela tela Estoque.</p></div>}</div>
    <div className="space-y-2"><Label>Unidade de medida</Label><Select value={unidade} onValueChange={setUnidade}><SelectTrigger className="h-12 rounded-xl"><SelectValue/></SelectTrigger><SelectContent>{UNIDADES.map(([valor,label])=><SelectItem key={valor} value={valor}>{label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Aqui vai o tipo da medida, não a quantidade.</p></div>
    <div className="space-y-2"><Label>Código / SKU</Label><Input className="h-12 rounded-xl" value={sku} onChange={e=>setSku(e.target.value)}/></div>
    <div className="space-y-2"><Label>Uso</Label><Select value={uso} onValueChange={v=>setUso(v as Uso)}><SelectTrigger className="h-12 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="interno">Uso interno</SelectItem><SelectItem value="venda">Venda</SelectItem><SelectItem value="ambos">Interno e venda</SelectItem></SelectContent></Select></div>
    <div className="flex items-center justify-between rounded-xl border p-4"><div><Label>Produto ativo</Label><p className="mt-1 text-xs text-muted-foreground">Produtos inativos continuam no histórico, mas deixam de ser oferecidos.</p></div><Switch checked={ativo} onCheckedChange={setAtivo}/></div>
    <Button type="button" className="h-12 w-full rounded-xl" disabled={salvar.isPending||mover.isPending} onClick={()=>void enviar()}>{salvar.isPending||mover.isPending?"Salvando...":"Salvar produto"}</Button>
    {produto&&<AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="ghost" className="h-11 w-full rounded-xl text-destructive"><Trash2 className="size-4"/> Excluir produto</Button></AlertDialogTrigger><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Excluir este produto?</AlertDialogTitle><AlertDialogDescription>Se ele já possui movimentações ou vendas, prefira marcar como inativo para preservar o histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel><AlertDialogAction className="rounded-xl" onClick={()=>void remover()}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
  </div></SheetContent></Sheet>
}
