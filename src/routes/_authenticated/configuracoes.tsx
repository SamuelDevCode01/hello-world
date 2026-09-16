import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Boxes, Gift, LogOut, Package, Save, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormSalao, type ValoresSalao } from "@/components/salao/form-salao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSalao, useSalaoAtual } from "@/contexts/salao";
import { useSalvarTemplate, useTemplates, type TemplateMensagem } from "@/hooks/use-operacao";
import { supabase } from "@/integrations/supabase/client";
import { horaCurta, paraHoraISO } from "@/lib/datas";

export const Route = createFileRoute("/_authenticated/configuracoes")({ component: PaginaConfiguracoes, head: () => ({ meta: [{ title: "Configurações do salão | Agenda do Salão" }] }) });

const GESTAO = [
  {to:"/produtos" as const,label:"Produtos",Icone:Package},{to:"/estoque" as const,label:"Estoque",Icone:Boxes},{to:"/pacotes" as const,label:"Pacotes",Icone:Gift},{to:"/financeiro" as const,label:"Financeiro",Icone:WalletCards},
];

function PaginaConfiguracoes(){
  const salao=useSalaoAtual(); const {recarregar}=useSalao(); const navigate=useNavigate(); const qc=useQueryClient(); const {data:templates=[]}=useTemplates();
  const [email,setEmail]=useState(""); const [senha,setSenha]=useState("");
  useEffect(()=>{void supabase.auth.getUser().then(({data})=>setEmail(data.user?.email??""));},[]);
  async function salvar(v:ValoresSalao){const {error}=await supabase.from("saloes").update({nome:v.nome.trim(),nome_responsavel:v.nome_responsavel?.trim()||null,telefone:v.telefone?.trim()||null,whatsapp:v.whatsapp?.trim()||null,email:v.email?.trim()||null,endereco:v.endereco?.trim()||null,logo_url:v.logo_url?.trim()||null,cor_primaria:v.cor_primaria,horario_abertura:paraHoraISO(v.horario_abertura),horario_fechamento:paraHoraISO(v.horario_fechamento),intervalo_agenda_minutos:v.intervalo_agenda_minutos}).eq("id",salao.id);if(error){toast.error("Não foi possível salvar as configurações.");return;}toast.success("Configurações salvas.");recarregar();}
  async function atualizarConta(){const dados:{email?:string;password?:string}={};if(email.trim())dados.email=email.trim();if(senha.trim())dados.password=senha;if(senha&&senha.length<6){toast.error("A nova senha precisa ter ao menos 6 caracteres.");return;}const {error}=await supabase.auth.updateUser(dados);if(error){toast.error(error.message);return;}setSenha("");toast.success("Conta atualizada. Se o e-mail mudou, confira a confirmação enviada pelo Supabase.");}
  async function sair(){await qc.cancelQueries();qc.clear();await supabase.auth.signOut();await navigate({to:"/auth",replace:true});}
  return <div className="space-y-8"><header><h1 className="font-display text-2xl">Configurações</h1><p className="text-sm text-muted-foreground">Identidade, agenda, mensagens e conta.</p></header>
    <section className="space-y-3 md:hidden"><h2 className="text-sm font-medium">Gestão do salão</h2><div className="grid grid-cols-2 gap-2">{GESTAO.map(({to,label,Icone})=><Link key={to} to={to} className="card-elegante flex items-center gap-3 px-3 py-3 text-sm font-medium"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icone className="size-4"/></span>{label}</Link>)}</div></section>
    <section className="space-y-3"><div><h2 className="text-base font-semibold">Salão e agenda</h2><p className="text-xs text-muted-foreground">Dados, horários e aparência.</p></div><div className="card-elegante p-5"><FormSalao textoBotao="Salvar alterações" onSubmit={salvar} valoresIniciais={{nome:salao.nome,nome_responsavel:salao.nome_responsavel??"",telefone:salao.telefone??"",whatsapp:salao.whatsapp??"",email:salao.email??"",endereco:salao.endereco??"",logo_url:salao.logo_url??"",cor_primaria:salao.cor_primaria??"#C1622D",horario_abertura:horaCurta(salao.horario_abertura),horario_fechamento:horaCurta(salao.horario_fechamento),intervalo_agenda_minutos:salao.intervalo_agenda_minutos}}/></div></section>
    <section className="space-y-3"><div><h2 className="text-base font-semibold">Mensagens</h2><p className="text-xs text-muted-foreground">Modelos usados nos botões manuais de WhatsApp. Variáveis: {"{nome}"}, {"{servico}"}, {"{data}"}, {"{hora}"}.</p></div><div className="space-y-2">{templates.map(t=><TemplateEditor key={t.id} template={t}/>)}</div></section>
    <section className="space-y-3"><div><h2 className="text-base font-semibold">Conta</h2><p className="text-xs text-muted-foreground">Login do usuário proprietário deste salão.</p></div><div className="card-elegante space-y-4 p-5"><div className="space-y-2"><Label>E-mail de acesso</Label><Input type="email" className="h-12 rounded-xl" value={email} onChange={e=>setEmail(e.target.value)}/></div><div className="space-y-2"><Label>Nova senha</Label><Input type="password" autoComplete="new-password" className="h-12 rounded-xl" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Deixe vazio para não alterar"/></div><Button variant="outline" className="h-11 rounded-xl" onClick={()=>void atualizarConta()}><Save className="size-4"/> Atualizar acesso</Button></div></section>
    <Button variant="outline" className="h-12 w-full rounded-xl" onClick={()=>void sair()}><LogOut className="size-4"/> Sair da conta</Button>
  </div>;
}

function TemplateEditor({template}:{template:TemplateMensagem}){const salvar=useSalvarTemplate();const [mensagem,setMensagem]=useState(template.mensagem);const [ativo,setAtivo]=useState(template.ativo);useEffect(()=>{setMensagem(template.mensagem);setAtivo(template.ativo)},[template]);async function enviar(){try{await salvar.mutateAsync({id:template.id,mensagem:mensagem.trim(),ativo});toast.success("Modelo de mensagem salvo.");}catch{toast.error("Não foi possível salvar o modelo.");}}return <div className="card-elegante space-y-3 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{template.nome}</p><p className="text-xs capitalize text-muted-foreground">{template.tipo.replace("_"," ")}</p></div><Switch checked={ativo} onCheckedChange={setAtivo}/></div><Textarea className="min-h-24 rounded-xl" value={mensagem} onChange={e=>setMensagem(e.target.value)}/><Button size="sm" variant="outline" className="rounded-xl" onClick={()=>void enviar()} disabled={salvar.isPending}><Save className="size-3.5"/> Salvar modelo</Button></div>}
