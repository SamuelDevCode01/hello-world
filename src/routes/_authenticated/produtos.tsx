import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

const schema=z.object({
  nome:z.string().min(2),categoria:z.string().optional(),marca:z.string().optional(),sku:z.string().optional(),
  preco_custo:z.coerce.number().min(0),preco_venda:z.coerce.number().min(0),estoque_minimo:z.coerce.number().min(0),
  quantidade_inicial:z.coerce.number().min(0),unidade:z.string().min(1),uso:z.enum(["interno","venda","ambos"]),ativo:z.boolean()
});
type Valores=z.infer<typeof schema>;

function unidadeExibida(unidade:string){return /^\d+(?:[.,]\d+)?$/.test(unidade.trim())?"un":unidade}

function PaginaProdutos(){
  const [busca,setBusca]=useState("");const [aberto,setAberto]=useState(false);const [editando,setEditando]=useState<Produto|null>(null);const {data:produtos=[],isLoading}=useProdutos(busca);
  return <div className="space-y-5"><header className="flex items-center justify-between gap-3"><div><h1 className="font-display text-2xl">Produtos</h1><p className="text-sm text-muted-foreground">Cadastro, preços e unidade de medida.</p></div><Button className="rounded-xl" onClick={()=>{setEditando(null);setAberto(true)}}><Plus className="size-4"/> Novo</Button></header>
  <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="h-12 rounded-xl pl-9" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar produto"/></div>
  {isLoading?<div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-20 rounded-xl"/>)}</div>:produtos.length===0?<div className="card-elegante flex flex-col items-center gap-3 px-6 py-12 text-center"><PackagePlus className="size-8 text-muted-foreground"/><p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p><Button variant="outline" className="rounded-xl" onClick={()=>setAberto(true)}>Cadastrar primeiro produto</Button></div>:<div className="space-y-2">{produtos.map(p=><button key={p.id} onClick={()=>{setEditando(p);setAberto(true)}} className="card-elegante flex w-full items-center gap-3 px-4 py-3 text-left"><span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.nome}</span><span className="block text-xs text-muted-foreground">{[p.marca,p.categoria].filter(Boolean).join(" · ")||"Sem categoria"}</span></span><span className="text-right"><span className="block text-sm font-medium">{formatarMoeda(p.preco_venda)}</span><span className="block text-xs text-muted-foreground">{Number(p.quantidade_atual)} {unidadeExibida(p.unidade)}</span></span></button>)}</div>}
  <SheetProduto aberto={aberto} onOpenChange={setAberto} produto={editando}/></div>
}

function SheetProduto({aberto,onOpenChange,produto}:{aberto:boolean;onOpenChange:(v:boolean)=>void;produto:Produto|null}){
  const salvar=useSalvarProduto();const excluir=useExcluirProduto();const mover=useMovimentarEstoque();
  const form=useForm<Valores>({resolver:zodResolver(schema),defaultValues:{nome:"",categoria:"",marca:"",sku:"",preco_custo:0,preco_venda:0,estoque_minimo:0,quantidade_inicial:0,unidade:"un",uso:"ambos",ativo:true}});
  useEffect(()=>{if(!aberto)return;const unidade=produto?unidadeExibida(produto.unidade):"un";form.reset({nome:produto?.nome??"",categoria:produto?.categoria??"",marca:produto?.marca??"",sku:produto?.sku??"",preco_custo:Number(produto?.preco_custo??0),preco_venda:Number(produto?.preco_venda??0),estoque_minimo:Number(produto?.estoque_minimo??0),quantidade_inicial:0,unidade:UNIDADES.some(([v])=>v===unidade)?unidade:"un",uso:produto?.uso??"ambos",ativo:produto?.ativo??true})},[aberto,produto,form]);
  async function enviar(v:Valores){
    try{
      const salvo=await salvar.mutateAsync({...(produto?{id:produto.id}:{}),dados:{nome:v.nome.trim(),categoria:v.categoria?.trim()||null,marca:v.marca?.trim()||null,sku:v.sku?.trim()||null,preco_custo:v.preco_custo,preco_venda:v.preco_venda,estoque_minimo:v.estoque_minimo,unidade:v.unidade,uso:v.uso,ativo:v.ativo}});
      if(!produto&&v.quantidade_inicial>0){
        try{await mover.mutateAsync({produtoId:salvo.id,tipo:"entrada",quantidade:v.quantidade_inicial,motivo:"Estoque inicial"});}
        catch{toast.warning("Produto salvo, mas não foi possível registrar o estoque inicial. Você pode lançar a entrada em Estoque.");}
      }
      toast.success(produto?"Produto atualizado.":"Produto cadastrado.");onOpenChange(false);
    }catch{toast.error("Não foi possível salvar o produto.")}
  }
  async function remover(){if(!produto)return;try{await excluir.mutateAsync(produto.id);toast.success("Produto excluído.");onOpenChange(false)}catch{toast.error("Não foi possível excluir. Marque como inativo se já houver movimentações.")}}

  return <Sheet open={aberto} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>{produto?"Editar produto":"Novo produto"}</SheetTitle><SheetDescription>Quantidade e unidade agora ficam em campos separados.</SheetDescription></SheetHeader><Form {...form}><form className="space-y-4 px-5 pb-8 pt-2" onSubmit={form.handleSubmit(enviar)}>
    <FormField control={form.control} name="nome" render={({field})=><FormItem><FormLabel>Nome</FormLabel><FormControl><Input className="h-12 rounded-xl" {...field}/></FormControl><FormMessage/></FormItem>}/>
    <div className="grid grid-cols-2 gap-3">
      <FormField control={form.control} name="categoria" render={({field})=><FormItem><FormLabel>Categoria</FormLabel><FormControl><Input className="h-12 rounded-xl" {...field}/></FormControl></FormItem>}/>
      <FormField control={form.control} name="marca" render={({field})=><FormItem><FormLabel>Marca</FormLabel><FormControl><Input className="h-12 rounded-xl" {...field}/></FormControl></FormItem>}/>
      <FormField control={form.control} name="preco_custo" render={({field})=><FormItem><FormLabel>Custo (R$)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="h-12 rounded-xl" {...field}/></FormControl><FormMessage/></FormItem>}/>
      <FormField control={form.control} name="preco_venda" render={({field})=><FormItem><FormLabel>Venda (R$)</FormLabel><FormControl><Input type="number" step="0.01" min="0" className="h-12 rounded-xl" {...field}/></FormControl><FormMessage/></FormItem>}/>
      <FormField control={form.control} name="estoque_minimo" render={({field})=><FormItem><FormLabel>Estoque mínimo</FormLabel><FormControl><Input type="number" step="0.001" min="0" placeholder="0" className="h-12 rounded-xl" {...field}/></FormControl><FormMessage/></FormItem>}/>
      {!produto?<FormField control={form.control} name="quantidade_inicial" render={({field})=><FormItem><FormLabel>Quantidade inicial</FormLabel><FormControl><Input type="number" step="0.001" min="0" placeholder="0" className="h-12 rounded-xl" {...field}/></FormControl><FormDescription>Ex.: 2 unidades em estoque.</FormDescription><FormMessage/></FormItem>}/>:<FormItem><FormLabel>Estoque atual</FormLabel><div className="flex h-12 items-center rounded-xl border bg-muted/40 px-3 text-sm font-medium">{Number(produto.quantidade_atual)} {unidadeExibida(produto.unidade)}</div><FormDescription>Altere pela tela Estoque.</FormDescription></FormItem>}
    </div>
    <FormField control={form.control} name="unidade" render={({field})=><FormItem><FormLabel>Unidade de medida</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue/></SelectTrigger></FormControl><SelectContent>{UNIDADES.map(([valor,label])=><SelectItem key={valor} value={valor}>{label}</SelectItem>)}</SelectContent></Select><FormDescription>Aqui vai o tipo da medida, não a quantidade.</FormDescription><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="sku" render={({field})=><FormItem><FormLabel>Código / SKU</FormLabel><FormControl><Input className="h-12 rounded-xl" {...field}/></FormControl></FormItem>}/>
    <FormField control={form.control} name="uso" render={({field})=><FormItem><FormLabel>Uso</FormLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="h-12 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="interno">Uso interno</SelectItem><SelectItem value="venda">Venda</SelectItem><SelectItem value="ambos">Interno e venda</SelectItem></SelectContent></Select></FormItem>}/>
    <FormField control={form.control} name="ativo" render={({field})=><FormItem className="flex items-center justify-between rounded-xl border p-4"><FormLabel>Produto ativo</FormLabel><Switch checked={field.value} onCheckedChange={field.onChange}/></FormItem>}/>
    <Button type="submit" className="h-12 w-full rounded-xl" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting?"Salvando...":"Salvar produto"}</Button>
    {produto&&<AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="ghost" className="h-11 w-full rounded-xl text-destructive"><Trash2 className="size-4"/> Excluir produto</Button></AlertDialogTrigger><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Excluir este produto?</AlertDialogTitle><AlertDialogDescription>Se ele já possui movimentações ou vendas, prefira marcar como inativo para preservar o histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel><AlertDialogAction className="rounded-xl" onClick={()=>void remover()}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
  </form></Form></SheetContent></Sheet>
}
