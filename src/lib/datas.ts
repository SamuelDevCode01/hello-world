import {
  addDays,
  addMinutes,
  format,
  isSameDay,
  parse,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/** Data no formato do banco: yyyy-MM-dd */
export type DataISO = string;
/** Hora no formato do banco: HH:mm:ss */
export type HoraISO = string;

export const hoje = (): Date => new Date();

export const paraDataISO = (d: Date): DataISO => format(d, "yyyy-MM-dd");

export const deDataISO = (s: DataISO): Date => parse(s, "yyyy-MM-dd", new Date());

/** Normaliza "09:00" ou "09:00:00" para "09:00" */
export const horaCurta = (h: string): string => h.slice(0, 5);

/** Normaliza para o formato aceito pelo Postgres (HH:mm:ss) */
export const paraHoraISO = (h: string): HoraISO =>
  h.length === 5 ? `${h}:00` : h;

export const formatarData = (d: Date): string => format(d, "dd/MM/yyyy");

export const formatarDataLonga = (d: Date): string =>
  format(d, "EEEE, d 'de' MMMM", { locale: ptBR });

export const formatarDataCurta = (d: Date): string =>
  format(d, "EEE, dd/MM", { locale: ptBR });

export const formatarDiaSemana = (d: Date): string =>
  format(d, "EEEEEE", { locale: ptBR });

export const ehHoje = (d: Date): boolean => isSameDay(d, new Date());

export const semanaDe = (d: Date): Date[] => {
  const inicio = startOfWeek(d, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
};

export const minutosDeHora = (h: string): number => {
  const [hh, mm] = horaCurta(h).split(":").map(Number);
  return (hh ?? 0) * 60 + (mm ?? 0);
};

export const horaDeMinutos = (min: number): string => {
  const total = ((min % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const somarMinutos = (hora: string, minutos: number): string =>
  horaDeMinutos(minutosDeHora(hora) + minutos);

/** Gera os slots da agenda a partir da configuração do salão. */
export const gerarSlots = (
  abertura: string,
  fechamento: string,
  intervalo: number,
): string[] => {
  const inicio = minutosDeHora(abertura);
  const fim = minutosDeHora(fechamento);
  const passo = Math.max(5, intervalo || 30);
  const slots: string[] = [];
  for (let m = inicio; m < fim; m += passo) slots.push(horaDeMinutos(m));
  return slots;
};

export const duracaoEntre = (inicio: string, fim: string): number =>
  minutosDeHora(fim) - minutosDeHora(inicio);

export const formatarDuracao = (minutos: number): string => {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
};

export { addDays, addMinutes };
