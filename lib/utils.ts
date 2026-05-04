import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency === "RON" ? "RON" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string, formatStr = "d MMM yyyy"): string {
  try {
    return format(parseISO(dateStr), formatStr, { locale: ro });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  return formatDate(dateStr, "d MMM");
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  extras_bancar: "Extras de cont",
  factura_emisa: "Factură emisă",
  factura_primita: "Factură primită",
  bon: "Bon / Chitanță",
  fisa_clinica: "Fișă clinică",
  programator: "Programator (raport zilnic)",
  balanta: "Balanță contabilă",
  bilant: "Bilanț contabil",
  alt: "Alt document",
};

export const CATEGORY_LABELS: Record<string, string> = {
  procedura: "Procedură medicală",
  consultatie: "Consultație",
  chirie: "Chirie",
  salarii: "Salarii",
  consumabile: "Consumabile",
  clinica: "Plată clinică colaboratoare",
  taxe: "Taxe și impozite",
  marketing: "Marketing",
  utilitati: "Utilități",
  echipamente: "Echipamente",
  alt: "Altele",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card / POS",
  transfer: "Transfer bancar",
  other: "Alt mod",
};

export const START_DATE = "2026-05-04";
