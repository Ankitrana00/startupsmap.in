import { SupportedLocale } from "./config";

export function formatDate(date: Date | string, locale: SupportedLocale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatNumber(num: number, locale: SupportedLocale = "en"): string {
  return num.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}

export function formatCurrency(amount: number, locale: SupportedLocale = "en"): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: locale === "zh" ? "CNY" : "USD",
  }).format(amount);
}
