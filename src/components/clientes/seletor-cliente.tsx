import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { useState } from "react";

import { SheetCliente } from "@/components/clientes/sheet-cliente";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientes } from "@/hooks/use-clientes";
import { formatarTelefone } from "@/lib/formato";
import { cn } from "@/lib/utils";

type Props = {
  valor: string | null;
  onChange: (id: string) => void;
};

export function SeletorCliente({ valor, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const { data: clientes = [], isLoading } = useClientes(busca);

  const selecionada = clientes.find((c) => c.id === valor);
  const { data: todas = [] } = useClientes("");
  const nomeSelecionado = (selecionada ?? todas.find((c) => c.id === valor))?.nome;

  return (
    <>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-12 w-full justify-between rounded-xl font-normal"
          >
            <span className={cn(!nomeSelecionado && "text-muted-foreground")}>
              {nomeSelecionado ?? "Buscar cliente por nome ou telefone"}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] rounded-xl p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Nome ou telefone..."
              value={busca}
              onValueChange={setBusca}
            />
            <CommandList>
              {!isLoading && clientes.length === 0 && (
                <CommandEmpty>Nenhuma cliente encontrada.</CommandEmpty>
              )}
              <CommandGroup>
                {clientes.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onChange(c.id);
                      setAberto(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", valor === c.id ? "opacity-100" : "opacity-0")}
                    />
                    <span className="flex-1 truncate">{c.nome}</span>
                    {c.telefone && (
                      <span className="text-xs text-muted-foreground">
                        {formatarTelefone(c.telefone)}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  value="__nova__"
                  onSelect={() => {
                    setAberto(false);
                    setNovoAberto(true);
                  }}
                >
                  <UserPlus className="size-4 text-primary" />
                  <span className="text-primary">Nova cliente</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <SheetCliente
        aberto={novoAberto}
        onOpenChange={setNovoAberto}
        onSalvo={(c) => onChange(c.id)}
      />
    </>
  );
}
