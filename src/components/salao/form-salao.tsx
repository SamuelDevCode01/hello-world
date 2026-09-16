import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SeletorCor } from "@/components/ui/seletor-cor";
import { Textarea } from "@/components/ui/textarea";

export const esquemaSalao = z.object({
  nome: z.string().min(2, "Informe o nome do salão"),
  nome_responsavel: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  logo_url: z.string().url("Informe um endereço válido").optional().or(z.literal("")),
  cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Escolha uma cor válida"),
  horario_abertura: z.string().regex(/^\d{2}:\d{2}$/, "Use o formato HH:mm"),
  horario_fechamento: z.string().regex(/^\d{2}:\d{2}$/, "Use o formato HH:mm"),
  intervalo_agenda_minutos: z.coerce.number().int().min(5).max(240),
});

export type ValoresSalao = z.infer<typeof esquemaSalao>;

export const VALORES_PADRAO_SALAO: ValoresSalao = {
  nome: "",
  nome_responsavel: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  logo_url: "",
  cor_primaria: "#C1622D",
  horario_abertura: "09:00",
  horario_fechamento: "19:00",
  intervalo_agenda_minutos: 30,
};

type Props = {
  valoresIniciais?: Partial<ValoresSalao>;
  onSubmit: (valores: ValoresSalao) => Promise<void> | void;
  textoBotao: string;
  compacto?: boolean;
};

export function FormSalao({ valoresIniciais, onSubmit, textoBotao, compacto }: Props) {
  const form = useForm<ValoresSalao>({
    resolver: zodResolver(esquemaSalao),
    defaultValues: { ...VALORES_PADRAO_SALAO, ...valoresIniciais },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField control={form.control} name="nome" render={({ field }) => (
          <FormItem><FormLabel>Nome do salão</FormLabel><FormControl><Input className="h-12 rounded-xl" placeholder="Ex.: Studio Bella" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="nome_responsavel" render={({ field }) => (
          <FormItem><FormLabel>Responsável</FormLabel><FormControl><Input className="h-12 rounded-xl" placeholder="Quem cuida do salão" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="horario_abertura" render={({ field }) => <FormItem><FormLabel>Abre às</FormLabel><FormControl><Input type="time" className="h-12 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="horario_fechamento" render={({ field }) => <FormItem><FormLabel>Fecha às</FormLabel><FormControl><Input type="time" className="h-12 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>} />
        </div>

        <FormField control={form.control} name="intervalo_agenda_minutos" render={({ field }) => (
          <FormItem><FormLabel>Intervalo da agenda (minutos)</FormLabel><FormControl><Input type="number" min={5} max={240} step={5} className="h-12 rounded-xl" {...field} /></FormControl><FormDescription>De quanto em quanto tempo os horários aparecem.</FormDescription><FormMessage /></FormItem>
        )} />

        {!compacto && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="telefone" render={({ field }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input className="h-12 rounded-xl" inputMode="tel" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="whatsapp" render={({ field }) => <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input className="h-12 rounded-xl" inputMode="tel" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
          </div>

          <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" className="h-12 rounded-xl" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />

          <FormField control={form.control} name="endereco" render={({ field }) => <FormItem><FormLabel>Endereço</FormLabel><FormControl><Textarea className="min-h-20 rounded-xl" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />

          <FormField control={form.control} name="logo_url" render={({ field }) => <FormItem><FormLabel>Logo (endereço da imagem)</FormLabel><FormControl><Input className="h-12 rounded-xl" placeholder="https://..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />

          <FormField control={form.control} name="cor_primaria" render={({ field }) => (
            <FormItem>
              <FormLabel>Cor principal</FormLabel>
              <FormDescription>Escolha uma cor para botões, destaques e identidade do salão.</FormDescription>
              <FormControl><SeletorCor value={field.value} onChange={field.onChange} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>}

        <Button type="submit" className="h-12 w-full rounded-xl" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Salvando..." : textoBotao}</Button>
      </form>
    </Form>
  );
}
