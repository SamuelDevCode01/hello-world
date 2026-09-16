import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFotoCliente, useSalvarCliente, useUploadFotoCliente, type Cliente } from "@/hooks/use-clientes";
import { useClienteDetalhes, useClientePacotes } from "@/hooks/use-operacao-leituras";
import { useExcluirPreferencia, useSalvarPreferencia, whatsappUrl } from "@/hooks/use-operacao";
import { formatarMoeda, iniciais } from "@/lib/formato";

const esquema = z.object({ nome: z.string().min(2,"Informe o nome da cliente"), telefone:z.string().optional(), whatsapp:z.string().optional(), data_nascimento:z.string().optional(), observacoes:z.string().optional() });
type Valores = z.infer<typeof esquema>;
type Props = { aberto:boolean; onOpenChange:(v:boolean)=>void; cliente?:Cliente|null; onSalvo?:(cliente:Cliente)=>void };

export function SheetCliente({aberto,onOpenChange,cliente,onSalvo}:Props){
  const salvar=useSalvarCliente(); const uploadFoto=useUploadFotoCliente(); const {data:fotoAtual}=useFotoCliente(cliente?.foto_path); const {data:detalhes}=useClienteDetalhes(cliente?.id); const {data:pacotes=[]}=useClientePacotes(cliente?.id); const salvarPref=useSalvarPreferencia(); const excluirPref=useExcluirPreferencia();
  const [categoria,setCategoria]=useState("Preferência"); const [valor,setValor]=useState(""); const [arquivoFoto,setArquivoFoto]=useState<File|null>(null);
  const previewFoto=useMemo(()=>arquivoFoto?URL.createObjectURL(arquivoFoto):null,[arquivoFoto]);
  useEffect(()=>()=>{if(previewFoto)URL.revokeObjectURL(previewFoto)},[previewFoto]);
  const form=useForm<Valores>({resolver:zodResolver(esquema),defaultValues:{nome:"",telefone:"",whatsapp:"",data_nascimento:"",observacoes:""}});
  useEffect(()=>{if(!aberto)return;setArquivoFoto(null);form.reset({nome:cliente?.nome??"",telefone:cliente?.telefone??"",whatsapp:cliente?.whatsapp??"",data_nascimento:cliente?.data_nascimento??"",observacoes:cliente?.observacoes??""});},[aberto,cliente,form]);

  function escolherFoto(file?:File){
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast.error("Use uma foto JPG, PNG ou WebP.");return;}
    if(file.size>5*1024*1024){toast.error("A foto deve ter no máximo 5 MB.");return;}
    setArquivoFoto(file);
  }

  async function enviar(v:Valores){
    try{
      const salvo=await salvar.mutateAsync({...(cliente?{id:cliente.id}:{}),dados:{nome:v.nome.trim(),telefone:v.telefone?.trim()||null,whatsapp:v.whatsapp?.trim()||null,data_nascimento:v.data_nascimento||null,observacoes:v.observacoes?.trim()||null}});
      let final=salvo as Cliente;
      if(arquivoFoto){
        try{const path=await uploadFoto.mutateAsync({clienteId:salvo.id,file:arquivoFoto,fotoAnterior:cliente?.foto_path});final={...salvo,foto_path:path} as Cliente;}
        catch(e){toast.warning(e instanceof Error?`Cliente salva, mas a foto não foi enviada: ${e.message}`:"Cliente salva, mas a foto não foi enviada.");}
      }
      toast.success(cliente?"Cliente atualizada.":"Cliente cadastrada.");onSalvo?.(final);setArquivoFoto(null);if(!cliente)onOpenChange(false);
    }catch{toast.error("Não foi possível salvar a cliente.");}
  }
  async function adicionarPreferencia(){if(!cliente||!valor.trim())return;try{await salvarPref.mutateAsync({clienteId:cliente.id,categoria,valor:valor.trim()});setValor("");toast.success("Preferência registrada.");}catch{toast.error("Não foi possível registrar a preferência.");}}
  const contato=cliente?.whatsapp||cliente?.telefone;
  const foto=previewFoto||fotoAtual;

  return <Sheet open={aberto} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-xl md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"><SheetHeader className="px-5 pt-5 text-left"><SheetTitle>{cliente?cliente.nome:"Nova cliente"}</SheetTitle><SheetDescription>{cliente?"Cadastro, foto, histórico e preferências.":"Só o nome é obrigatório."}</SheetDescription></SheetHeader>
    <Tabs defaultValue="cadastro" className="px-5 pb-8 pt-2"><TabsList className={`grid w-full ${cliente?"grid-cols-4":"grid-cols-1"}`}><TabsTrigger value="cadastro">Cadastro</TabsTrigger>{cliente&&<><TabsTrigger value="historico">Histórico</TabsTrigger><TabsTrigger value="preferencias">Preferências</TabsTrigger><TabsTrigger value="pacotes">Pacotes</TabsTrigger></>}</TabsList>
      <TabsContent value="cadastro" className="mt-4"><Form {...form}><form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-border p-3">
          {foto?<img src={foto} alt="Prévia da cliente" className="size-16 rounded-full object-cover"/>:<span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">{cliente?iniciais(cliente.nome):<Camera className="size-6"/>}</span>}
          <div className="min-w-0 flex-1"><p className="text-sm font-medium">Foto da cliente</p><p className="text-xs text-muted-foreground">JPG, PNG ou WebP · até 5 MB</p><label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary"><Camera className="size-4"/>{foto?"Trocar foto":"Adicionar foto"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>escolherFoto(e.target.files?.[0])}/></label></div>
        </div>
        <FormField control={form.control} name="nome" render={({field})=><FormItem><FormLabel>Nome</FormLabel><FormControl><Input className="h-12 rounded-xl" autoFocus={!cliente} {...field}/></FormControl><FormMessage/></FormItem>}/>
        <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="telefone" render={({field})=><FormItem><FormLabel>Telefone</FormLabel><FormControl><Input className="h-12 rounded-xl" inputMode="tel" {...field}/></FormControl><FormMessage/></FormItem>}/><FormField control={form.control} name="whatsapp" render={({field})=><FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input className="h-12 rounded-xl" inputMode="tel" {...field}/></FormControl><FormMessage/></FormItem>}/></div>
        <FormField control={form.control} name="data_nascimento" render={({field})=><FormItem><FormLabel>Nascimento</FormLabel><FormControl><Input type="date" className="h-12 rounded-xl" {...field}/></FormControl><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="observacoes" render={({field})=><FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea className="min-h-20 rounded-xl" placeholder="Preferências, alergias, informações importantes..." {...field}/></FormControl><FormMessage/></FormItem>}/>
        <div className="grid gap-2 sm:grid-cols-2"><Button type="submit" className="h-12 rounded-xl" disabled={form.formState.isSubmitting||uploadFoto.isPending}>{form.formState.isSubmitting||uploadFoto.isPending?"Salvando...":"Salvar cliente"}</Button>{cliente&&contato&&<Button asChild type="button" variant="outline" className="h-12 rounded-xl"><a href={whatsappUrl(contato,`Olá, ${cliente.nome}! Tudo bem?`)} target="_blank" rel="noreferrer"><MessageCircle className="size-4"/> Chamar no WhatsApp</a></Button>}</div>
      </form></Form></TabsContent>
      {cliente&&<><TabsContent value="historico" className="mt-4 space-y-2">{!detalhes?.historico?.length?<p className="py-10 text-center text-sm text-muted-foreground">Ainda não há atendimentos para esta cliente.</p>:detalhes.historico.map((h:any)=><div key={h.id} className="rounded-xl border px-3 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{h.servicos?.nome??"Serviço"}</p><p className="text-xs text-muted-foreground">{new Date(`${h.data}T12:00:00`).toLocaleDateString("pt-BR")} · {String(h.status).replace("_"," ")}</p></div><span className="text-sm font-medium">{formatarMoeda(Number(h.servicos?.preco??0))}</span></div>{h.observacoes&&<p className="mt-2 text-sm text-muted-foreground">{h.observacoes}</p>}</div>)}</TabsContent>
      <TabsContent value="preferencias" className="mt-4 space-y-4"><div className="grid grid-cols-[140px_1fr_auto] gap-2"><Select value={categoria} onValueChange={setCategoria}><SelectTrigger className="h-11 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Cor">Cor</SelectItem><SelectItem value="Tonalidade">Tonalidade</SelectItem><SelectItem value="Fórmula">Fórmula</SelectItem><SelectItem value="Produto">Produto</SelectItem><SelectItem value="Preferência">Preferência</SelectItem><SelectItem value="Observação técnica">Obs. técnica</SelectItem></SelectContent></Select><Input className="h-11 rounded-xl" value={valor} onChange={e=>setValor(e.target.value)} placeholder="Ex.: 7.1 + OX 20"/><Button size="icon" className="size-11 rounded-xl" onClick={()=>void adicionarPreferencia()}><Plus className="size-4"/></Button></div>{!detalhes?.preferencias?.length?<p className="py-8 text-center text-sm text-muted-foreground">Nenhuma preferência técnica registrada.</p>:detalhes.preferencias.map((p:any)=><div key={p.id} className="flex items-start gap-3 rounded-xl border px-3 py-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.categoria}</p><p className="text-sm">{p.valor}</p></div><Button variant="ghost" size="icon" className="size-8 rounded-lg text-destructive" onClick={()=>void excluirPref.mutateAsync(p.id)}><Trash2 className="size-3.5"/></Button></div>)}</TabsContent>
      <TabsContent value="pacotes" className="mt-4 space-y-2">{pacotes.length===0?<p className="py-10 text-center text-sm text-muted-foreground">Esta cliente ainda não possui pacotes.</p>:pacotes.map((cp:any)=>{const limites=(cp.pacotes?.pacote_itens??[]) as any[];const usos=(cp.cliente_pacote_usos??[]) as any[];return <div key={cp.id} className="rounded-xl border px-3 py-3"><div className="flex justify-between gap-3"><p className="font-medium">{cp.pacotes?.nome}</p><span className="text-xs capitalize text-muted-foreground">{cp.status}</span></div><p className="mt-1 text-xs text-muted-foreground">Válido até {new Date(`${cp.data_validade}T12:00:00`).toLocaleDateString("pt-BR")}</p><div className="mt-2 space-y-1">{limites.map(i=>{const usado=usos.filter(u=>u.servico_id===i.servico_id).reduce((s,u)=>s+Number(u.quantidade),0);return <p key={i.servico_id} className="text-sm">{i.servicos?.nome}: <strong>{Math.max(0,Number(i.quantidade)-usado)}</strong> de {i.quantidade} disponíveis</p>})}</div></div>})}</TabsContent></>}
    </Tabs>
  </SheetContent></Sheet>;
}
