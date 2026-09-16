import { Check, Pipette } from "lucide-react";

import { cn } from "@/lib/utils";

const CORES = [
  "#C1622D",
  "#B45309",
  "#D97706",
  "#CA8A04",
  "#65A30D",
  "#16A34A",
  "#0D9488",
  "#0891B2",
  "#0284C7",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#A855F7",
  "#C026D3",
  "#DB2777",
  "#E11D48",
  "#DC2626",
  "#7C2D12",
  "#57534E",
  "#292524",
];

type Props = {
  value: string;
  onChange: (cor: string) => void;
  className?: string;
};

export function SeletorCor({ value, onChange, className }: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
        {CORES.map((cor) => {
          const selecionada = cor.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={cor}
              type="button"
              onClick={() => onChange(cor)}
              className={cn(
                "relative aspect-square min-h-9 rounded-xl border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selecionada ? "border-foreground shadow-sm" : "border-transparent",
              )}
              style={{ backgroundColor: cor }}
              aria-label={`Escolher cor ${cor}`}
              aria-pressed={selecionada}
            >
              {selecionada && (
                <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
        <Pipette className="size-4" />
        Escolher outra cor
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#C1622D"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label="Abrir seletor de cor personalizado"
        />
      </label>
    </div>
  );
}
