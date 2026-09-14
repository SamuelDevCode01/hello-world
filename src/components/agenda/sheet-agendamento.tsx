import { AlertTriangle, Check, Play, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SeletorCliente } from "@/components/clientes/seletor-cliente";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  temConflito,
  useAlterarStatus,
  useExcluirAgendamento,
  useSalvarAgendamento,
  type Agendamento,
} from "@/hooks/use-agendamentos";
import { useServicos } from "@/hooks/use-servicos";
import { formatarDuracao, horaCurta, somarMinutos } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { STATUS_CLASSE, STATUS_LABEL, type StatusAgendamento } from "@/lib/status";
import { cn } from "@/lib/utils";

type Props = {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  agendamento: Agendamento | null;
  dataInicial: string;
  horaInicial: string;
  agendamentosDoDia: Agendamento[];
};

export function SheetAgendamento({
  aberto,
  onOpenChange,
  agendamento,
  dataInicial,
  horaInicial,
  agendamentosDoDia,
}: Props) {
  const editando = Boolean(agendamento);
  const { data: servicos = [] } = useServicos(true);
  const salvar = useSalvarAgendamento();
  const alterarStatus = useAlterarStatus();
  const excluir = useExcluirAgendamento();

  const [clienteId, setClienteId] = useState<string | null>(null);
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [data, setData] = useState(dataInicial);
  const [inicio, setInicio] = useState(horaInicial);
  const [fim, setFim] = useState("");
  const [fimManual, setFimManual] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!aberto) return;
    if (agendamento) {
      setClienteId(agendamento.cliente_id);
      setServicoId(agendamento.servico_id);
      setData(agendamento.data);
      setInicio(horaCurta(agendamento.hora_inicio));
      setFim(horaCurta(agendamento.hora_fim));
      setFimManual(true);
      setObservacoes(agendamento.observacoes ?? "");
    } else {
      setClienteId(null);
      setServicoId(null);
      setData(dataInicial);
      setInicio(horaInicial);
      setFim("");
      setFimManual(false);
      setObservacoes("");
    }
  }, [aberto, agendamento, dataInicial, horaInicial]);

  const servico = servicos.find((s) => s.id === servicoId) ?? null;

  useEffect(() => {
    if (fimManual || !servico || !inicio) return;
    setFim(somarMinutos(inicio, servico.duracao_minutos));
  }, [servico, inicio, fimManual]);

  const conflito = useMemo(() => {
    if (!data || !inicio || !fim) return false;
    return temConflito(agendamentosDoDia, {
      data,
      hora_inicio: inicio,
      hora_fim: fim,
      ...(agendamento ? { id: agendamento.id } : {}),
    });
  }, [agendamentosDoDia, data, inicio, fim, agendamento]);

  async function onSalvar() {
    if (!clienteId) {
      toast.error("Escolha a cliente.");
      return;
    }
    if (!servicoId) {
      toast.error("Escolha o serviço.");
      return;
    }
    if (!fim) {
      toast.error("Informe o horário final.");
      return;
    }
    try {
      await salvar.mutateAsync({
        ...(agendamento ? { id: agendamento.id } : {}),
        dados: {
          cliente_id: clienteId,
          servico_id: servicoId,
          data,
          hora_inicio: inicio,
          hora_fim: fim,
          observacoes: observacoes.trim() || null,
        },
      });
      toast.success(editando ? "Agendamento atualizado." : "Agendamento criado.");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  async function mudarStatus(status: StatusAgendamento) {
    if (!agendamento) return;
    try {
      await alterarStatus.mutateAsync({ id: agendamento.id, status });
      toast.success(`Agendamento marcado como ${STATUS_LABEL[status].toLowerCase()}.`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar.");
    }
  }

  async function onExcluir() {
    if (!agendamento) return;
    try {
      await excluir.mutateAsync(agendamento.id);
      toast.success("Agendamento excluído.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível excluir.");
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-lg md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:rounded-none"
      >
        <SheetHeader className="px-5 pt-5 text-left">
          <SheetTitle>{editando ? "Detalhes do agendamento" : "Novo agendamento"}</SheetTitle>
          <SheetDescription>
            {editando
              ? "Atualize os dados ou avance o atendimento."
              : "Escolha a cliente, o serviço e o horário."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-8 pt-2">
          {editando && agendamento && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  STATUS_CLASSE[agendamento.status],
                )}
              >
                {STATUS_LABEL[agendamento.status]}
              </span>
              {agendamento.servicos && (
                <span className="text-xs text-muted-foreground">
                  {formatarMoeda(agendamento.servicos.preco)}
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Cliente</Label>
            <SeletorCliente valor={clienteId} onChange={setClienteId} />
          </div>

          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select
              value={servicoId ?? ""}
              onValueChange={(v) => {
                setServicoId(v);
                setFimManual(false);
              }}
            >
              <SelectTrigger className="h-12 w-full rounded-xl">
                <SelectValue placeholder="Escolha o serviço" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {servicos.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    Cadastre um serviço primeiro.
                  </div>
                )}
                {servicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: s.cor }}
                        aria-hidden
                      />
                      {s.nome} · {formatarDuracao(s.duracao_minutos)} · {formatarMoeda(s.preco)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inicio">Início</Label>
              <Input
                id="inicio"
                type="time"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  setFimManual(false);
                }}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fim">Término</Label>
              <Input
                id="fim"
                type="time"
                value={fim}
                onChange={(e) => {
                  setFim(e.target.value);
                  setFimManual(true);
                }}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          {conflito && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="text-foreground">
                Já existe um atendimento nesse horário. Ajuste o horário antes de salvar.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Preferências, alergias, detalhes do atendimento..."
              className="min-h-20 rounded-xl"
            />
          </div>

          <Button
            className="h-12 w-full rounded-xl"
            onClick={onSalvar}
            disabled={salvar.isPending || conflito}
          >
            {salvar.isPending ? "Salvando..." : editando ? "Salvar alterações" : "Criar agendamento"}
          </Button>

          {editando && agendamento && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ações
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => mudarStatus("confirmado")}
                  disabled={agendamento.status === "confirmado"}
                >
                  <Check className="size-4" /> Confirmar
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => mudarStatus("em_atendimento")}
                  disabled={agendamento.status === "em_atendimento"}
                >
                  <Play className="size-4" /> Iniciar
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => mudarStatus("concluido")}
                  disabled={agendamento.status === "concluido"}
                >
                  <Check className="size-4" /> Concluir
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => mudarStatus("nao_compareceu")}
                  disabled={agendamento.status === "nao_compareceu"}
                >
                  <X className="size-4" /> Não veio
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="h-11 rounded-xl text-destructive">
                      Cancelar agendamento
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O horário volta a ficar livre na agenda.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl"
                        onClick={() => void mudarStatus("cancelado")}
                      >
                        Cancelar agendamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="h-11 rounded-xl text-muted-foreground">
                      <Trash2 className="size-4" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                      <AlertDialogAction className="rounded-xl" onClick={() => void onExcluir()}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
